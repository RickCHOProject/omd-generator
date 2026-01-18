'use client';
import { useState } from 'react';

export default function OMDGenerator() {
  const [mode, setMode] = useState('form');
  const [viewMode, setViewMode] = useState('desktop');
  const [outputType, setOutputType] = useState('page');
  const [activeImg, setActiveImg] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [rawInput, setRawInput] = useState('');
  const [parsed, setParsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [labeling, setLabeling] = useState(false);
  const [buyerTeaser, setBuyerTeaser] = useState('');
  const [generatingTeaser, setGeneratingTeaser] = useState(false);
  
  const [formData, setFormData] = useState({
    address: '', city: '', state: '', zip: '',
    askingPrice: '', arv: '', beds: '', baths: '', sqft: '', yearBuilt: '',
    occupancy: 'Vacant', access: 'Easy Access',
    coe: '', emd: '', hoa: '', conditionNotes: '', phone: ''
  });

  const photoLabels = ['Exterior - Front', 'Exterior - Back', 'Exterior - Side', 'Living Room', 'Kitchen', 'Dining Room', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3', 'Bathroom 1', 'Bathroom 2', 'Basement', 'Garage', 'Backyard', 'Pool', 'Roof', 'HVAC', 'Water Heater', 'Damage', 'Other'];

  const parseRawInput = () => {
    const text = rawInput;
    const newData = { ...formData };
    
    const addressMatch = text.match(/Address:\s*([^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/i);
    if (addressMatch) {
      newData.address = addressMatch[1].trim();
      newData.city = addressMatch[2].trim();
      newData.state = addressMatch[3].trim();
      newData.zip = addressMatch[4] ? addressMatch[4].trim() : '';
    }
    
    const dealMatch = text.match(/New Deal\s*[-–]\s*([^,\n]+),\s*([A-Z]{2})/i);
    if (dealMatch && !newData.city) {
      newData.city = dealMatch[1].trim();
      newData.state = dealMatch[2].trim();
    }

    const askingMatch = text.match(/Asking\s*(?:Price)?:\s*\$?([\d,]+)/i);
    if (askingMatch) newData.askingPrice = askingMatch[1].replace(/,/g, '');

    const arvMatch = text.match(/(?:Estimated\s*)?ARV:\s*\$?([\d,]+)/i);
    if (arvMatch) newData.arv = arvMatch[1].replace(/,/g, '');

    const bbMatch = text.match(/Beds?\/Baths?:\s*(\d+)\s*\/\s*(\d+)/i) || text.match(/(\d+)\/(\d+)/);
    if (bbMatch) { newData.beds = bbMatch[1]; newData.baths = bbMatch[2]; }

    const sqftMatch = text.match(/(?:Living\s*Area\s*Size|Sq\s*Ft):\s*([\d,]+)/i) || text.match(/([\d,]+)\s*\(?Sq\.?\s*Ft/i);
    if (sqftMatch) newData.sqft = sqftMatch[1].replace(/,/g, '');

    const yearMatch = text.match(/Year\s*Built:\s*(\d{4})/i);
    if (yearMatch) newData.yearBuilt = yearMatch[1];

    const occMatch = text.match(/Occupancy[^:]*:\s*([^\n,]+)/i);
    if (occMatch) {
      const o = occMatch[1].toLowerCase();
      if (o.includes('vacant')) newData.occupancy = 'Vacant';
      else if (o.includes('owner')) newData.occupancy = 'Owner Occupied';
      else if (o.includes('tenant')) newData.occupancy = 'Tenant Occupied';
    }

    const coeMatch = text.match(/COE:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (coeMatch) {
      const p = coeMatch[1].split('/');
      newData.coe = `${p[2]}-${p[0].padStart(2,'0')}-${p[1].padStart(2,'0')}`;
    }

    const emdMatch = text.match(/EMD:\s*\$?([\d,]+)/i);
    if (emdMatch) newData.emd = emdMatch[1].replace(/,/g, '');

    const hoaMatch = text.match(/HOA:\s*([^\n]+)/i);
    if (hoaMatch) newData.hoa = hoaMatch[1].trim();

    const notesMatch = text.match(/Notes?:\s*([\s\S]*?)$/i);
    if (notesMatch) newData.conditionNotes = notesMatch[1].trim();

    setFormData(newData);
    setParsed(true);
  };

  const formatCurrency = (num) => num ? '$' + Number(num).toLocaleString() : '$0';
  const calculateSpread = () => (Number(formData.arv) || 0) - (Number(formData.askingPrice) || 0);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
    });
  };

  const autoLabelPhotos = async (newPhotos) => {
    setLabeling(true);
    
    try {
      const images = await Promise.all(newPhotos.map(async (p) => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: p.file.type,
          data: await fileToBase64(p.file)
        }
      })));

      const response = await fetch('/api/label-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, count: newPhotos.length })
      });

      if (response.ok) {
        const { labels } = await response.json();
        if (labels && labels.length === newPhotos.length) {
          const labeled = newPhotos.map((p, i) => ({ ...p, label: labels[i] || 'Other' }));
          const sorted = [...labeled].sort((a, b) => {
            if (a.label.includes('Front')) return -1;
            if (b.label.includes('Front')) return 1;
            return 0;
          });
          setPhotos(sorted);
          setLabeling(false);
          return;
        }
      }
    } catch (err) {
      console.log('Auto-label failed, using defaults');
    }
    
    setPhotos(newPhotos);
    setLabeling(false);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map((file, i) => ({
      id: Date.now() + i,
      file,
      url: URL.createObjectURL(file),
      label: i === 0 ? 'Exterior - Front' : 'Other'
    }));
    
    await autoLabelPhotos(newPhotos);
  };

  const updateLabel = (id, label) => {
    setPhotos(photos.map(p => p.id === id ? { ...p, label } : p));
  };

  const removePhoto = (id) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  const generateBuyerTeaser = async () => {
    setGeneratingTeaser(true);
    try {
      const response = await fetch('/api/label-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generateTeaser: true,
          city: formData.city,
          state: formData.state,
          beds: formData.beds,
          baths: formData.baths
        })
      });
      
      if (response.ok) {
        const { teaser } = await response.json();
        if (teaser) {
          setBuyerTeaser(teaser);
          setGeneratingTeaser(false);
          return;
        }
      }
    } catch (err) {
      console.log('Teaser generation failed');
    }
    // Fallback if API fails
    const fallbacks = [
      `Hey! Off-market in ${formData.city}, ${formData.state} - ${formData.beds}/${formData.baths}. Still buying?`,
      `New deal just hit - ${formData.city}, ${formData.state}. ${formData.beds} bed. You active?`,
      `Solid opportunity in ${formData.city} - ${formData.beds}/${formData.baths}. Interested?`,
      `Off-market alert - ${formData.city}, ${formData.state}. ${formData.beds}/${formData.baths}. Want details?`,
      `Fresh one in ${formData.city} - ${formData.beds} bed, ${formData.baths} bath. Still in the market?`
    ];
    setBuyerTeaser(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
    setGeneratingTeaser(false);
  };

  // House Icon SVG Component
  const HouseIcon = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  );

  // ============ EMAIL HTML ============
  const emailHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Deal - ${formData.city}, ${formData.state}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    
    <div style="padding:16px 24px;border-bottom:1px solid #e5e7eb;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;height:36px;background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:8px;text-align:center;vertical-align:middle;">
                  <img src="https://img.icons8.com/ios-filled/50/ffffff/home.png" width="20" height="20" style="vertical-align:middle;" alt="home" />
                </td>
                <td style="padding-left:10px;font-weight:bold;font-size:15px;color:#111827;">OffMarket Daily</td>
              </tr>
            </table>
          </td>
          <td align="right">
            <span style="background:#dcfce7;color:#166534;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;">Exclusive Deal</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="background:#1e40af;padding:28px;text-align:center;">
      <div style="color:rgba(255,255,255,0.8);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">New Deal in ${formData.city}, ${formData.state}</div>
      <div style="color:#fff;font-size:38px;font-weight:bold;">${formatCurrency(formData.askingPrice)}</div>
      <div style="margin-top:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" align="center" style="border-right:1px solid rgba(255,255,255,0.2);padding-right:16px;">
              <div style="color:rgba(255,255,255,0.7);font-size:11px;margin-bottom:2px;">ARV</div>
              <div style="color:#fff;font-size:22px;font-weight:bold;">${formatCurrency(formData.arv)}</div>
            </td>
            <td width="50%" align="center" style="padding-left:16px;">
              <div style="color:rgba(255,255,255,0.7);font-size:11px;margin-bottom:2px;">Spread</div>
              <div style="color:#86efac;font-size:22px;font-weight:bold;">${formatCurrency(calculateSpread())}</div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <div style="padding:24px;background:#f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="25%" align="center" style="padding:12px;">
            <div style="color:#64748b;font-size:12px;margin-bottom:4px;">Beds</div>
            <div style="color:#111827;font-size:24px;font-weight:bold;">${formData.beds || '-'}</div>
          </td>
          <td width="25%" align="center" style="padding:12px;">
            <div style="color:#64748b;font-size:12px;margin-bottom:4px;">Baths</div>
            <div style="color:#111827;font-size:24px;font-weight:bold;">${formData.baths || '-'}</div>
          </td>
          <td width="25%" align="center" style="padding:12px;">
            <div style="color:#64748b;font-size:12px;margin-bottom:4px;">Sq Ft</div>
            <div style="color:#111827;font-size:24px;font-weight:bold;">${formData.sqft ? Number(formData.sqft).toLocaleString() : '-'}</div>
          </td>
          <td width="25%" align="center" style="padding:12px;">
            <div style="color:#64748b;font-size:12px;margin-bottom:4px;">Year</div>
            <div style="color:#111827;font-size:24px;font-weight:bold;">${formData.yearBuilt || '-'}</div>
          </td>
        </tr>
      </table>
    </div>

    <div style="padding:24px;">
      <div style="font-size:16px;font-weight:bold;color:#111827;margin-bottom:16px;">Deal Terms</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr><td style="padding:8px 0;color:#64748b;">COE</td><td align="right" style="padding:8px 0;color:#374151;font-weight:600;">${formData.coe ? new Date(formData.coe).toLocaleDateString() : 'TBD'}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e5e7eb;">EMD</td><td align="right" style="padding:8px 0;color:#374151;font-weight:600;border-top:1px solid #e5e7eb;">${formData.emd ? formatCurrency(formData.emd) : 'TBD'}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e5e7eb;">Occupancy</td><td align="right" style="padding:8px 0;color:#374151;font-weight:600;border-top:1px solid #e5e7eb;">${formData.occupancy}</td></tr>
      </table>
    </div>

    ${formData.conditionNotes ? `<div style="padding:0 24px 24px;">
      <div style="font-size:16px;font-weight:bold;color:#111827;margin-bottom:12px;">Condition Notes</div>
      <div style="color:#475569;font-size:14px;line-height:1.6;">${formData.conditionNotes}</div>
    </div>` : ''}

    <div style="padding:24px;">
      <a href="{{DEAL_LINK}}" style="display:block;text-align:center;background:#16a34a;color:#fff;padding:18px 24px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:bold;">View Full Details →</a>
      <div style="text-align:center;margin-top:12px;color:#64748b;font-size:14px;">Or call/text: <span style="font-weight:600;color:#374151;">${formData.phone}</span></div>
    </div>

    <div style="padding:24px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
      <div style="text-align:center;margin-bottom:16px;"><span style="font-weight:bold;font-size:13px;color:#374151;">OffMarket Daily</span></div>
      <div style="font-size:10px;color:#64748b;line-height:1.6;">
        <p style="margin:0 0 8px;">Copyright © OffMarket Daily. All rights reserved.</p>
        <p style="margin:0 0 8px;">House is being sold as-is. ${formatCurrency(formData.emd)} Non-Refundable EMD due by NOON next day. Cash or hard money only.</p>
        <p style="margin:0;">Buyer must do their own due diligence. ARV is an opinion of value.</p>
      </div>
    </div>

  </div>
