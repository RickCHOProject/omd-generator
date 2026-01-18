'use client';
import { useState } from 'react';

const SUPABASE_URL = 'https://wqvfsynpxfwacesvjlmd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L0SuigrNUZpsWC66KSVCOA_EuypYe5i';

// House Icon Component
const HouseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

export default function OMDGenerator() {
  const [rawInput, setRawInput] = useState('');
  const [formData, setFormData] = useState({
    address: '', city: '', state: '', zip: '',
    askingPrice: '', arv: '', beds: '', baths: '',
    sqft: '', yearBuilt: '', occupancy: '', access: '',
    coe: '', emd: '', hoa: '', conditionNotes: '', phone: '480-266-3864'
  });
  const [photos, setPhotos] = useState([]);
  const [previewMode, setPreviewMode] = useState(null);
  const [dealUrl, setDealUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [buyerTeaser, setBuyerTeaser] = useState('');
  const [generatingTeaser, setGeneratingTeaser] = useState(false);

  const parseInput = () => {
    const lines = rawInput.split('\n');
    const data = { ...formData };
    
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('address:')) {
        const full = line.split(':').slice(1).join(':').trim();
        const parts = full.split(',').map(p => p.trim());
        data.address = parts[0] || '';
        data.city = parts[1] || '';
        const stateZip = (parts[2] || '').split(' ').filter(Boolean);
        data.state = stateZip[0] || '';
        data.zip = stateZip[1] || '';
      }
      else if (lower.includes('asking price:') || lower.includes('asking:')) {
        data.askingPrice = line.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '';
      }
      else if (lower.includes('arv:') || lower.includes('estimated arv:')) {
        data.arv = line.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '';
      }
      else if (lower.includes('beds/baths:') || lower.includes('bed/bath:')) {
        const match = line.match(/(\d+)\s*\/\s*(\d+)/);
        if (match) { data.beds = match[1]; data.baths = match[2]; }
      }
      else if (lower.includes('sq ft:') || lower.includes('sqft:') || lower.includes('living area')) {
        data.sqft = line.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '';
      }
      else if (lower.includes('year built:')) {
        data.yearBuilt = line.match(/\d{4}/)?.[0] || '';
      }
      else if (lower.includes('occupancy')) {
        data.occupancy = line.split(':').slice(1).join(':').trim();
      }
      else if (lower.includes('coe:') || lower.includes('close of escrow')) {
        data.coe = line.split(':').slice(1).join(':').trim();
      }
      else if (lower.includes('emd:')) {
        data.emd = line.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '';
      }
      else if (lower.includes('hoa:')) {
        data.hoa = line.split(':').slice(1).join(':').trim();
      }
      else if (lower.includes('notes:') || lower.includes('condition:')) {
        data.conditionNotes = line.split(':').slice(1).join(':').trim();
      }
    });
    
    setFormData(data);
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      label: 'Other'
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  const labelPhoto = (index, label) => {
    const updated = [...photos];
    updated[index].label = label;
    setPhotos(updated);
  };

  const removePhoto = (index) => {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
  };

  const generateBuyerTeaser = async () => {
    setGeneratingTeaser(true);
    try {
      const response = await fetch('/api/label-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'teaser',
          city: formData.city,
          state: formData.state,
          beds: formData.beds,
          baths: formData.baths
        })
      });
      const data = await response.json();
      setBuyerTeaser(data.teaser || `Off-market in ${formData.city}, ${formData.state} - ${formData.beds}/${formData.baths}. Still buying?`);
    } catch (error) {
      const teasers = [
        `Hey! Off-market in ${formData.city}, ${formData.state} - ${formData.beds}/${formData.baths}. Still buying?`,
        `New deal just hit - ${formData.city}, ${formData.state}. ${formData.beds} bed. You active?`,
        `Off-market in ${formData.city} - ${formData.beds}/${formData.baths}. Interested?`,
        `Got one in ${formData.city}, ${formData.state} - ${formData.beds}/${formData.baths}. Still looking?`
      ];
      setBuyerTeaser(teasers[Math.floor(Math.random() * teasers.length)]);
    }
    setGeneratingTeaser(false);
  };

  const uploadPhotosToSupabase = async (slug) => {
    const uploadedUrls = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (!photo.file) continue;
      
      const fileName = `${slug}/${i}-${photo.label.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/deal-photos/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': photo.file.type
        },
        body: photo.file
      });
      
      if (response.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/deal-photos/${fileName}`;
        uploadedUrls.push({ url: publicUrl, label: photo.label });
      }
    }
    
    return uploadedUrls;
  };

  const publishDeal = async () => {
    setPublishing(true);
    try {
      // Generate slug from address
      const slug = formData.address
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30) + '-' + Math.random().toString(36).substring(2, 6);
      
      // Upload photos first
      const uploadedPhotos = await uploadPhotosToSupabase(slug);
      
      // Prepare deal data
      const dealData = {
        ...formData,
        photos: uploadedPhotos
      };
      
      // Save to Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/deals`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          slug: slug,
          data: dealData
        })
      });
      
      if (response.ok) {
        const url = `https://deals.offmarketdaily.com/d/${slug}`;
        setDealUrl(url);
      } else {
        const err = await response.text();
        console.error('Failed to save deal:', err);
        alert('Failed to publish deal. Check console.');
      }
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Error publishing deal');
    }
    setPublishing(false);
  };

  const formatPrice = (num) => {
    if (!num) return '';
    return Number(num).toLocaleString();
  };

  const spread = formData.arv && formData.askingPrice 
    ? Number(formData.arv) - Number(formData.askingPrice) 
    : 0;

  const generateTextBlast = () => {
    return `New Deal - ${formData.city}, ${formData.state}

Address: ${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}
Asking Price: $${formatPrice(formData.askingPrice)}
Estimated ARV: $${formatPrice(formData.arv)}
Beds/Baths: ${formData.beds}/${formData.baths}
Living Area Size: ${formatPrice(formData.sqft)} (Sq. Ft)
Year Built: ${formData.yearBuilt}
Occupancy Status at Closing: ${formData.occupancy || 'TBD'}
Access: ${formData.access || 'Easy Access'}
COE: ${formData.coe}
EMD: $${formatPrice(formData.emd)}
${dealUrl ? `Link: ${dealUrl}` : ''}

${spread > 80000 ? `Over $${formatPrice(spread)} spread potential here.` : `$${formatPrice(spread)} spread on this one.`}

Notes:
${formData.conditionNotes}

Reply if interested`;
  };

  const generateEmailHTML = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:white;padding:30px;text-align:center;">
      <h1 style="margin:0;font-size:28px;">New Deal - ${formData.city}, ${formData.state}</h1>
      <p style="margin:10px 0 0;opacity:0.9;font-size:16px;">${formData.address}</p>
    </div>
    
    <div style="background:linear-gradient(135deg,#00b894 0%,#00cec9 100%);padding:25px;text-align:center;">
      <div style="font-size:14px;opacity:0.9;color:white;">ASKING PRICE</div>
      <div style="font-size:42px;font-weight:bold;color:white;">$${formatPrice(formData.askingPrice)}</div>
      <div style="margin-top:15px;display:inline-block;background:rgba(255,255,255,0.2);padding:8px 20px;border-radius:20px;">
        <span style="color:white;font-size:14px;">ARV: $${formatPrice(formData.arv)} | Spread: $${formatPrice(spread)}</span>
      </div>
    </div>
    
    <div style="padding:30px;">
      <h2 style="color:#1a1a2e;border-bottom:2px solid #00b894;padding-bottom:10px;">Property Details</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#666;">Beds/Baths</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${formData.beds}/${formData.baths}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#666;">Square Feet</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${formatPrice(formData.sqft)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#666;">Year Built</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${formData.yearBuilt}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#666;">COE</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${formData.coe}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#666;">EMD</td>
          <td style="padding:12px 0;text-align:right;font-weight:bold;">$${formatPrice(formData.emd)}</td>
        </tr>
      </table>
      
      <div style="margin-top:25px;padding:20px;background:#f8f9fa;border-radius:8px;">
        <h3 style="margin:0 0 10px;color:#1a1a2e;">Condition Notes</h3>
        <p style="margin:0;color:#666;line-height:1.6;">${formData.conditionNotes}</p>
      </div>
      
      <div style="text-align:center;margin-top:30px;">
        <a href="${dealUrl || '#'}" style="display:inline-block;background:linear-gradient(135deg,#00b894 0%,#00cec9 100%);color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:16px;">View Full Details</a>
      </div>
    </div>
    
    <div style="background:#1a1a2e;color:white;padding:20px;text-align:center;">
      <p style="margin:0;opacity:0.8;">Interested? Reply to this email or call/text ${formData.phone}</p>
    </div>
  </div>
