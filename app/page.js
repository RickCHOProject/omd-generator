'use client';
import { useState } from 'react';
import { buildFacebookPost, FACEBOOK_VARIANT_COUNT, getFacebookVariantIndex } from '../lib/facebookPost.mjs';
import { EMPTY_DEAL, extractTextBlastPhotoLink, getMissingDealFields, parseDealInput, polishConditionNotes } from '../lib/dealParser.mjs';
import { buildPublishedDealRecord, buildTrackingOnlyDealRecord } from '../lib/dealRecord.mjs';
import { buildTextBlast } from '../lib/textBlast.mjs';

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
  const [formData, setFormData] = useState({ ...EMPTY_DEAL });
  const [photos, setPhotos] = useState([]);
  const [previewMode, setPreviewMode] = useState(null);
  const [dealUrl, setDealUrl] = useState('');
  const [dealNumber, setDealNumber] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [creatingDealNumber, setCreatingDealNumber] = useState(false);
  const [dealNumberNotice, setDealNumberNotice] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [buyerTeaser, setBuyerTeaser] = useState('');
  const [textBlastPhotoLink, setTextBlastPhotoLink] = useState('');
  const [facebookVariantOffset, setFacebookVariantOffset] = useState(0);
  const [generatingTeaser, setGeneratingTeaser] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseNotice, setParseNotice] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [polishingNotes, setPolishingNotes] = useState(false);
  const [polishNotice, setPolishNotice] = useState('');

  // Polish raw notes into professional marketing copy - CLIENT SIDE ONLY
  const polishNotes = () => {
    if (!formData.conditionNotes.trim()) return;
    setPolishingNotes(true);
    const polished = polishConditionNotes(formData.conditionNotes);
    const changed = polished !== formData.conditionNotes.trim();
    setFormData({ ...formData, conditionNotes: polished });
    setPolishNotice(changed ? 'Condition notes polished.' : 'Notes already look polished.');
    setPolishingNotes(false);
  };

  // CLIENT-SIDE PARSER - No API needed, instant and reliable
  const parseInput = () => {
    if (!rawInput.trim()) return;
    setParsing(true);
    const data = parseDealInput(rawInput);
    const missingFields = getMissingDealFields(data);
    setFormData(data);
    setDealUrl('');
    setDealNumber('');
    setDealNumberNotice(null);
    setFacebookVariantOffset(0);
    setTextBlastPhotoLink(extractTextBlastPhotoLink(rawInput));
    setPolishNotice('');
    setParseNotice(missingFields.length
      ? { type: 'warning', text: `Parsed the buyer-facing details found. Still needed: ${missingFields.join(', ')}.` }
      : { type: 'success', text: 'All buyer-facing deal fields were found.' });
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

  const movePhoto = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= photos.length) return;
    const updated = [...photos];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setPhotos(updated);
  };

  const removePhoto = (index) => {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
  };

  const generateBuyerTeaser = () => {
    setGeneratingTeaser(true);
    
    const teasers = [
      `Hey! Off-market in ${formData.city}, ${formData.state} - ${formData.beds}/${formData.baths}. Still buying?`,
      `New deal just hit - ${formData.city}, ${formData.state}. ${formData.beds} bed. You active?`,
      `Off-market in ${formData.city} - ${formData.beds}/${formData.baths}. Interested?`,
      `Got one in ${formData.city}, ${formData.state} - ${formData.beds}/${formData.baths}. Still looking?`,
      `Hey, just got something new in ${formData.city}. ${formData.beds}/${formData.baths}. You buying?`,
      `Quick one - off-market ${formData.beds}/${formData.baths} in ${formData.city}. Still in the market?`,
      `${formData.city} deal just came in. ${formData.beds} bed ${formData.baths} bath. Want details?`,
      `Hey! ${formData.beds}/${formData.baths} in ${formData.city}, ${formData.state}. Off-market. Interested?`,
      `New ${formData.city} property - ${formData.beds}/${formData.baths}. Are you still active?`,
      `Got a ${formData.beds}/${formData.baths} off-market in ${formData.city}. You looking?`,
      `Hey, something just hit in ${formData.city}. ${formData.beds} bed. Still buying in the area?`,
      `Off-market alert - ${formData.city}, ${formData.state}. ${formData.beds}/${formData.baths}. You in?`,
      `Quick question - still buying in ${formData.city}? Got a ${formData.beds}/${formData.baths} off-market.`,
      `${formData.city} - ${formData.beds}/${formData.baths} just came across my desk. You active?`,
      `Hey! Are you still looking in ${formData.city}? Got a ${formData.beds} bed off-market.`
    ];
    
    // True random - different each time
    const randomIndex = Math.floor(Math.random() * teasers.length);
    setBuyerTeaser(teasers[randomIndex]);
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
    setDealNumber('');
    try {
      const pendingRecord = buildPublishedDealRecord({ formData, photos: [] });
      const slug = pendingRecord.slug;
      
      const uploadedPhotos = await uploadPhotosToSupabase(slug);
      
      const dealData = buildPublishedDealRecord({
        formData,
        photos: uploadedPhotos,
        suffix: slug.split('-').pop()
      }).data;
      
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
        const savedDeals = await response.json();
        const savedDeal = savedDeals?.[0];
        const url = `https://deals.offmarketdaily.com/d/${slug}`;
        setDealNumber(savedDeal?.id ? String(savedDeal.id) : '');
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

  const createDealNumberOnly = async () => {
    setCreatingDealNumber(true);
    setDealNumber('');
    setDealUrl('');
    setDealNumberNotice(null);

    try {
      const record = buildTrackingOnlyDealRecord({ formData });
      const response = await fetch(`${SUPABASE_URL}/rest/v1/deals`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(record)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'The deal number could not be created.');
      }

      const savedDeals = await response.json();
      const savedDeal = savedDeals?.[0];
      if (!savedDeal?.id) throw new Error('The CRM tracking number was not returned.');

      setDealNumber(String(savedDeal.id));
      setDealNumberNotice({
        type: 'success',
        text: `Deal #${savedDeal.id} created for CRM tracking. No public deal page or buyer link was created.`
      });
    } catch (error) {
      setDealNumberNotice({
        type: 'error',
        text: error.message || 'The deal number could not be created.'
      });
    }

    setCreatingDealNumber(false);
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

  const generateTextBlast = () => buildTextBlast(formData, {
    dealUrl,
    photoLink: textBlastPhotoLink
  });

  const generateFacebookPost = () => buildFacebookPost(formData, {
    variantIndex: getFacebookVariantIndex(formData) + facebookVariantOffset,
    dealUrl
  });

  const generateEmailHTML = () => {
    return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>New Deal - ${formData.city}, ${formData.state}</title>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif; }
    img { border: 0; display: block; }
    a { color: #ffffff; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
  
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" valign="top" style="padding:20px 10px;">
        
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color:#ffffff;">
          
          <tr>
            <td align="center" valign="middle" bgcolor="#1a1a2e" style="background-color:#1a1a2e;padding:20px 30px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif;">
                    Off Market Daily
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:10px;">
                    <table border="0" cellpadding="0" cellspacing="0" bgcolor="#00b894" style="background-color:#00b894;border-radius:20px;">
                      <tr>
                        <td style="padding:4px 12px;font-size:11px;font-weight:600;color:#ffffff;font-family:Arial,sans-serif;">Exclusive Deal</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td align="center" valign="middle" bgcolor="#16213e" style="background-color:#16213e;padding:25px 30px;">
              <h1 style="margin:0;font-size:26px;color:#ffffff;font-family:Arial,sans-serif;">New Deal - ${formData.city}, ${formData.state}</h1>
              <p style="margin:10px 0 0;font-size:16px;color:#cccccc;font-family:Arial,sans-serif;">${formData.address}</p>
            </td>
          </tr>
          
          <tr>
            <td align="center" valign="middle" bgcolor="#00b894" style="background-color:#00b894;padding:25px 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="font-size:14px;color:#ffffff;font-family:Arial,sans-serif;">ASKING PRICE</td>
                </tr>
                <tr>
                  <td align="center" style="font-size:42px;font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;padding:5px 0;">$${formatPrice(formData.askingPrice)}</td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:10px;">
                    <table border="0" cellpadding="0" cellspacing="0" bgcolor="#008577" style="background-color:#008577;border-radius:20px;">
                      <tr>
                        <td style="padding:8px 20px;font-size:14px;color:#ffffff;font-family:Arial,sans-serif;">
                          ARV: $${formatPrice(formData.arv)} | Spread: $${formatPrice(spread)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td style="padding:30px;">
              <h2 style="margin:0 0 15px;font-size:20px;color:#1a1a2e;font-family:Arial,sans-serif;border-bottom:2px solid #00b894;padding-bottom:10px;">Property Details</h2>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #eeeeee;color:#666666;font-family:Arial,sans-serif;">Beds/Baths</td>
                  <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-weight:bold;font-family:Arial,sans-serif;">${formData.beds}/${formData.baths}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #eeeeee;color:#666666;font-family:Arial,sans-serif;">Square Feet</td>
                  <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-weight:bold;font-family:Arial,sans-serif;">${formatPrice(formData.sqft)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #eeeeee;color:#666666;font-family:Arial,sans-serif;">Year Built</td>
                  <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-weight:bold;font-family:Arial,sans-serif;">${formData.yearBuilt}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #eeeeee;color:#666666;font-family:Arial,sans-serif;">COE</td>
                  <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-weight:bold;font-family:Arial,sans-serif;">${formData.coe}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#666666;font-family:Arial,sans-serif;">EMD</td>
                  <td align="right" style="padding:12px 0;font-weight:bold;font-family:Arial,sans-serif;">$${formatPrice(formData.emd)}</td>
                </tr>
              </table>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td bgcolor="#f8f9fa" style="background-color:#f8f9fa;padding:20px;">
                    <h3 style="margin:0 0 10px;font-size:16px;color:#1a1a2e;font-family:Arial,sans-serif;">Condition Notes</h3>
                    <p style="margin:0;color:#666666;line-height:1.6;font-family:Arial,sans-serif;">${formData.conditionNotes}</p>
                  </td>
                </tr>
              </table>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:30px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td bgcolor="#00b894" style="background-color:#00b894;border-radius:30px;padding:14px 40px;" align="center">
                          <a href="${dealUrl || '#'}" style="text-decoration:none;">
                            <span style="display:inline-block;text-decoration:none !important;">
                              <span style="color:#ffffff;font-size:16px;font-family:Arial,sans-serif;font-weight:bold;text-decoration:none !important;">View Full Details &amp; Photos</span>
                            </span>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td align="center" bgcolor="#1a1a2e" style="background-color:#1a1a2e;padding:25px;">
              <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#ffffff;font-family:Arial,sans-serif;">Interested in this deal?</p>
              <p style="margin:0;font-size:14px;color:#cccccc;font-family:Arial,sans-serif;">Reply to this email or call/text ${formData.phone}</p>
              <p style="margin:15px 0 0;font-size:12px;color:#888888;font-family:Arial,sans-serif;">Off Market Daily | Exclusive Investment Properties</p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
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
            {parseNotice && (
              <div style={{
                marginTop: 12,
                padding: '12px 14px',
                borderRadius: 8,
                background: parseNotice.type === 'success' ? '#e8f7f2' : '#fff6df',
                color: parseNotice.type === 'success' ? '#116149' : '#795500',
                fontSize: 13,
                lineHeight: 1.5
              }}>
                {parseNotice.text}
              </div>
            )}

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
                  onChange={(e) => {
                    setFormData({ ...formData, conditionNotes: e.target.value });
                    setPolishNotice('');
                  }}
                  style={{ width: '100%', height: 80, padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
                />
                <button 
                  onClick={polishNotes}
                  disabled={polishingNotes || !formData.conditionNotes.trim()}
                  style={{ 
                    marginTop: 8, 
                    background: polishingNotes ? '#ccc' : '#9b59b6', 
                    color: 'white', 
                    border: 'none', 
                    padding: '8px 16px', 
                    borderRadius: 6, 
                    cursor: polishingNotes ? 'default' : 'pointer', 
                    fontSize: 13,
                    fontWeight: 500
                  }}
                >
                  {polishingNotes ? 'Polishing...' : '✨ Polish Notes for Buyers'}
                </button>
                <span style={{ marginLeft: 10, fontSize: 12, color: polishNotice ? '#116149' : '#888' }}>
                  {polishNotice || 'Rewrites raw notes into professional marketing copy'}
                </span>
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
                    {/* Move buttons */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <button 
                        onClick={() => movePhoto(index, -1)} 
                        disabled={index === 0}
                        style={{ flex: 1, padding: '4px', fontSize: 12, cursor: index === 0 ? 'default' : 'pointer', background: index === 0 ? '#eee' : '#ddd', border: 'none', borderRadius: 4 }}
                      >
                        ←
                      </button>
                      <button 
                        onClick={() => movePhoto(index, 1)} 
                        disabled={index === photos.length - 1}
                        style={{ flex: 1, padding: '4px', fontSize: 12, cursor: index === photos.length - 1 ? 'default' : 'pointer', background: index === photos.length - 1 ? '#eee' : '#ddd', border: 'none', borderRadius: 4 }}
                      >
                        →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
              <button onClick={() => { 
                const extIdx = photos.findIndex(p => p.label === 'Exterior - Front');
                setActiveImg(extIdx >= 0 ? extIdx : 0);
                setPreviewMode('page'); 
              }} style={{ flex: 1, background: '#00b894', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>
                OMD Page →
              </button>
              <button onClick={() => setPreviewMode('email')} style={{ flex: 1, background: '#3498db', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>
                OMD Email →
              </button>
              <button onClick={() => setPreviewMode('text')} style={{ flex: 1, background: '#666', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>
                Text Blast →
              </button>
              <button onClick={() => setPreviewMode('facebook')} style={{ flex: 1, background: '#1877f2', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>
                Facebook Post →
              </button>
            </div>

            <div style={{ marginTop: 20, padding: 16, border: '1px solid #d8dee8', borderRadius: 10, background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#1a1a2e', marginBottom: 5 }}>Need the CRM deal number without marketing the property?</div>
              <p style={{ color: '#667085', fontSize: 13, lineHeight: 1.5, margin: '0 0 12px' }}>
                Enter the address above, then create the tracking number. This does not upload photos, publish a buyer page, or create a shareable deal link.
              </p>
              <button
                onClick={createDealNumberOnly}
                disabled={creatingDealNumber || !formData.address.trim()}
                style={{
                  background: creatingDealNumber || !formData.address.trim() ? '#c8ced8' : '#1a1a2e',
                  color: 'white',
                  border: 'none',
                  padding: '11px 18px',
                  borderRadius: 8,
                  cursor: creatingDealNumber || !formData.address.trim() ? 'default' : 'pointer',
                  fontWeight: 700
                }}
              >
                {creatingDealNumber ? 'Creating Deal #...' : 'Create Deal # Only'}
              </button>
              {dealNumberNotice && (
                <div style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: dealNumberNotice.type === 'success' ? '#e8f7f2' : '#ffebee',
                  color: dealNumberNotice.type === 'success' ? '#116149' : '#b42318',
                  fontSize: 13,
                  fontWeight: 600
                }}>
                  {dealNumberNotice.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OMD PAGE PREVIEW
  if (previewMode === 'page') {
    return (
      <div style={{ minHeight: '100vh', background: 'white' }}>
        <div style={{ width: '100%' }}>
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
              {/* Main Photo Display - CLICK TO OPEN LIGHTBOX */}
              <div 
                onClick={() => setLightboxOpen(true)}
                style={{ 
                  position: 'relative', 
                  height: 400,
                  background: '#1a1a2e',
                  cursor: 'pointer'
                }}
              >
                <img 
                  src={photos[activeImg]?.url} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                {/* Click to enlarge hint */}
                <div style={{
                  position: 'absolute',
                  top: 16,
                  right: 80,
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#fff'
                }}>
                  Click to enlarge
                </div>
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
                    onClick={(e) => { e.stopPropagation(); setActiveImg(activeImg - 1); }}
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
                    onClick={(e) => { e.stopPropagation(); setActiveImg(activeImg + 1); }}
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

              {/* FULLSCREEN LIGHTBOX MODAL */}
              {lightboxOpen && (
                <div 
                  style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    background: 'rgba(0,0,0,0.95)', 
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => setLightboxOpen(false)}
                >
                  {/* Close button */}
                  <button 
                    onClick={() => setLightboxOpen(false)}
                    style={{ 
                      position: 'absolute', 
                      top: 20, 
                      right: 20, 
                      background: 'rgba(255,255,255,0.2)', 
                      border: 'none', 
                      color: 'white', 
                      fontSize: 32, 
                      cursor: 'pointer',
                      padding: '5px 15px',
                      borderRadius: 8,
                      zIndex: 10001
                    }}
                  >
                    ×
                  </button>

                  {/* Photo counter */}
                  <div style={{ position: 'absolute', top: 25, left: 25, color: 'white', fontSize: 18, fontWeight: 600 }}>
                    {activeImg + 1} / {photos.length}
                  </div>

                  {/* Main image */}
                  <img 
                    src={photos[activeImg]?.url} 
                    alt="" 
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      maxHeight: '75vh', 
                      maxWidth: '90vw', 
                      objectFit: 'contain',
                      borderRadius: 8
                    }} 
                  />

                  {/* Photo label */}
                  <div style={{ color: 'white', marginTop: 15, fontSize: 18, fontWeight: 500 }}>
                    {photos[activeImg]?.label}
                  </div>

                  {/* Previous button */}
                  {activeImg > 0 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveImg(activeImg - 1); }}
                      style={{ 
                        position: 'absolute', 
                        left: 20, 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.2)', 
                        border: 'none', 
                        color: 'white', 
                        fontSize: 40, 
                        cursor: 'pointer',
                        padding: '15px 22px',
                        borderRadius: 8
                      }}
                    >
                      ‹
                    </button>
                  )}

                  {/* Next button */}
                  {activeImg < photos.length - 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveImg(activeImg + 1); }}
                      style={{ 
                        position: 'absolute', 
                        right: 20, 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.2)', 
                        border: 'none', 
                        color: 'white', 
                        fontSize: 40, 
                        cursor: 'pointer',
                        padding: '15px 22px',
                        borderRadius: 8
                      }}
                    >
                      ›
                    </button>
                  )}

                  {/* Thumbnail strip */}
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      display: 'flex', 
                      gap: 8, 
                      marginTop: 20, 
                      overflowX: 'auto', 
                      maxWidth: '90vw',
                      padding: '10px 0'
                    }}
                  >
                    {photos.map((photo, i) => (
                      <img 
                        key={i}
                        src={photo.url} 
                        alt="" 
                        onClick={() => setActiveImg(i)}
                        style={{ 
                          width: 70, 
                          height: 50, 
                          objectFit: 'cover', 
                          borderRadius: 6,
                          cursor: 'pointer',
                          border: i === activeImg ? '3px solid #00b894' : '3px solid transparent',
                          opacity: i === activeImg ? 1 : 0.6
                        }} 
                      />
                    ))}
                  </div>
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
              <strong>Deal Published{dealNumber ? ` — Deal #${dealNumber}` : ''}!</strong>
              <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input type="text" value={dealUrl} readOnly style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ddd' }} />
                <button onClick={() => copyToClipboard(dealUrl)} style={{ padding: '10px 20px', background: '#00b894', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Copy</button>
                <button onClick={() => setPreviewMode('facebook')} style={{ padding: '10px 20px', background: '#1877f2', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Facebook Post</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // FACEBOOK POST PREVIEW
  if (previewMode === 'facebook') {
    const facebookPost = generateFacebookPost();
    return (
      <div style={{ minHeight: '100vh', background: '#eef1f6', padding: 20 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: '#5f6673', fontSize: 13 }}>The property image is selected separately from Drive when posting.</span>
          </div>

          <section style={{ background: 'white', padding: 24, borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h1 style={{ margin: '0 0 6px', color: '#1a1a2e', fontSize: 24 }}>Facebook Post</h1>
            <p style={{ margin: '0 0 18px', color: '#68707d', lineHeight: 1.5 }}>
              This caption uses the same deal information already entered in the generator. Refreshing changes the wording, not the facts.
            </p>

            {!dealUrl && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#fff6df', color: '#795500', fontSize: 14 }}>
                Publish the OMD page first. The live deal link will then be added automatically.
              </div>
            )}

            <div style={{ padding: 20, borderRadius: 10, background: '#f7f8fa', border: '1px solid #e1e4e9', whiteSpace: 'pre-wrap', fontFamily: 'Arial, sans-serif', fontSize: 15, lineHeight: 1.6, color: '#242933' }}>
              {facebookPost}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 15 }}>
              <button
                onClick={() => setFacebookVariantOffset((current) => (current + 1) % FACEBOOK_VARIANT_COUNT)}
                style={{ background: 'white', color: '#1a1a2e', border: '1px solid #cfd4dc', padding: 14, borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
              >
                Try Different Wording
              </button>
              <button
                onClick={() => copyToClipboard(facebookPost)}
                disabled={!dealUrl}
                style={{ background: dealUrl ? '#1877f2' : '#aeb7c6', color: 'white', border: 'none', padding: 14, borderRadius: 8, cursor: dealUrl ? 'pointer' : 'not-allowed', fontWeight: 700 }}
              >
                Copy Facebook Post
              </button>
            </div>
          </section>

          <div style={{ marginTop: 20 }}>
            <button onClick={() => setPreviewMode(null)} style={{ padding: '12px 24px', border: '1px solid #d7dbe2', borderRadius: 8, cursor: 'pointer', background: 'white' }}>
              ← Edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EMAIL PREVIEW
  if (previewMode === 'email') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: 20 }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <div dangerouslySetInnerHTML={{ __html: generateEmailHTML() }} />
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button onClick={() => setPreviewMode(null)} style={{ padding: '12px 24px', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', background: 'white' }}>
              ← Edit
            </button>
            <button onClick={() => copyToClipboard(generateEmailHTML())} style={{ flex: 1, background: '#3498db', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Copy HTML for GHL
            </button>
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
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#555', fontSize: 13 }}>
              Google Drive Photo Link
            </label>
            <input
              type="url"
              value={textBlastPhotoLink}
              onChange={(e) => setTextBlastPhotoLink(e.target.value)}
              placeholder="Paste the Google Drive photo link here"
              style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, marginBottom: 15, fontSize: 14 }}
            />
            <div style={{ margin: '-7px 0 15px', color: '#888', fontSize: 12 }}>
              This link is used only in the Text Blast.
            </div>
            <pre style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {generateTextBlast()}
            </pre>
            <button onClick={() => copyToClipboard(generateTextBlast())} style={{ marginTop: 15, width: '100%', background: '#00b894', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Copy Text Blast
            </button>
          </div>

          <div style={{ marginTop: 20 }}>
            <button onClick={() => setPreviewMode(null)} style={{ padding: '12px 24px', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', background: 'white' }}>
              ← Edit
            </button>
          </div>
        </div>
      </div>
    );
  }
}