</body>
</html>`;

  // ============ TEXT BLAST ============
  const textBlast = `New Deal - ${formData.city}, ${formData.state}

Address: ${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}
Asking Price: ${formatCurrency(formData.askingPrice)}
Estimated ARV: ${formatCurrency(formData.arv)}
Beds/Baths: ${formData.beds}/${formData.baths}
Living Area Size: ${formData.sqft ? Number(formData.sqft).toLocaleString() : '-'} (Sq. Ft)
Year Built: ${formData.yearBuilt || 'TBD'}
Occupancy Status at Closing: ${formData.occupancy}
Access: ${formData.access}
COE: ${formData.coe ? new Date(formData.coe).toLocaleDateString() : 'TBD'}
EMD: ${formatCurrency(formData.emd)}
${formData.hoa ? `HOA: ${formData.hoa}` : ''}
Pictures Link: [LINK]

${calculateSpread() >= 80000 ? `Over ${formatCurrency(calculateSpread())} spread potential here.` : `${formatCurrency(calculateSpread())} spread - solid margin on this one.`}

Notes:
${formData.conditionNotes || 'Contact for details'}

Reply if interested`;

  // ============ FORM MODE ============
  if (mode === 'form') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '"DM Sans", sans-serif', padding: 24 }}>
        {/* HEADER WITH HOUSE ICON AND EXCLUSIVE DEAL BADGE */}
        <div style={{ maxWidth: 700, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HouseIcon size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#111827', fontFamily: 'Montserrat, sans-serif' }}>OffMarket Daily</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Deal Page Generator</div>
            </div>
          </div>
          <div style={{ background: '#dcfce7', color: '#166534', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>Exclusive Deal</div>
        </div>

        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ marginBottom: 24, background: '#fff', padding: 28, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: parsed ? '1px solid #e5e7eb' : '2px solid #3b82f6' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: parsed ? '#111827' : '#1e40af', marginBottom: 16, fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
              📋 Paste Deal Info
              {parsed && <span style={{ fontSize: 12, fontWeight: 500, color: '#16a34a', background: '#dcfce7', padding: '4px 8px', borderRadius: 4 }}>✓ Parsed</span>}
            </div>
            <textarea value={rawInput} onChange={(e) => { setRawInput(e.target.value); setParsed(false); }} placeholder="Paste everything here..." style={{ width: '100%', minHeight: 160, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
            <button onClick={parseRawInput} style={{ width: '100%', marginTop: 16, padding: '14px 24px', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Parse Deal Info →</button>
          </div>

          {parsed && (
            <div style={{ marginBottom: 24, background: '#fff', padding: 28, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 20, fontFamily: 'Montserrat, sans-serif' }}>Review & Edit</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Street Address</label>
                  <input name="address" value={formData.address} onChange={handleChange} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>City</label>
                  <input name="city" value={formData.city} onChange={handleChange} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>State</label>
                    <input name="state" value={formData.state} onChange={handleChange} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Zip</label>
                    <input name="zip" value={formData.zip} onChange={handleChange} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Asking Price</label>
                  <input name="askingPrice" value={formData.askingPrice} onChange={handleChange} placeholder="350000" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>ARV</label>
                  <input name="arv" value={formData.arv} onChange={handleChange} placeholder="500000" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Beds</label>
                  <input name="beds" value={formData.beds} onChange={handleChange} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Baths</label>
                  <input name="baths" value={formData.baths} onChange={handleChange} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Sq Ft</label>
                  <input name="sqft" value={formData.sqft} onChange={handleChange} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Year Built</label>
                  <input name="yearBuilt" value={formData.yearBuilt} onChange={handleChange} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Occupancy</label>
                  <select name="occupancy" value={formData.occupancy} onChange={handleChange} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                    <option>Vacant</option>
                    <option>Owner Occupied</option>
                    <option>Tenant Occupied</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Access</label>
                  <select name="access" value={formData.access} onChange={handleChange} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                    <option>Easy Access</option>
                    <option>Appointment Only</option>
                    <option>Lockbox</option>
                    <option>Contact for Access</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>COE (Close Date)</label>
                  <input type="date" name="coe" value={formData.coe} onChange={handleChange} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>EMD</label>
                  <input name="emd" value={formData.emd} onChange={handleChange} placeholder="7000" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>HOA (if any)</label>
                <input name="hoa" value={formData.hoa} onChange={handleChange} placeholder="N/A or amount" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Condition Notes</label>
                <textarea name="conditionNotes" value={formData.conditionNotes} onChange={handleChange} style={{ width: '100%', minHeight: 100, padding: 14, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 24, background: '#fff', padding: 28, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16, fontFamily: 'Montserrat, sans-serif' }}>📷 Photos</div>
            <div onClick={() => document.getElementById('photoInput').click()} style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{labeling ? 'Labeling photos...' : 'Click to upload photos'}</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Auto-labeled & sorted (front first)</div>
            </div>
            <input id="photoInput" type="file" multiple accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            
            {photos.length > 0 && (
              <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {photos.map((p) => (
                  <div key={p.id} style={{ position: 'relative' }}>
                    <img src={p.url} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
                    <select value={p.label} onChange={(e) => updateLabel(p.id, e.target.value)} style={{ width: '100%', marginTop: 6, padding: 6, fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 4 }}>
                      {photoLabels.map(l => <option key={l}>{l}</option>)}
                    </select>
                    <button onClick={() => removePhoto(p.id)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: '#fff', fontSize: 12, cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24, background: '#fff', padding: 28, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Your Phone (for CTA)</label>
            <input name="phone" value={formData.phone} onChange={handleChange} placeholder="(470) 555-1234" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <button onClick={() => { setOutputType('page'); setMode('preview'); }} style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>OMD Page →</button>
            <button onClick={() => { setOutputType('email'); setMode('preview'); }} style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>OMD Email →</button>
            <button onClick={() => { setOutputType('text'); setMode('preview'); }} style={{ padding: '16px 20px', background: '#475569', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Text Blast →</button>
          </div>
        </div>
      </div>
    );
  }

  // ============ EMAIL PREVIEW ============
  if (mode === 'preview' && outputType === 'email') {
    const copyHTML = () => {
      navigator.clipboard.writeText(emailHTML);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div style={{ minHeight: '100vh', background: '#1e293b', fontFamily: '"DM Sans", sans-serif' }}>
        <div style={{ padding: '12px 24px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setMode('form')} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>← Edit</button>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>Email Template</span>
          <button onClick={copyHTML} style={{ padding: '8px 20px', background: copied ? '#16a34a' : '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{copied ? '✓ Copied!' : 'Copy HTML'}</button>
        </div>
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 620, background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}>
            <div dangerouslySetInnerHTML={{ __html: emailHTML }} />
          </div>
        </div>
      </div>
    );
  }

  // ============ TEXT BLAST PREVIEW ============
  if (mode === 'preview' && outputType === 'text') {
    const copyTextBlast = () => {
      navigator.clipboard.writeText(textBlast);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const copyTeaser = () => {
      navigator.clipboard.writeText(buyerTeaser);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div style={{ minHeight: '100vh', background: '#1e293b', fontFamily: '"DM Sans", sans-serif' }}>
        <div style={{ padding: '12px 24px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setMode('form')} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>← Edit</button>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>Text Outputs</span>
          <div style={{ width: 80 }}></div>
        </div>
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 650 }}>
            
            {/* BUYER TEASER SECTION */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 28, marginBottom: 24, boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', fontFamily: 'Montserrat, sans-serif' }}>Buyer Teaser</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Initial text - no link, no details. Send first, link after they reply.</div>
                </div>
                <button onClick={generateBuyerTeaser} disabled={generatingTeaser} style={{ padding: '10px 20px', background: generatingTeaser ? '#94a3b8' : 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: generatingTeaser ? 'wait' : 'pointer' }}>
                  {generatingTeaser ? 'Generating...' : '🎲 Generate'}
                </button>
              </div>
              {buyerTeaser ? (
                <div>
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                    <p style={{ fontSize: 15, color: '#111827', margin: 0, lineHeight: 1.6 }}>{buyerTeaser}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={copyTeaser} style={{ padding: '8px 16px', background: copied ? '#16a34a' : '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{copied ? '✓ Copied!' : 'Copy'}</button>
                    <button onClick={generateBuyerTeaser} style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', borderRadius: 6, color: '#374151', fontSize: 13, cursor: 'pointer' }}>Regenerate</button>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', padding: 24, borderRadius: 8, border: '1px dashed #d1d5db', textAlign: 'center' }}>
                  <p style={{ color: '#9ca3af', margin: 0 }}>Click "Generate" to create a randomized teaser</p>
                </div>
              )}
            </div>

            {/* TEXT BLAST SECTION */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', fontFamily: 'Montserrat, sans-serif' }}>Text Blast (Dispo Partners)</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Full details, no branding - for other disposition houses</div>
                </div>
                <button onClick={copyTextBlast} style={{ padding: '10px 20px', background: copied ? '#16a34a' : '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{copied ? '✓ Copied!' : 'Copy Text'}</button>
              </div>
              <pre style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7, color: '#111827', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0', margin: 0 }}>{textBlast}</pre>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ============ PAGE PREVIEW ============
  const isMobile = viewMode === 'mobile';
  
  const PreviewContent = () => (
    <div style={{ background: '#fff', fontFamily: '"DM Sans", sans-serif', minHeight: isMobile ? '100%' : 'auto' }}>
      {/* HEADER WITH HOUSE ICON AND EXCLUSIVE DEAL BADGE */}
      <div style={{ padding: isMobile ? '12px 16px' : '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: 10, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HouseIcon size={isMobile ? 18 : 22} />
          </div>
          <span style={{ fontWeight: 700, fontSize: isMobile ? 14 : 16, color: '#111827', fontFamily: 'Montserrat, sans-serif' }}>OffMarket Daily</span>
        </div>
        <div style={{ background: '#dcfce7', color: '#166534', padding: isMobile ? '4px 10px' : '6px 14px', borderRadius: 20, fontSize: isMobile ? 11 : 13, fontWeight: 600 }}>Exclusive Deal</div>
      </div>

      {isMobile && (
        <div style={{ padding: 16, background: '#f8fafc' }}>
          <div style={{ padding: 20, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', borderRadius: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'uppercase' }}>Asking</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>{formatCurrency(formData.askingPrice)}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: '#fff', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}><div style={{ fontSize: 11, color: '#64748b' }}>ARV</div><div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>{formatCurrency(formData.arv)}</div></div>
            <div style={{ background: '#dcfce7', padding: 14, borderRadius: 12 }}><div style={{ fontSize: 11, color: '#166534' }}>Spread</div><div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', fontFamily: 'Montserrat, sans-serif' }}>{formatCurrency(calculateSpread())}</div></div>
          </div>
        </div>
      )}

      <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 380px', gap: 40, padding: isMobile ? 16 : 40, maxWidth: 1400, margin: '0 auto' }}>
        <div>
          {photos.length > 0 ? (
            <div style={{ marginBottom: isMobile ? 20 : 32 }}>
              <div style={{ width: '100%', height: isMobile ? 220 : 420, borderRadius: 16, overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
                <img src={photos[activeImg]?.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>{photos[activeImg]?.label}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {photos.map((p, i) => (<img key={p.id} src={p.url} onClick={() => setActiveImg(i)} style={{ width: isMobile ? 60 : 80, height: isMobile ? 60 : 80, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: activeImg === i ? '3px solid #3b82f6' : '3px solid transparent', flexShrink: 0 }} />))}
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: isMobile ? 200 : 400, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: isMobile ? 20 : 32 }}><div style={{ textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: 48 }}>🏠</div><div>No photos</div></div></div>
          )}

          <h1 style={{ fontSize: isMobile ? 24 : 34, fontWeight: 700, marginBottom: 8, fontFamily: 'Montserrat, sans-serif', color: '#111827' }}>{formData.address || '123 Main St'}</h1>
          <p style={{ fontSize: isMobile ? 16 : 18, color: '#6b7280', marginBottom: isMobile ? 20 : 28 }}>{formData.city}, {formData.state} {formData.zip}</p>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16, marginBottom: isMobile ? 20 : 32, padding: isMobile ? 16 : 24, background: '#f8fafc', borderRadius: 16 }}>
            {[{ l: 'Beds', v: formData.beds }, { l: 'Baths', v: formData.baths }, { l: 'Sq Ft', v: formData.sqft ? Number(formData.sqft).toLocaleString() : '-' }, { l: 'Year', v: formData.yearBuilt }].map(s => (<div key={s.l}><div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>{s.l}</div><div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>{s.v || '-'}</div></div>))}
          </div>

          {formData.conditionNotes && (<div style={{ padding: isMobile ? 16 : 24, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: isMobile ? 20 : 0 }}><h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, marginBottom: 12, fontFamily: 'Montserrat, sans-serif' }}>Condition Notes</h3><p style={{ color: '#475569', fontSize: isMobile ? 14 : 16, lineHeight: 1.7, margin: 0 }}>{formData.conditionNotes}</p></div>)}
        </div>

        {!isMobile && (
          <div>
            <div style={{ padding: 28, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', borderRadius: 20, marginBottom: 16, boxShadow: '0 8px 30px rgba(30,64,175,0.35)' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontFamily: 'Montserrat, sans-serif' }}>Asking Price</div>
              <div style={{ fontSize: 44, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>{formatCurrency(formData.askingPrice)}</div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.2)', margin: '20px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>ARV</div><div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>{formatCurrency(formData.arv)}</div></div>
                <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>Spread</div><div style={{ fontSize: 24, fontWeight: 700, color: '#86efac', fontFamily: 'Montserrat, sans-serif' }}>{formatCurrency(calculateSpread())}</div></div>
              </div>
            </div>
            <div style={{ padding: 24, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, fontFamily: 'Montserrat, sans-serif' }}>Deal Terms</h3>
              {[{ l: 'COE', v: formData.coe ? new Date(formData.coe).toLocaleDateString() : 'TBD' }, { l: 'EMD', v: formData.emd ? formatCurrency(formData.emd) : 'TBD' }, { l: 'Occupancy', v: formData.occupancy }, { l: 'Access', v: formData.access }].map(t => (<div key={t.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#64748b', fontSize: 14 }}>{t.l}</span><span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{t.v}</span></div>))}
            </div>
            <a href={`sms:${formData.phone?.replace(/\D/g, '')}?body=I'm interested in ${formData.address}`} style={{ display: 'block', width: '100%', padding: '18px 24px', background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 700, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', fontFamily: 'Montserrat, sans-serif', marginBottom: 12 }}>I'm Interested — Text Now</a>
            <a href={`tel:${formData.phone?.replace(/\D/g, '')}`} style={{ display: 'block', textAlign: 'center', color: '#64748b', fontSize: 14, textDecoration: 'none' }}>Or tap to call: <span style={{ fontWeight: 600, color: '#374151' }}>{formData.phone}</span></a>
          </div>
        )}
      </div>

      {isMobile && (<div style={{ padding: 16, background: '#fff', borderTop: '1px solid #e5e7eb', position: 'sticky', bottom: 0 }}><a href={`sms:${formData.phone?.replace(/\D/g, '')}?body=I'm interested in ${formData.address}`} style={{ display: 'block', width: '100%', padding: '16px 20px', background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>I'm Interested — Text Now</a></div>)}

      {/* FOOTER WITH FULL DISCLOSURES */}
      <div style={{ padding: '24px 40px', borderTop: '1px solid #e5e7eb', background: '#f8fafc', marginTop: isMobile ? 0 : 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#374151', fontFamily: 'Montserrat, sans-serif' }}>OffMarket Daily</span>
        </div>
      </div>
      <div style={{ padding: isMobile ? '24px 16px' : '32px 40px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontWeight: 600 }}>Copyright © OffMarket Daily. All rights reserved.</p>
          <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Disclaimer:</p>
          <p style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>House is being sold as-is, and the buyer is to pay all closing costs. {formatCurrency(formData.emd)} Non-Refundable earnest money to be deposited by NOON of the following day or contract will be cancelled. Buyer must close with cash or hard money loan.</p>
          <p style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>The buyer is not relying on any representations, whether written or oral, regarding the properties above. Price based on a cash or hard money offer and is net to seller. Buyers to do their own independent due diligence.</p>
          <p style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>Buyer must do your own due diligence, evaluation and inspection prior to making an offer. Determining value is the buyer's responsibility. Seller strongly recommends buyers employ an Investment Realtor to help determine value. Any reference to the value of a property by the Seller or any representative of the Seller is an opinion of value. Everyone has a differing opinion on value, cost of construction, materials, quality of workmanship and market speculation. Value is ultimately the buyer's responsibility and they should be diligent in determining market value.</p>
          <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>REALTORS:</p>
          <p style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>If you are currently working with a client, and wish to receive a commission, please note that the wholesale price does not include your commission. You may want to negotiate a commission with your client separate from the wholesale price or you may adjust the wholesale price upwards to include your commission.</p>
          <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>WHOLESALERS:</p>
          <p style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6, margin: 0 }}>If you'd like to JV on this deal send us a text message, email, or call to let us know you are going to be sharing our deal with your investors.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#1e293b', fontFamily: '"DM Sans", sans-serif' }}>
      <div style={{ padding: '12px 24px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setMode('form')} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>← Edit</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setViewMode('desktop')} style={{ padding: '8px 16px', background: viewMode === 'desktop' ? '#3b82f6' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Desktop</button>
          <button onClick={() => setViewMode('mobile')} style={{ padding: '8px 16px', background: viewMode === 'mobile' ? '#3b82f6' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Mobile</button>
        </div>
        <button style={{ padding: '8px 20px', background: '#16a34a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Share Deal</button>
      </div>

      <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
        {isMobile ? (
          <div style={{ width: 375, height: 812, background: '#000', borderRadius: 50, padding: 12, boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: 40, overflow: 'hidden', overflowY: 'auto' }}>
              <PreviewContent />
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 1400, background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}>
            <PreviewContent />
          </div>
        )}
      </div>
    </div>
  );
}