</body>
</html>`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  // FORM VIEW
  if (!previewMode) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: 20 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ background: '#1a1a2e', color: 'white', padding: '20px 30px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HouseIcon />
              <span style={{ fontWeight: 700, fontSize: 18 }}>OMD Generator</span>
            </div>
            <span style={{ background: '#00b894', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>Exclusive Deal</span>
          </div>

          <div style={{ background: 'white', padding: 30, borderRadius: '0 0 12px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3>Paste Deal Info</h3>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste your deal details here..."
              style={{ width: '100%', height: 150, padding: 15, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical' }}
            />
            <button onClick={parseInput} style={{ marginTop: 10, background: '#00b894', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Parse Deal Info
            </button>

            <div style={{ marginTop: 30 }}>
              <h3>Deal Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                {Object.entries(formData).filter(([key]) => key !== 'conditionNotes').map(([key, value]) => (
                  <div key={key}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#666', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#666' }}>Condition Notes</label>
                <textarea
                  value={formData.conditionNotes}
                  onChange={(e) => setFormData({ ...formData, conditionNotes: e.target.value })}
                  style={{ width: '100%', height: 80, padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 30 }}>
              <h3>Photos</h3>
              <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 15 }}>
                {photos.map((photo, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img src={photo.url} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
                    <select
                      value={photo.label}
                      onChange={(e) => labelPhoto(index, e.target.value)}
                      style={{ width: '100%', marginTop: 5, padding: 5, fontSize: 12 }}
                    >
                      <option>Exterior - Front</option>
                      <option>Exterior - Back</option>
                      <option>Kitchen</option>
                      <option>Living Room</option>
                      <option>Bedroom</option>
                      <option>Bathroom</option>
                      <option>Garage</option>
                      <option>Other</option>
                    </select>
                    <button onClick={() => removePhoto(index)} style={{ position: 'absolute', top: 5, right: 5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 30, display: 'flex', gap: 10 }}>
              <button onClick={() => setPreviewMode('page')} style={{ flex: 1, background: '#00b894', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>
                OMD Page →
              </button>
              <button onClick={() => setPreviewMode('email')} style={{ flex: 1, background: '#3498db', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>
                OMD Email →
              </button>
              <button onClick={() => setPreviewMode('text')} style={{ flex: 1, background: '#666', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>
                Text Blast →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OMD PAGE PREVIEW
  if (previewMode === 'page') {
    const heroPhoto = photos.find(p => p.label === 'Exterior - Front') || photos[0];
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', background: 'white', minHeight: '100vh' }}>
          {/* Header */}
          <div style={{ background: '#1a1a2e', color: 'white', padding: '15px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HouseIcon />
              <span style={{ fontWeight: 700 }}>Off Market Daily</span>
            </div>
            <span style={{ background: '#00b894', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>Exclusive Deal</span>
          </div>

          {/* Hero */}
          {heroPhoto && (
            <div style={{ position: 'relative', height: 400 }}>
              <img src={heroPhoto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: 30 }}>
                <h1 style={{ color: 'white', margin: 0, fontSize: 28 }}>{formData.address}</h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '5px 0 0' }}>{formData.city}, {formData.state} {formData.zip}</p>
              </div>
            </div>
          )}

          {/* Price Banner */}
          <div style={{ background: 'linear-gradient(135deg, #00b894, #00cec9)', padding: 25, textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 14, opacity: 0.9 }}>ASKING PRICE</div>
            <div style={{ fontSize: 48, fontWeight: 'bold' }}>${formatPrice(formData.askingPrice)}</div>
            <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.2)', display: 'inline-block', padding: '8px 20px', borderRadius: 20 }}>
              ARV: ${formatPrice(formData.arv)} | Spread: ${formatPrice(spread)}
            </div>
          </div>

          {/* Details */}
          <div style={{ padding: 30 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 30 }}>
              <div style={{ textAlign: 'center', padding: 20, background: '#f8f9fa', borderRadius: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' }}>{formData.beds}</div>
                <div style={{ color: '#666' }}>Beds</div>
              </div>
              <div style={{ textAlign: 'center', padding: 20, background: '#f8f9fa', borderRadius: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' }}>{formData.baths}</div>
                <div style={{ color: '#666' }}>Baths</div>
              </div>
              <div style={{ textAlign: 'center', padding: 20, background: '#f8f9fa', borderRadius: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' }}>{formatPrice(formData.sqft)}</div>
                <div style={{ color: '#666' }}>Sq Ft</div>
              </div>
              <div style={{ textAlign: 'center', padding: 20, background: '#f8f9fa', borderRadius: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' }}>{formData.yearBuilt}</div>
                <div style={{ color: '#666' }}>Year Built</div>
              </div>
            </div>

            {/* Terms */}
            <h2 style={{ color: '#1a1a2e', borderBottom: '2px solid #00b894', paddingBottom: 10 }}>Deal Terms</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 30 }}>
              <div style={{ padding: 15, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ color: '#666', fontSize: 14 }}>Occupancy</div>
                <div style={{ fontWeight: 600 }}>{formData.occupancy || 'TBD'}</div>
              </div>
              <div style={{ padding: 15, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ color: '#666', fontSize: 14 }}>Access</div>
                <div style={{ fontWeight: 600 }}>{formData.access || 'Easy Access'}</div>
              </div>
              <div style={{ padding: 15, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ color: '#666', fontSize: 14 }}>Close of Escrow</div>
                <div style={{ fontWeight: 600 }}>{formData.coe}</div>
              </div>
              <div style={{ padding: 15, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ color: '#666', fontSize: 14 }}>EMD Required</div>
                <div style={{ fontWeight: 600 }}>${formatPrice(formData.emd)}</div>
              </div>
            </div>

            {/* Condition */}
            <h2 style={{ color: '#1a1a2e', borderBottom: '2px solid #00b894', paddingBottom: 10 }}>Property Condition</h2>
            <p style={{ color: '#666', lineHeight: 1.8 }}>{formData.conditionNotes}</p>

            {/* Photos */}
            {photos.length > 0 && (
              <>
                <h2 style={{ color: '#1a1a2e', borderBottom: '2px solid #00b894', paddingBottom: 10, marginTop: 30 }}>Property Photos</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {photos.map((photo, i) => (
                    <div key={i}>
                      <img src={photo.url} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8 }} />
                      <div style={{ fontSize: 12, color: '#666', marginTop: 5 }}>{photo.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* CTA */}
            <div style={{ textAlign: 'center', marginTop: 40, padding: 30, background: '#1a1a2e', borderRadius: 12 }}>
              <h2 style={{ color: 'white', margin: '0 0 15px' }}>Interested in this deal?</h2>
              <a href={`sms:${formData.phone}`} style={{ display: 'inline-block', background: 'linear-gradient(135deg, #00b894, #00cec9)', color: 'white', padding: '15px 40px', borderRadius: 30, textDecoration: 'none', fontWeight: 'bold', fontSize: 18 }}>
                I'm Interested - Text Now
              </a>
            </div>

            {/* Disclosures */}
            <div style={{ marginTop: 40, padding: 20, background: '#f8f9fa', borderRadius: 8, fontSize: 12, color: '#888' }}>
              <strong>Disclosures:</strong> This property is being sold "as-is, where-is" with no warranties expressed or implied. Buyer is responsible for conducting their own due diligence including but not limited to property inspections, title search, and verification of all information provided. Seller makes no representations regarding the accuracy of the ARV (After Repair Value) estimate, repair costs, or property condition. All figures are estimates only. Buyer assumes all risk. This is an assignment of contract/wholesale transaction. Earnest money deposit is non-refundable after inspection period. Buyer must provide proof of funds prior to contract execution. Closing timeline is subject to title clearance. Property may be subject to liens, encumbrances, or code violations not disclosed herein. It is the Buyer's sole responsibility to verify zoning, permits, HOA restrictions, and any other factors that may affect the property's value or intended use.
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ padding: 20, background: '#f8f9fa', display: 'flex', gap: 10 }}>
            <button onClick={() => setPreviewMode(null)} style={{ padding: '12px 24px', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', background: 'white' }}>
              ← Edit
            </button>
            <button 
              onClick={publishDeal} 
              disabled={publishing}
              style={{ flex: 1, background: '#00b894', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
            >
              {publishing ? 'Publishing...' : 'Publish Deal'}
            </button>
          </div>

          {dealUrl && (
            <div style={{ padding: 20, background: '#e8f5e9', margin: 20, borderRadius: 8 }}>
              <strong>Deal Published!</strong>
              <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                <input type="text" value={dealUrl} readOnly style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ddd' }} />
                <button onClick={() => copyToClipboard(dealUrl)} style={{ padding: '10px 20px', background: '#00b894', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Copy</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // EMAIL PREVIEW
  if (previewMode === 'email') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: 20 }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
            <button onClick={() => setPreviewMode(null)} style={{ padding: '12px 24px', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', background: 'white' }}>
              ← Edit
            </button>
            <button onClick={() => copyToClipboard(generateEmailHTML())} style={{ flex: 1, background: '#3498db', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Copy HTML for GHL
            </button>
          </div>
          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <div dangerouslySetInnerHTML={{ __html: generateEmailHTML() }} />
          </div>
        </div>
      </div>
    );
  }

  // TEXT BLAST PREVIEW
  if (previewMode === 'text') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: 20 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => setPreviewMode(null)} style={{ padding: '12px 24px', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', background: 'white' }}>
              ← Edit
            </button>
          </div>

          {/* Buyer Teaser Section */}
          <div style={{ background: 'white', padding: 20, borderRadius: 12, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px', color: '#1a1a2e' }}>Buyer Teaser (Initial Text - No Link)</h3>
            <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 8, fontFamily: 'monospace', fontSize: 14, marginBottom: 15 }}>
              {buyerTeaser || 'Click Generate to create a teaser message'}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={generateBuyerTeaser} 
                disabled={generatingTeaser}
                style={{ flex: 1, background: '#9b59b6', color: 'white', border: 'none', padding: 12, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
              >
                {generatingTeaser ? 'Generating...' : buyerTeaser ? 'Regenerate' : 'Generate'}
              </button>
              {buyerTeaser && (
                <button onClick={() => copyToClipboard(buyerTeaser)} style={{ padding: '12px 24px', background: '#00b894', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  Copy
                </button>
              )}
            </div>
          </div>

          {/* Full Text Blast */}
          <div style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px', color: '#1a1a2e' }}>Full Text Blast (For Dispo Partners)</h3>
            <pre style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {generateTextBlast()}
            </pre>
            <button onClick={() => copyToClipboard(generateTextBlast())} style={{ marginTop: 15, width: '100%', background: '#00b894', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Copy Text Blast
            </button>
          </div>
        </div>
      </div>
    );
  }
}
