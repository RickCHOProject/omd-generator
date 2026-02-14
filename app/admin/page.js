'use client';
import { useEffect, useState } from 'react';

const SUPABASE_URL = 'https://wqvfsynpxfwacesvjlmd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L0SuigrNUZpsWC66KSVCOA_EuypYe5i';

const supaFetch = (path, options = {}) => {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });
};

export default function AdminPage() {
  const [deals, setDeals] = useState([]);
  const [views, setViews] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingDeal, setEditingDeal] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [activeTab, setActiveTab] = useState('deals');
  const [viewDetails, setViewDetails] = useState(null);
  const [viewDetailData, setViewDetailData] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [emailHTML, setEmailHTML] = useState('');

  // Fetch all deals
  useEffect(() => {
    const loadDeals = async () => {
      try {
        const res = await supaFetch('/rest/v1/deals?select=*&order=created_at.desc');
        const data = await res.json();
        setDeals(data || []);
        
        // Fetch view counts for all deals
        const viewRes = await supaFetch('/rest/v1/deal_views?select=deal_slug');
        const viewData = await viewRes.json();
        if (viewData && !viewData.error) {
          const counts = {};
          viewData.forEach(v => {
            counts[v.deal_slug] = (counts[v.deal_slug] || 0) + 1;
          });
          setViews(counts);
        }
      } catch (err) {
        console.error('Error loading deals:', err);
      }
      setLoading(false);
    };
    loadDeals();
  }, []);

  // Fetch detailed views for a specific deal
  const loadViewDetails = async (slug) => {
    setViewDetails(slug);
    try {
      const res = await supaFetch(`/rest/v1/deal_views?deal_slug=eq.${slug}&select=*&order=viewed_at.desc&limit=100`);
      const data = await res.json();
      setViewDetailData(data || []);
    } catch (err) {
      console.error('Error loading view details:', err);
      setViewDetailData([]);
    }
  };

  const startEditing = (deal) => {
    setEditingDeal(deal);
    setEditData({ ...deal.data });
    setSaveMsg('');
    setEmailHTML('');
  };

  const updateField = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const saveDeal = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await supaFetch(`/rest/v1/deals?id=eq.${editingDeal.id}`, {
        method: 'PATCH',
        prefer: 'return=representation',
        body: JSON.stringify({ 
          data: editData,
          updated_at: new Date().toISOString()
        })
      });
      const result = await res.json();
      if (res.ok) {
        setSaveMsg('✅ Deal updated! Same URL, new content.');
        // Update local state
        setDeals(prev => prev.map(d => 
          d.id === editingDeal.id ? { ...d, data: editData } : d
        ));
        setEditingDeal(prev => ({ ...prev, data: editData }));
      } else {
        setSaveMsg('❌ Error saving: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      setSaveMsg('❌ Error: ' + err.message);
    }
    setSaving(false);
  };

  const deleteDeal = async (id) => {
    try {
      const res = await supaFetch(`/rest/v1/deals?id=eq.${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeals(prev => prev.filter(d => d.id !== id));
        setDeleteConfirm(null);
      } else {
        alert('Error deleting deal');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const fmtPrice = (num) => {
    if (!num) return '';
    return Number(num).toLocaleString();
  };

  const generateEmailHTML = (data, slug) => {
    const spread = (Number(data.arv) || 0) - (Number(data.askingPrice) || 0);
    const dealLink = `https://deals.offmarketdaily.com/d/${slug}`;
    return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>New Deal - ${data.city}, ${data.state}</title>
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
              <h1 style="margin:0;font-size:26px;color:#ffffff;font-family:Arial,sans-serif;">New Deal - ${data.city}, ${data.state}</h1>
              <p style="margin:10px 0 0;font-size:16px;color:#cccccc;font-family:Arial,sans-serif;">${data.address}</p>
            </td>
          </tr>
          
          <tr>
            <td align="center" valign="middle" bgcolor="#00b894" style="background-color:#00b894;padding:25px 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="font-size:14px;color:#ffffff;font-family:Arial,sans-serif;">ASKING PRICE</td>
                </tr>
                <tr>
                  <td align="center" style="font-size:42px;font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;padding:5px 0;">$${fmtPrice(data.askingPrice)}</td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:10px;">
                    <table border="0" cellpadding="0" cellspacing="0" bgcolor="#008577" style="background-color:#008577;border-radius:20px;">
                      <tr>
                        <td style="padding:8px 20px;font-size:14px;color:#ffffff;font-family:Arial,sans-serif;">
                          ARV: $${fmtPrice(data.arv)} | Spread: $${fmtPrice(spread)}
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
                  <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-weight:bold;font-family:Arial,sans-serif;">${data.beds}/${data.baths}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #eeeeee;color:#666666;font-family:Arial,sans-serif;">Square Feet</td>
                  <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-weight:bold;font-family:Arial,sans-serif;">${fmtPrice(data.sqft)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #eeeeee;color:#666666;font-family:Arial,sans-serif;">Year Built</td>
                  <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-weight:bold;font-family:Arial,sans-serif;">${data.yearBuilt}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #eeeeee;color:#666666;font-family:Arial,sans-serif;">COE</td>
                  <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-weight:bold;font-family:Arial,sans-serif;">${data.coe}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#666666;font-family:Arial,sans-serif;">EMD</td>
                  <td align="right" style="padding:12px 0;font-weight:bold;font-family:Arial,sans-serif;">$${fmtPrice(data.emd)}</td>
                </tr>
              </table>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td bgcolor="#f8f9fa" style="background-color:#f8f9fa;padding:20px;">
                    <h3 style="margin:0 0 10px;font-size:16px;color:#1a1a2e;font-family:Arial,sans-serif;">Condition Notes</h3>
                    <p style="margin:0;color:#666666;line-height:1.6;font-family:Arial,sans-serif;">${data.conditionNotes || ''}</p>
                  </td>
                </tr>
              </table>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:30px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td bgcolor="#00b894" style="background-color:#00b894;border-radius:30px;padding:14px 40px;" align="center">
                          <a href="${dealLink}" style="text-decoration:none;">
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
              <p style="margin:0;font-size:14px;color:#cccccc;font-family:Arial,sans-serif;">Reply to this email or call/text ${data.phone || '480-266-3864'}</p>
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

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: 'numeric', minute: '2-digit' 
    });
  };

  const getUniqueVisitors = (viewsArr) => {
    const ids = new Set(viewsArr.map(v => v.visitor_id).filter(Boolean));
    return ids.size;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e0e0e0', borderTopColor: '#00b894', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#666' }}>Loading admin...</p>
        </div>
      </div>
    );
  }

  // === VIEW DETAILS PANEL ===
  if (viewDetails) {
    const dealInfo = deals.find(d => d.slug === viewDetails);
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ background: '#1a1a2e', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setViewDetails(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>← Back</button>
            <span style={{ fontWeight: 700, fontSize: 18 }}>View Analytics</span>
          </div>
        </div>
        
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 25, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <h2 style={{ margin: '0 0 5px', color: '#1a1a2e' }}>{dealInfo?.data?.address || viewDetails}</h2>
            <p style={{ color: '#888', margin: 0, fontSize: 14 }}>deals.offmarketdaily.com/d/{viewDetails}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginTop: 20 }}>
              <div style={{ background: '#f0faf7', padding: 20, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#00b894' }}>{viewDetailData.length}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Total Views</div>
              </div>
              <div style={{ background: '#f0faf7', padding: 20, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#00b894' }}>{getUniqueVisitors(viewDetailData)}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Unique Visitors</div>
              </div>
              <div style={{ background: '#f0faf7', padding: 20, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#00b894' }}>
                  {viewDetailData.length > 0 ? (viewDetailData.length / Math.max(getUniqueVisitors(viewDetailData), 1)).toFixed(1) : '0'}
                </div>
                <div style={{ color: '#666', fontSize: 13 }}>Views Per Visitor</div>
              </div>
            </div>
          </div>
          
          {/* Repeat visitors */}
          {(() => {
            const visitorCounts = {};
            viewDetailData.forEach(v => {
              if (v.visitor_id) {
                if (!visitorCounts[v.visitor_id]) visitorCounts[v.visitor_id] = { count: 0, lastSeen: v.viewed_at, referrer: v.referrer, userAgent: v.user_agent };
                visitorCounts[v.visitor_id].count++;
                if (new Date(v.viewed_at) > new Date(visitorCounts[v.visitor_id].lastSeen)) {
                  visitorCounts[v.visitor_id].lastSeen = v.viewed_at;
                }
              }
            });
            const repeats = Object.entries(visitorCounts).filter(([, v]) => v.count > 1).sort((a, b) => b[1].count - a[1].count);
            
            return repeats.length > 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 25, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 15px', color: '#1a1a2e' }}>🔥 Repeat Visitors ({repeats.length})</h3>
                <p style={{ color: '#888', fontSize: 13, margin: '0 0 15px' }}>These people came back multiple times — they're interested.</p>
                {repeats.map(([id, info], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < repeats.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>Visitor {id.substring(0, 12)}...</div>
                      <div style={{ color: '#888', fontSize: 12 }}>
                        Last seen: {formatDate(info.lastSeen)}
                        {info.referrer && ` • From: ${info.referrer.substring(0, 40)}`}
                      </div>
                    </div>
                    <div style={{ background: '#00b894', color: 'white', padding: '4px 12px', borderRadius: 12, fontWeight: 700, fontSize: 14 }}>
                      {info.count}x
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          
          {/* All views log */}
          <div style={{ background: 'white', borderRadius: 12, padding: 25, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 15px', color: '#1a1a2e' }}>Recent Views (Last 100)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontWeight: 600 }}>When</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontWeight: 600 }}>Visitor</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontWeight: 600 }}>Referrer</th>
                  </tr>
                </thead>
                <tbody>
                  {viewDetailData.map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '10px 8px', color: '#333' }}>{formatDate(v.viewed_at)}</td>
                      <td style={{ padding: '10px 8px', color: '#333', fontFamily: 'monospace', fontSize: 11 }}>{(v.visitor_id || 'unknown').substring(0, 16)}</td>
                      <td style={{ padding: '10px 8px', color: '#666' }}>{v.referrer ? v.referrer.substring(0, 50) : 'Direct'}</td>
                    </tr>
                  ))}
                  {viewDetailData.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#888' }}>No views yet. Share the link and check back!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === EDIT PANEL ===
  if (editingDeal) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ background: '#1a1a2e', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setEditingDeal(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>← Back</button>
            <span style={{ fontWeight: 700, fontSize: 18 }}>Edit Deal</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a href={`/d/${editingDeal.slug}`} target="_blank" style={{ color: '#00b894', fontSize: 13, textDecoration: 'none' }}>View Live →</a>
            <button 
              onClick={saveDeal} 
              disabled={saving}
              style={{ background: '#00b894', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
        
        {saveMsg && (
          <div style={{ padding: '12px 20px', background: saveMsg.includes('✅') ? '#e8f5e9' : '#ffebee', textAlign: 'center', fontWeight: 600, fontSize: 14 }}>
            {saveMsg}
          </div>
        )}
        
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 25, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ marginBottom: 15, padding: 12, background: '#f0faf7', borderRadius: 8, fontSize: 13, color: '#666' }}>
              <strong>URL:</strong> deals.offmarketdaily.com/d/{editingDeal.slug} — <em>Editing will NOT change this link</em>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              {[
                { key: 'address', label: 'Address', full: true },
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State' },
                { key: 'zip', label: 'Zip' },
                { key: 'askingPrice', label: 'Asking Price' },
                { key: 'arv', label: 'ARV' },
                { key: 'beds', label: 'Beds' },
                { key: 'baths', label: 'Baths' },
                { key: 'sqft', label: 'Sq Ft' },
                { key: 'yearBuilt', label: 'Year Built' },
                { key: 'occupancy', label: 'Occupancy' },
                { key: 'access', label: 'Access' },
                { key: 'coe', label: 'Close of Escrow' },
                { key: 'emd', label: 'EMD' },
                { key: 'hoa', label: 'HOA' },
                { key: 'phone', label: 'Contact Phone' },
                { key: 'conditionNotes', label: 'Condition Notes', full: true, textarea: true }
              ].map(field => (
                <div key={field.key} style={{ gridColumn: field.full ? '1 / -1' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 5 }}>{field.label}</label>
                  {field.textarea ? (
                    <textarea
                      value={editData[field.key] || ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      rows={4}
                      style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={editData[field.key] || ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    />
                  )}
                </div>
              ))}
            </div>
            
            {/* Photos section — full management */}
            <div style={{ marginTop: 25 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 10 }}>
                Photos ({editData.photos ? editData.photos.length : 0})
              </label>
              
              {editData.photos && editData.photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                  {editData.photos.map((photo, i) => (
                    <div key={i} style={{ position: 'relative', background: '#f8f9fa', borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
                      <img src={photo.url} alt={photo.label || ''} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      <div style={{ padding: '6px 8px' }}>
                        <input
                          type="text"
                          value={photo.label || ''}
                          onChange={(e) => {
                            const updated = [...editData.photos];
                            updated[i] = { ...updated[i], label: e.target.value };
                            updateField('photos', updated);
                          }}
                          placeholder="Label"
                          style={{ width: '100%', padding: 4, border: '1px solid #ddd', borderRadius: 4, fontSize: 11, boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 2, padding: '0 8px 6px' }}>
                        {i > 0 && (
                          <button
                            onClick={() => {
                              const updated = [...editData.photos];
                              [updated[i-1], updated[i]] = [updated[i], updated[i-1]];
                              updateField('photos', updated);
                            }}
                            style={{ flex: 1, padding: '4px', background: '#e8e8e8', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                          >←</button>
                        )}
                        {i < editData.photos.length - 1 && (
                          <button
                            onClick={() => {
                              const updated = [...editData.photos];
                              [updated[i], updated[i+1]] = [updated[i+1], updated[i]];
                              updateField('photos', updated);
                            }}
                            style={{ flex: 1, padding: '4px', background: '#e8e8e8', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                          >→</button>
                        )}
                        <button
                          onClick={() => {
                            const updated = editData.photos.filter((_, idx) => idx !== i);
                            updateField('photos', updated);
                          }}
                          style={{ flex: 1, padding: '4px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload new photos */}
              <div style={{ marginTop: 15 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>Add Photos</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files);
                    if (!files.length) return;
                    
                    setSaveMsg('Uploading photos...');
                    const slug = editingDeal.slug;
                    const existingCount = editData.photos ? editData.photos.length : 0;
                    const newPhotos = [...(editData.photos || [])];
                    
                    for (let i = 0; i < files.length; i++) {
                      const file = files[i];
                      setSaveMsg(`Uploading photo ${i + 1} of ${files.length}...`);
                      
                      // Compress image
                      const compressed = await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement('canvas');
                          const maxW = 1200;
                          let w = img.width, h = img.height;
                          if (w > maxW) { h = h * (maxW / w); w = maxW; }
                          canvas.width = w;
                          canvas.height = h;
                          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                          canvas.toBlob(resolve, 'image/jpeg', 0.8);
                        };
                        img.src = URL.createObjectURL(file);
                      });
                      
                      const idx = existingCount + i;
                      const fileName = `${slug}/${idx}-photo-${Date.now()}.jpg`;
                      
                      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/deal-photos/${fileName}`, {
                        method: 'POST',
                        headers: {
                          'apikey': SUPABASE_ANON_KEY,
                          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                          'Content-Type': 'image/jpeg'
                        },
                        body: compressed
                      });
                      
                      if (res.ok) {
                        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/deal-photos/${fileName}`;
                        newPhotos.push({ url: publicUrl, label: 'Other' });
                      }
                    }
                    
                    updateField('photos', newPhotos);
                    setSaveMsg(`✅ ${files.length} photo(s) uploaded! Click Save Changes to apply.`);
                    e.target.value = '';
                  }}
                  style={{ width: '100%', padding: 12, border: '2px dashed #ddd', borderRadius: 8, cursor: 'pointer', background: '#fafafa' }}
                />
                <p style={{ fontSize: 11, color: '#999', marginTop: 6 }}>Photos are compressed automatically. Click Save Changes after uploading to update the deal.</p>
              </div>
            </div>

            {/* Generate Email HTML */}
            <div style={{ marginTop: 25, borderTop: '2px solid #eee', paddingTop: 20 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 15 }}>
                <button
                  onClick={() => {
                    const html = generateEmailHTML(editData, editingDeal.slug);
                    setEmailHTML(html);
                  }}
                  style={{ background: '#3498db', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                >
                  Generate Email HTML
                </button>
                {emailHTML && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(emailHTML);
                      alert('Email HTML copied to clipboard!');
                    }}
                    style={{ background: '#00b894', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                  >
                    Copy HTML for GHL
                  </button>
                )}
              </div>
              {emailHTML && (
                <div>
                  <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ padding: '8px 12px', background: '#f0f0f0', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #ddd' }}>Email Preview</div>
                    <div dangerouslySetInnerHTML={{ __html: emailHTML }} style={{ maxHeight: 400, overflowY: 'auto' }} />
                  </div>
                  <p style={{ fontSize: 11, color: '#999' }}>This uses the current field values above. Make your edits first, then generate.</p>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: 25, display: 'flex', gap: 10 }}>
              <button 
                onClick={saveDeal} 
                disabled={saving}
                style={{ flex: 1, background: '#00b894', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 16, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                onClick={() => setEditingDeal(null)}
                style={{ padding: '15px 25px', background: 'white', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: '#666' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === DEAL LIST (Main View) ===
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1a1a2e', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span style={{ fontWeight: 700, fontSize: 18 }}>OMD Admin</span>
        </div>
        <a href="/" style={{ color: '#00b894', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>+ Create New Deal</a>
      </div>
      
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 25 }}>
          <div style={{ background: 'white', padding: 20, borderRadius: 12, textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' }}>{deals.length}</div>
            <div style={{ color: '#888', fontSize: 13 }}>Total Deals</div>
          </div>
          <div style={{ background: 'white', padding: 20, borderRadius: 12, textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00b894' }}>{Object.values(views).reduce((a, b) => a + b, 0)}</div>
            <div style={{ color: '#888', fontSize: 13 }}>Total Views</div>
          </div>
          <div style={{ background: 'white', padding: 20, borderRadius: 12, textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#e17055' }}>
              {deals.length > 0 ? Math.round(Object.values(views).reduce((a, b) => a + b, 0) / deals.length) : 0}
            </div>
            <div style={{ color: '#888', fontSize: 13 }}>Avg Views/Deal</div>
          </div>
        </div>
        
        {/* Deals Table */}
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>ADDRESS</th>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>PRICE</th>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>MARKET</th>
                  <th style={{ textAlign: 'center', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>VIEWS</th>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>CREATED</th>
                  <th style={{ textAlign: 'right', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>{deal.data?.address || 'No address'}</div>
                      <div style={{ color: '#aaa', fontSize: 12 }}>{deal.slug}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1a1a2e' }}>
                      ${deal.data?.askingPrice ? Number(deal.data.askingPrice).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#666', fontSize: 14 }}>
                      {deal.data?.city}, {deal.data?.state}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span 
                        onClick={() => loadViewDetails(deal.slug)}
                        style={{ 
                          background: views[deal.slug] ? '#e8f5e9' : '#f5f5f5', 
                          color: views[deal.slug] ? '#00b894' : '#999',
                          padding: '4px 12px', 
                          borderRadius: 12, 
                          fontWeight: 700, 
                          fontSize: 14,
                          cursor: 'pointer'
                        }}
                      >
                        {views[deal.slug] || 0}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#888', fontSize: 13 }}>
                      {formatDate(deal.created_at)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <a
                          href={`/d/${deal.slug}`}
                          target="_blank"
                          style={{ padding: '6px 14px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: 6, color: '#666', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
                        >
                          View
                        </a>
                        <button
                          onClick={() => startEditing(deal)}
                          style={{ padding: '6px 14px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            const url = `https://deals.offmarketdaily.com/d/${deal.slug}`;
                            navigator.clipboard.writeText(url);
                            alert('Link copied!');
                          }}
                          style={{ padding: '6px 14px', background: '#00b894', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        >
                          Copy Link
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(deal)}
                          style={{ padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 20px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px', color: '#1a1a2e' }}>Delete Deal?</h3>
            <p style={{ color: '#666', marginBottom: 8 }}>This will permanently delete:</p>
            <p style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: 20, padding: 12, background: '#f8f9fa', borderRadius: 6 }}>
              {deleteConfirm.data?.address || deleteConfirm.slug}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#666', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => deleteDeal(deleteConfirm.id)} style={{ padding: '10px 20px', background: '#dc2626', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
