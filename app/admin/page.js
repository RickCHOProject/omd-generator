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
            
            {/* Photos section — read-only for now, shows current photos */}
            {editData.photos && editData.photos.length > 0 && (
              <div style={{ marginTop: 25 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 10 }}>Current Photos ({editData.photos.length})</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                  {editData.photos.map((photo, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={photo.url} alt={photo.label || ''} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }} />
                      <div style={{ fontSize: 10, color: '#888', textAlign: 'center', marginTop: 3 }}>{photo.label || `Photo ${i+1}`}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>To update photos, re-publish the deal from the generator. Photo management coming soon.</p>
              </div>
            )}
            
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
