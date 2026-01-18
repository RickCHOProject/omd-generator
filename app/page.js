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

// Image compression function - resizes to max 1200px width
const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Only resize if larger than maxWidth
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

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
  const [uploadProgress, setUploadProgress] = useState('');
  const [buyerTeaser, setBuyerTeaser] = useState('');
  const [generatingTeaser, setGeneratingTeaser] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  // CLIENT-SIDE PARSER - No API needed, instant and reliable
  const parseInput = () => {
    if (!rawInput.trim()) return;
    setParsing(true);
    
    const t = rawInput;
    const tLower = rawInput.toLowerCase();
    const data = { ...formData };
    
    // Convert "5k" to "5000", "410k" to "410000"
    const toNumber = (str) => {
      if (!str) return '';
      let s = str.replace(/[$,]/g, '').trim();
      if (s.toLowerCase().endsWith('k')) {
        return String(Math.round(parseFloat(s.slice(0, -1)) * 1000));
      }
      const m = s.match(/[\d.]+/);
      return m ? m[0] : '';
    };

    let m;

    // ADDRESS
    m = t.match(/address[:\s]+([^,\n]+)/i);
    if (m) data.address = m[1].trim();

    // CITY
    m = t.match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}\s*\d{5}/);
    if (m) data.city = m[1].trim();

    // STATE
    m = t.match(/,\s*([A-Z]{2})\s*\d{5}/);
    if (m) data.state = m[1];

    // ZIP
    m = t.match(/[A-Z]{2}\s*(\d{5})/);
    if (m) data.zip = m[1];

    // ASKING PRICE
    m = t.match(/asking\s+(\d+k?)/i);
    if (m) data.askingPrice = toNumber(m[1]);

    // ARV
    m = t.match(/arv[^0-9]*([\d,]+k?)/i);
    if (m) data.arv = toNumber(m[1]);

    // BEDS
    m = t.match(/(\d+)\s*bed/i);
    if (m) data.beds = m[1];

    // BATHS
    m = t.match(/(\d+(?:\.\d+)?)\s*bath/i);
    if (m) data.baths = m[1];

    // SQFT
    m = t.match(/sqft\s*(\d+)/i) || t.match(/(\d+)\s*sqft/i);
    if (m) data.sqft = m[1];

    // YEAR BUILT
    m = t.match(/built\s*(19\d{2}|20\d{2})/i);
    if (m) data.yearBuilt = m[1];

    // OCCUPANCY
    m = t.match(/(vacant|occupied|tenant)/i);
    if (m) data.occupancy = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();

    // ACCESS / LOCKBOX
    m = t.match(/lockbox\s*(?:code)?\s*(\d+)/i);
    if (m) data.access = 'Lockbox ' + m[1];

    // COE
    m = t.match(/close\s*by\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (m) data.coe = m[1];

    // EMD
    m = t.match(/emd\s+(\d+k?)/i);
    if (m) data.emd = toNumber(m[1]);

    // HOA
    m = t.match(/hoa\s+\$?(\d+(?:\/mo)?)/i);
    if (m) data.hoa = m[1];

    // CONDITION NOTES
    const noteStart = tLower.search(/hvac|roof|kitchen/);
    if (noteStart !== -1) {
      let content = t.substring(noteStart);
      const stopIdx = content.toLowerCase().search(/lockbox|seller wants/);
      if (stopIdx > 0) content = content.substring(0, stopIdx);
      data.conditionNotes = content.trim();
    }

    setFormData(data);
    setParsing(false);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    const newPhotos = await Promise.all(
      files.map(async (file) => {
        const compressedBlob = await compressImage(file, 1200, 0.8);
        const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
        
        return {
          file: compressedFile,
          originalFile: file,
          url: URL.createObjectURL(compressedBlob),
          label: 'Other',
          size: compressedBlob.size
        };
      })
    );
    
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
      
      setUploadProgress(`Uploading photo ${i + 1} of ${photos.length}...`);
      
      const fileName = `${slug}/${i}-${photo.label.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/deal-photos/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'image/jpeg'
        },
        body: photo.file
      });
      
      if (response.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/deal-photos/${fileName}`;
        uploadedUrls.push({ url: publicUrl, label: photo.label });
      }
    }
    
    setUploadProgress('');
    return uploadedUrls;
  };

  const publishDeal = async () => {
    setPublishing(true);
    try {
      const slug = formData.address
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30) + '-' + Math.random().toString(36).substring(2, 6);
      
      const uploadedPhotos = await uploadPhotosToSupabase(slug);
      
      const dealData = {
        ...formData,
        photos: uploadedPhotos
      };
      
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

  const totalPhotoSize = photos.reduce((sum, p) => sum + (p.size || 0), 0);
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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
    <!-- OffMarket Daily Header -->
    <div style="background:#1a1a2e;padding:20px 30px;text-align:center;">
      <table style="margin:0 auto;">
        <tr>
          <td style="vertical-align:middle;padding-right:10px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </td>
          <td style="vertical-align:middle;">
            <span style="color:white;font-size:20px;font-weight:700;">Off Market Daily</span>
          </td>
          <td style="vertical-align:middle;padding-left:15px;">
            <span style="background:#00b894;color:white;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;">Exclusive Deal</span>
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Deal Title -->
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:white;padding:25px 30px;text-align:center;">
      <h1 style="margin:0;font-size:26px;">New Deal - ${formData.city}, ${formData.state}</h1>
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
        <a href="${dealUrl || '#'}" style="display:inline-block;background:linear-gradient(135deg,#00b894 0%,#00cec9 100%);color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:16px;">View Full Details & Photos</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background:#1a1a2e;color:white;padding:25px;text-align:center;">
      <p style="margin:0 0 10px;font-size:16px;font-weight:600;">Interested in this deal?</p>
      <p style="margin:0;opacity:0.8;">Reply to this email or call/text ${formData.phone}</p>
      <div style="margin-top:15px;padding-top:15px;border-top:1px solid rgba(255,255,255,0.2);">
        <span style="opacity:0.6;font-size:12px;">Off Market Daily | Exclusive Investment Properties</span>
      </div>
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
            <p style={{ color: '#666', fontSize: 14, marginBottom: 10 }}>Paste messy deal info - parser will extract the fields automatically.</p>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste your deal details here - can be messy, parser will figure it out..."
              style={{ width: '100%', height: 150, padding: 15, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical' }}
            />
            <button 
              onClick={parseInput} 
              disabled={parsing}
              style={{ marginTop: 10, background: parsing ? '#ccc' : '#00b894', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: parsing ? 'default' : 'pointer', fontWeight: 600 }}
            >
              {parsing ? 'Parsing...' : 'Parse Deal Info'}
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
              <p style={{ color: '#666', fontSize: 14, marginBottom: 10 }}>
                Photos are automatically compressed to ~1200px for fast loading.
                {photos.length > 0 && ` Total size: ${formatSize(totalPhotoSize)}`}
              </p>
              <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 15 }}>
                {photos.map((photo, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img src={photo.url} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
                    <div style={{ fontSize: 10, color: '#999', textAlign: 'center' }}>{formatSize(photo.size)}</div>
                    <select
                      value={photo.label}
                      onChange={(e) => labelPhoto(index, e.target.value)}
                      style={{ width: '100%', marginTop: 5, padding: 5, fontSize: 12 }}
                    >
                      <option>Exterior - Front</option>
                      <option>Exterior - Back</option>
                      <option>Exterior - Side</option>
                      <option>Kitchen</option>
                      <option>Living Room</option>
                      <option>Dining Room</option>
                      <option>Master Bedroom</option>
                      <option>Bedroom</option>
                      <option>Master Bathroom</option>
                      <option>Bathroom</option>
                      <option>Garage</option>
                      <option>Backyard</option>
                      <option>Pool</option>
                      <option>Laundry</option>
                      <option>Basement</option>
                      <option>Attic</option>
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
          <div style={{ background: '#1a1a2e', color: 'white', padding: '15px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HouseIcon />
              <span style={{ fontWeight: 700 }}>Off Market Daily</span>
            </div>
            <span style={{ background: '#00b894', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>Exclusive Deal</span>
          </div>

          {/* ZILLOW-STYLE PHOTO GALLERY AT TOP */}
          {photos.length > 0 ? (
            <div style={{ position: 'relative' }}>
              {/* Main Photo Display */}
              <div style={{ 
                position: 'relative', 
                height: 400,
                background: '#1a1a2e'
              }}>
                <img 
                  src={photos[activeImg]?.url} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                {/* Address Overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: 30 }}>
                  <h1 style={{ color: 'white', margin: 0, fontSize: 28 }}>{formData.address}</h1>
                  <p style={{ color: 'rgba(255,255,255,0.8)', margin: '5px 0 0' }}>{formData.city}, {formData.state} {formData.zip}</p>
                </div>
                {/* Photo Label */}
                <div style={{ 
                  position: 'absolute', 
                  top: 16, 
                  left: 16, 
                  padding: '10px 18px', 
                  background: '#fff', 
                  borderRadius: 10, 
                  fontSize: 14, 
                  fontWeight: 600,
                  color: '#374151',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {photos[activeImg]?.label}
                </div>
                {/* Photo Counter */}
                <div style={{ 
                  position: 'absolute', 
                  top: 16, 
                  right: 16, 
                  padding: '10px 16px', 
                  background: 'rgba(0,0,0,0.7)', 
                  borderRadius: 10, 
                  fontSize: 13, 
                  color: '#fff',
                  fontWeight: 500
                }}>
                  {activeImg + 1} / {photos.length}
                </div>
                {/* Left Arrow */}
                {activeImg > 0 && (
                  <button 
                    onClick={() => setActiveImg(activeImg - 1)}
                    style={{ 
                      position: 'absolute', 
                      left: 16, 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.9)', 
                      border: 'none', 
                      color: '#1a1a2e', 
                      fontSize: 24, 
                      cursor: 'pointer',
                      padding: '12px 16px',
                      borderRadius: 8,
                      fontWeight: 'bold'
                    }}
                  >
                    ‹
                  </button>
                )}
                {/* Right Arrow */}
                {activeImg < photos.length - 1 && (
                  <button 
                    onClick={() => setActiveImg(activeImg + 1)}
                    style={{ 
                      position: 'absolute', 
                      right: 16, 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.9)', 
                      border: 'none', 
                      color: '#1a1a2e', 
                      fontSize: 24, 
                      cursor: 'pointer',
                      padding: '12px 16px',
                      borderRadius: 8,
                      fontWeight: 'bold'
                    }}
                  >
                    ›
                  </button>
                )}
              </div>

              {/* Thumbnails */}
              {photos.length > 1 && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: '#f8f9fa', overflowX: 'auto' }}>
                  {photos.map((photo, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveImg(i)}
                      style={{
                        minWidth: 80,
                        height: 60, 
                        borderRadius: 8, 
                        overflow: 'hidden', 
                        cursor: 'pointer',
                        border: activeImg === i ? '3px solid #00b894' : '3px solid transparent',
                        opacity: activeImg === i ? 1 : 0.7,
                        flexShrink: 0
                      }}
                    >
                      <img src={photo.url} alt={photo.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ height: 200, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              No photos uploaded
            </div>
          )}

          <div style={{ background: 'linear-gradient(135deg, #00b894, #00cec9)', padding: 25, textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 14, opacity: 0.9 }}>ASKING PRICE</div>
            <div style={{ fontSize: 48, fontWeight: 'bold' }}>${formatPrice(formData.askingPrice)}</div>
            <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.2)', display: 'inline-block', padding: '8px 20px', borderRadius: 20 }}>
              ARV: ${formatPrice(formData.arv)} | Spread: ${formatPrice(spread)}
            </div>
          </div>

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

            <h2 style={{ color: '#1a1a2e', borderBottom: '2px solid #00b894', paddingBottom: 10 }}>Property Condition</h2>
            <p style={{ color: '#666', lineHeight: 1.8 }}>{formData.conditionNotes}</p>

            <div style={{ textAlign: 'center', marginTop: 40, padding: 30, background: '#1a1a2e', borderRadius: 12 }}>
              <h2 style={{ color: 'white', margin: '0 0 15px' }}>Interested in this deal?</h2>
              <a href={`sms:${formData.phone}`} style={{ display: 'inline-block', background: 'linear-gradient(135deg, #00b894, #00cec9)', color: 'white', padding: '15px 40px', borderRadius: 30, textDecoration: 'none', fontWeight: 'bold', fontSize: 18 }}>
                I'm Interested - Text Now
              </a>
            </div>

            <div style={{ marginTop: 40, padding: 20, background: '#f8f9fa', borderRadius: 8, fontSize: 12, color: '#888', lineHeight: 1.7 }}>
              <strong>Disclosures:</strong>
              <p style={{ margin: '10px 0 0' }}>
                House is being sold as-is, and the buyer is to pay all closing costs. $7,000 Non-Refundable earnest money to be deposited by NOON of the following day or contract will be cancelled. Buyer must close with cash or hard money loan. The buyer is not relying on any representations, whether written or oral, regarding the properties above. Price based on a cash or hard money offer and is net to seller. Buyers to do their own independent due diligence. Buyer must do your own due diligence, evaluation and inspection prior to making an offer. Determining value is the buyer's responsibility. Seller strongly recommends buyers employ an Investment Realtor to help determine value. Any reference to the value of a property by the Seller or any representative of the Seller is an opinion of value. Everyone has a differing opinion on value, cost of construction, materials, quality of workmanship and market speculation. Value is ultimately the buyer's responsibility and they should be diligent in determining market value.
              </p>
              <p style={{ margin: '15px 0 0' }}>
                <strong>REALTORS:</strong> If you are currently working with a client, and wish to receive a commission, please note that the wholesale price does not include your commission. You may want to negotiate a commission with your client separate from the wholesale price or you may adjust the wholesale price upwards to include your commission.
              </p>
              <p style={{ margin: '15px 0 0' }}>
                <strong>WHOLESALERS:</strong> If you'd like to JV on this deal send us a text message, email, or call to let us know you are going to be sharing our deal with your investors.
              </p>
            </div>
          </div>

          <div style={{ padding: 20, background: '#f8f9fa', display: 'flex', gap: 10 }}>
            <button onClick={() => setPreviewMode(null)} style={{ padding: '12px 24px', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', background: 'white' }}>
              ← Edit
            </button>
            <button 
              onClick={publishDeal} 
              disabled={publishing}
              style={{ flex: 1, background: '#00b894', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
            >
              {publishing ? (uploadProgress || 'Publishing...') : 'Publish Deal'}
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
