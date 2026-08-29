'use client';
import { useEffect, useState } from 'react';
import { isArchivedDeal, isTrackingOnlyDeal } from '../../lib/dealRecord.mjs';
import { getPublicDealUrl } from '../../lib/dealLinks.mjs';
import { safeHtmlTemplate } from '../../lib/htmlSecurity.mjs';
import { getApprovedPhoneForState, getPhoneChoicesForState, getPrimaryPhoneForState } from '../../lib/contactPhone.mjs';
import { buildMarketingPackage, getMarketingSettings } from '../../lib/marketingPackage.mjs';
import { reorderItems } from '../../lib/photoOrder.mjs';
import SignOutButton from '../../components/SignOutButton';
import TeamAccess from '../../components/TeamAccess';
import styles from './admin.module.css';

export default function AdminPage() {
  const [deals, setDeals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingDeal, setEditingDeal] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [activeTab, setActiveTab] = useState('deals');
  const [viewDetails, setViewDetails] = useState(null);
  const [viewDetailData, setViewDetailData] = useState([]);
  const [viewDetailAnalytics, setViewDetailAnalytics] = useState(null);
  const [engagementEvents, setEngagementEvents] = useState([]);
  const [viewDetailError, setViewDetailError] = useState('');
  const [emailHTML, setEmailHTML] = useState('');
  const [dealLeads, setDealLeads] = useState([]);
  const [leadSummary, setLeadSummary] = useState(null);
  const [buyerSignups, setBuyerSignups] = useState([]);
  const [loadingSignups, setLoadingSignups] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dealFilter, setDealFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [marketingDeal, setMarketingDeal] = useState(null);
  const [marketingSettings, setMarketingSettings] = useState({ textBlastPhotoLink: '', facebookVariantOffset: 0 });
  const [marketingNotice, setMarketingNotice] = useState('');
  const [draggedEditPhotoIndex, setDraggedEditPhotoIndex] = useState(null);

  // Fetch all deals
  useEffect(() => {
    const loadDeals = async () => {
      try {
        const res = await fetch('/api/admin/deals', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Deal request failed.');
        setDeals(data || []);
        
      } catch (err) {
        console.error('Error loading deals:', err);
      }

      try {
        const analyticsRes = await fetch('/api/analytics', { cache: 'no-store' });
        const analyticsData = await analyticsRes.json();
        if (!analyticsRes.ok) throw new Error(analyticsData.error || 'Analytics request failed.');
        setAnalytics(analyticsData);
        setAnalyticsError('');
      } catch (err) {
        console.error('Error loading analytics:', err);
        setAnalytics(null);
        setAnalyticsError('Analytics are unavailable. Counts are hidden instead of showing an incorrect zero.');
      }

      try {
        const leadsRes = await fetch('/api/admin/leads', { cache: 'no-store' });
        const leadsData = await leadsRes.json();
        if (!leadsRes.ok) throw new Error(leadsData.error || 'Lead summary request failed.');
        setLeadSummary(leadsData);
      } catch (err) {
        console.error('Error loading lead summary:', err);
        setLeadSummary(null);
      }
      setLoading(false);
    };
    loadDeals();
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then(setCurrentUser)
      .catch(() => {});
  }, []);

  // Fetch detailed views for a specific deal
  const loadViewDetails = async (slug) => {
    setViewDetails(slug);
    setViewDetailData([]);
    setEngagementEvents([]);
    setDealLeads([]);
    setViewDetailAnalytics(null);
    setViewDetailError('');
    try {
      const res = await fetch(`/api/analytics?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analytics request failed.');
      setViewDetailData(data.pageViews || []);
      setEngagementEvents(data.events || []);
      setViewDetailAnalytics(data.deal || null);
    } catch (err) {
      console.error('Error loading view details:', err);
      setViewDetailData([]);
      setEngagementEvents([]);
      setViewDetailAnalytics(null);
      setViewDetailError('Analytics are unavailable for this deal. No totals have been guessed.');
    }
    // Also fetch leads
    try {
      const res = await fetch(`/api/admin/leads?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lead request failed.');
      setDealLeads(data || []);
    } catch (err) {
      setDealLeads([]);
    }
  };

  // Load buyer signups
  const loadSignups = async () => {
    setLoadingSignups(true);
    try {
      const res = await fetch('/api/admin/buyers', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Buyer request failed.');
      setBuyerSignups(data || []);
    } catch (err) {
      console.error('Error loading signups:', err);
      setBuyerSignups([]);
    }
    setLoadingSignups(false);
  };

  // Export signups to CSV
  const exportCSV = () => {
    if (!buyerSignups.length) return;
    const headers = ['Date', 'Name', 'Email', 'Phone', 'Markets', 'Source'];
    const rows = buyerSignups.map(s => [
      new Date(s.created_at).toLocaleDateString() + ' ' + new Date(s.created_at).toLocaleTimeString(),
      s.name || '',
      s.email || '',
      s.phone || '',
      s.markets || '',
      s.source || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OMD-Buyer-Signups-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startEditing = (deal) => {
    setEditingDeal(deal);
    setEditData({
      ...deal.data,
      phone: getApprovedPhoneForState(deal.data?.state, deal.data?.phone)
    });
    setSaveMsg('');
    setEmailHTML('');
  };

  const openMarketingPackage = (deal) => {
    setMarketingDeal(deal);
    setMarketingSettings(getMarketingSettings(deal.data));
    setMarketingNotice('');
  };

  const updateField = (field, value) => {
    setEditData((current) => {
      if (field !== 'state') return { ...current, [field]: value };
      return {
        ...current,
        state: value,
        phone: getPrimaryPhoneForState(value)
      };
    });
  };

  const saveMarketingSettings = async () => {
    if (!marketingDeal) return;
    setMarketingNotice('Saving package settings...');
    const nextData = {
      ...marketingDeal.data,
      marketing: {
        textBlastPhotoLink: String(marketingSettings.textBlastPhotoLink || '').trim(),
        facebookVariantOffset: Number(marketingSettings.facebookVariantOffset) || 0
      }
    };

    try {
      const response = await fetch('/api/admin/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: marketingDeal.id, data: nextData })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Package settings could not be saved.');
      const savedData = result?.[0]?.data || nextData;
      setMarketingDeal((current) => ({ ...current, data: savedData }));
      setDeals((current) => current.map((deal) => deal.id === marketingDeal.id ? { ...deal, data: savedData } : deal));
      setMarketingNotice('Package settings saved.');
    } catch (error) {
      setMarketingNotice(error.message || 'Package settings could not be saved.');
    }
  };

  const saveDeal = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/admin/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingDeal.id, data: editData })
      });
      const result = await res.json();
      if (res.ok) {
        const savedData = result?.[0]?.data || editData;
        setSaveMsg('✅ Deal updated! Same URL, new content.');
        // Update local state
        setDeals(prev => prev.map(d => 
          d.id === editingDeal.id ? { ...d, data: savedData } : d
        ));
        setEditingDeal(prev => ({ ...prev, data: savedData }));
        setEditData(savedData);
      } else {
        setSaveMsg('❌ Error saving: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      setSaveMsg('❌ Error: ' + err.message);
    }
    setSaving(false);
  };

  const setDealArchived = async (deal, archived) => {
    setSaving(true);
    try {
      const nextData = {
        ...deal.data,
        audit: {
          ...(deal.data?.audit || {}),
          archived,
          archivedAt: archived ? new Date().toISOString() : null,
          archivedBy: archived ? (currentUser?.displayName || currentUser?.email || 'Owner') : null
        }
      };
      const response = await fetch('/api/admin/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deal.id, data: nextData })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The deal could not be updated.');
      setDeals((current) => current.map((item) => item.id === deal.id ? { ...item, data: result[0].data } : item));
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const fmtPrice = (num) => {
    if (!num) return '';
    return Number(num).toLocaleString();
  };

  const generateEmailHTML = (data, slug) => {
    const spread = (Number(data.arv) || 0) - (Number(data.askingPrice) || 0);
    const dealLink = getPublicDealUrl(slug);
    return safeHtmlTemplate`<!DOCTYPE html>
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
              <p style="margin:0;font-size:14px;color:#cccccc;font-family:Arial,sans-serif;">Reply to this email or call/text ${data.phone || getPrimaryPhoneForState(data.state) || '480-685-8477'}</p>
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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleDeals = deals.filter((deal) => {
    const trackingOnly = isTrackingOnlyDeal(deal.data);
    const archived = isArchivedDeal(deal.data);
    if (dealFilter === 'archived') return archived;
    if (archived) return false;
    if (dealFilter === 'live' && trackingOnly) return false;
    if (dealFilter === 'tracking' && !trackingOnly) return false;
    if (!normalizedSearch) return true;
    return [deal.id, deal.slug, deal.data?.address, deal.data?.city, deal.data?.state]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });

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

            {viewDetailError && (
              <div style={{ marginTop: 18, padding: 14, borderRadius: 8, background: '#fff4e5', color: '#8a5a00', fontSize: 13, fontWeight: 600 }}>
                {viewDetailError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 15, marginTop: 20 }}>
              <div style={{ background: '#f0faf7', padding: 20, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#00b894' }}>{viewDetailAnalytics?.views ?? '—'}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Page Views</div>
              </div>
              <div style={{ background: '#f0faf7', padding: 20, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#00b894' }}>{viewDetailAnalytics?.uniqueVisitors ?? '—'}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Est. Visitors</div>
              </div>
              <div style={{ background: '#f0faf7', padding: 20, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#00b894' }}>{viewDetailAnalytics?.viewsPerVisitor ?? '—'}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Views Per Visitor</div>
              </div>
              <div style={{ background: '#eef6ff', padding: 20, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#2878c8' }}>{viewDetailAnalytics?.callClicks ?? '—'}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Call button clicks</div>
              </div>
              <div style={{ background: '#eef6ff', padding: 20, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#2878c8' }}>{viewDetailAnalytics?.textClicks ?? '—'}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Text button clicks</div>
              </div>
              <div style={{ background: '#fff4ec', padding: 20, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#d65f25' }}>{dealLeads.length}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Identified leads</div>
              </div>
            </div>
          </div>

          {/* Identified Leads */}
          {dealLeads.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, padding: 25, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: '2px solid #00b894' }}>
              <h3 style={{ margin: '0 0 5px', color: '#1a1a2e' }}>🎯 Interested Leads ({dealLeads.length})</h3>
              <p style={{ color: '#888', fontSize: 13, margin: '0 0 15px' }}>These people submitted their info from the deal page.</p>
              {dealLeads.map((lead, i) => {
                // Count how many views this lead's visitor_id has
                const viewCount = lead.visitor_id ? viewDetailData.filter(v => v.visitor_id === lead.visitor_id).length : 0;
                const isHot = viewCount >= 3;
                return (
                  <div key={i} style={{ 
                    background: isHot ? '#fff8f0' : '#f8f9fa', 
                    border: isHot ? '1px solid #ff6b6b' : '1px solid #e0e0e0',
                    borderRadius: 10, 
                    padding: 16, 
                    marginBottom: 10 
                  }}>
                    {isHot && (
                      <span style={{ background: '#ff6b6b', color: 'white', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, display: 'inline-block', marginBottom: 8 }}>
                        🔥 HOT — {viewCount} VIEWS
                      </span>
                    )}
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{lead.name || 'No name'}</div>
                    {lead.email && <div style={{ fontSize: 13, color: '#00b894', fontWeight: 600 }}>{lead.email}</div>}
                    {lead.phone && <div style={{ fontSize: 13, color: '#666' }}>{lead.phone}</div>}
                    <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                      Submitted: <strong>{formatDate(lead.created_at)}</strong>
                      {viewCount > 0 && !isHot && ` · ${viewCount} views`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
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
          
          {/* Buyer engagement log */}
          <div style={{ background: 'white', borderRadius: 12, padding: 25, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 5px', color: '#1a1a2e' }}>Buyer Engagement</h3>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 15px' }}>Every Call and Text button click from this deal page.</p>
            <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontWeight: 600 }}>When</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontWeight: 600 }}>Action</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontWeight: 600 }}>Visitor</th>
                  </tr>
                </thead>
                <tbody>
                  {engagementEvents.filter((event) => event.eventType === 'call' || event.eventType === 'text').map((event, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '10px 8px', color: '#333' }}>{formatDate(event.viewed_at)}</td>
                      <td style={{ padding: '10px 8px', color: '#1a1a2e', fontWeight: 700 }}>
                        {event.eventType === 'call' ? 'Call' : 'Text'}
                      </td>
                      <td style={{ padding: '10px 8px', color: '#333', fontFamily: 'monospace', fontSize: 11 }}>{(event.visitor_id || 'unknown').substring(0, 16)}</td>
                    </tr>
                  ))}
                  {engagementEvents.filter((event) => event.eventType === 'call' || event.eventType === 'text').length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#888' }}>No tracked buyer clicks yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complete page-view log */}
          <div style={{ background: 'white', borderRadius: 12, padding: 25, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 5px', color: '#1a1a2e' }}>Recorded Page Views</h3>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 15px' }}>This list is fully paginated and is no longer capped at 100 rows.</p>
            <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
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

  // === REUSABLE MARKETING PACKAGE ===
  if (marketingDeal) {
    const packageOutput = buildMarketingPackage({
      data: marketingDeal.data,
      slug: marketingDeal.slug,
      settings: marketingSettings
    });
    const copyPackageText = async (value, label) => {
      await navigator.clipboard.writeText(value);
      setMarketingNotice(`${label} copied.`);
    };

    return (
      <div style={{ minHeight: '100vh', background: '#f4f6f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ background: '#1a1a2e', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setMarketingDeal(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>← Admin</button>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Marketing Package</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{marketingDeal.data?.address}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const deal = marketingDeal;
              setMarketingDeal(null);
              startEditing(deal);
            }}
            style={{ background: 'white', color: '#1a1a2e', border: 'none', padding: '9px 15px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
          >
            Edit Deal
          </button>
        </div>

        <main style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
          <section style={{ background: 'white', borderRadius: 14, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 16 }}>
            <h1 style={{ color: '#1a1a2e', fontSize: 24, margin: '0 0 6px' }}>{marketingDeal.data?.address}</h1>
            <p style={{ color: '#667085', margin: '0 0 18px', lineHeight: 1.5 }}>
              Return here anytime to copy the live link, Text Blast, Facebook post, or Messenger reply. You do not need to save these in another document.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href={packageOutput.dealUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#f8fafc', color: '#344054', border: '1px solid #d0d5dd', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>View OMD Page</a>
              <button type="button" onClick={() => copyPackageText(packageOutput.dealUrl, 'OMD link')} style={{ padding: '10px 16px', background: '#00b894', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Copy OMD Link</button>
            </div>
          </section>

          <section style={{ background: 'white', borderRadius: 14, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 16 }}>
            <h2 style={{ color: '#1a1a2e', fontSize: 19, margin: '0 0 8px' }}>Saved package settings</h2>
            <p style={{ color: '#667085', fontSize: 13, margin: '0 0 12px' }}>Add the Google Drive photo folder once. OMD will keep it with this deal.</p>
            <label style={{ display: 'block', color: '#344054', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Google Drive photo link</label>
            <input
              type="url"
              value={marketingSettings.textBlastPhotoLink}
              onChange={(event) => {
                setMarketingSettings((current) => ({ ...current, textBlastPhotoLink: event.target.value }));
                setMarketingNotice('Unsaved package changes.');
              }}
              placeholder="https://drive.google.com/drive/folders/..."
              style={{ width: '100%', padding: 11, border: '1px solid #d0d5dd', borderRadius: 8, boxSizing: 'border-box', fontSize: 14 }}
            />
            <button type="button" onClick={saveMarketingSettings} style={{ marginTop: 10, padding: '10px 16px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Save Package Settings</button>
            {marketingNotice && <span style={{ marginLeft: 10, color: marketingNotice.includes('could not') ? '#b42318' : '#116149', fontSize: 13, fontWeight: 600 }}>{marketingNotice}</span>}
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <section style={{ background: 'white', borderRadius: 14, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <h2 style={{ color: '#1a1a2e', fontSize: 19, margin: '0 0 6px' }}>Text Blast</h2>
              <p style={{ color: '#667085', fontSize: 13, margin: '0 0 12px' }}>Ready to copy into GoHighLevel.</p>
              <textarea readOnly value={packageOutput.textBlast} style={{ width: '100%', minHeight: 260, padding: 12, border: '1px solid #d0d5dd', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.55 }} />
              <button type="button" onClick={() => copyPackageText(packageOutput.textBlast, 'Text Blast')} style={{ width: '100%', marginTop: 10, padding: 11, background: '#4b5563', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Copy Text Blast</button>
            </section>

            <section style={{ background: 'white', borderRadius: 14, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <h2 style={{ color: '#1a1a2e', fontSize: 19, margin: '0 0 6px' }}>Facebook Post</h2>
              <p style={{ color: '#667085', fontSize: 13, margin: '0 0 12px' }}>Refresh changes the wording, never the deal facts.</p>
              <textarea readOnly value={packageOutput.facebookPost} style={{ width: '100%', minHeight: 260, padding: 12, border: '1px solid #d0d5dd', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.55 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => copyPackageText(packageOutput.facebookPost, 'Facebook post')} style={{ flex: 1, padding: 11, background: '#1877f2', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Copy Facebook Post</button>
                <button
                  type="button"
                  onClick={() => {
                    setMarketingSettings((current) => ({ ...current, facebookVariantOffset: current.facebookVariantOffset + 1 }));
                    setMarketingNotice('New Facebook variation selected. Save package settings to keep it.');
                  }}
                  style={{ padding: '11px 15px', background: '#eef2f7', color: '#344054', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
                >
                  Refresh
                </button>
              </div>
              <div style={{ borderTop: '1px solid #e4e7ec', marginTop: 20, paddingTop: 18 }}>
                <h3 style={{ color: '#1a1a2e', fontSize: 17, margin: '0 0 6px' }}>Messenger Reply</h3>
                <p style={{ color: '#667085', fontSize: 13, margin: '0 0 12px' }}>Send this privately when someone responds to the Facebook post.</p>
                <textarea readOnly value={packageOutput.messengerReply} style={{ width: '100%', minHeight: 150, padding: 12, border: '1px solid #d0d5dd', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.55 }} />
                <button type="button" onClick={() => copyPackageText(packageOutput.messengerReply, 'Messenger reply')} style={{ width: '100%', marginTop: 10, padding: 11, background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Copy Messenger Reply</button>
              </div>
            </section>
          </div>

          <p style={{ color: '#667085', fontSize: 13, margin: '16px 2px 0' }}>Email HTML remains available under Edit Deal and can be expanded later when email outreach becomes active.</p>
        </main>
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
            {!isTrackingOnlyDeal(editingDeal.data) && (
              <a href={getPublicDealUrl(editingDeal.slug)} target="_blank" rel="noopener noreferrer" style={{ color: '#00b894', fontSize: 13, textDecoration: 'none' }}>View Live →</a>
            )}
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
              <strong>Deal #:</strong> {editingDeal.id}<br />
              {isTrackingOnlyDeal(editingDeal.data) ? (
                <><strong>Status:</strong> Tracking only — no public page or buyer link</>
              ) : (
                <><strong>URL:</strong> deals.offmarketdaily.com/d/{editingDeal.slug} — <em>Editing will NOT change this link</em></>
              )}
              <div className={styles.auditText} style={{ marginTop: 8 }}>
                <strong>Created by:</strong> {editingDeal.data?.audit?.createdBy || 'Not tracked'}
                {editingDeal.data?.audit?.lastUpdatedBy && <><br /><strong>Last updated by:</strong> {editingDeal.data.audit.lastUpdatedBy}</>}
              </div>
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
              ].map((field) => {
                const phoneChoices = field.key === 'phone' ? getPhoneChoicesForState(editData.state) : [];
                return (
                  <div key={field.key} style={{ gridColumn: field.full ? '1 / -1' : 'auto' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 5 }}>{field.key === 'phone' ? 'Contact Phone (controlled selection)' : field.label}</label>
                    {field.textarea ? (
                      <textarea
                        value={editData[field.key] || ''}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        rows={4}
                        style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                    ) : field.key === 'phone' ? (
                      <select
                        value={editData.phone || ''}
                        onChange={(e) => updateField('phone', e.target.value)}
                        style={{ width: '100%', padding: 12, border: '1px solid #00b894', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: 'white' }}
                      >
                        {!editData.phone && <option value="">Choose the approved market number</option>}
                        {phoneChoices.map((choice) => <option key={`${choice.state}-${choice.phone}`} value={choice.phone}>{choice.label}: {choice.phone}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editData[field.key] || ''}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Photos section — full management */}
            <div style={{ marginTop: 25 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 10 }}>
                Photos ({editData.photos ? editData.photos.length : 0})
              </label>
              {editData.photos?.length > 0 && (
                <p style={{ color: '#667085', fontSize: 12, margin: '0 0 10px' }}>Drag cards to reorder. The first photo is the cover. Large buttons also work on phones.</p>
              )}
              
              {editData.photos && editData.photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {editData.photos.map((photo, i) => (
                    <div
                      key={photo.url}
                      draggable
                      onDragStart={() => setDraggedEditPhotoIndex(i)}
                      onDragEnd={() => setDraggedEditPhotoIndex(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedEditPhotoIndex === null) return;
                        updateField('photos', reorderItems(editData.photos, draggedEditPhotoIndex, i));
                        setDraggedEditPhotoIndex(null);
                      }}
                      style={{ position: 'relative', background: i === 0 ? '#eefbf7' : '#f8f9fa', borderRadius: 10, overflow: 'hidden', border: i === 0 ? '2px solid #00b894' : draggedEditPhotoIndex === i ? '2px dashed #667085' : '1px solid #d8dee8', cursor: 'grab' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', color: '#344054', fontSize: 11, fontWeight: 700 }}>
                        <span>{i === 0 ? 'Cover photo' : `Photo ${i + 1}`}</span>
                        <span style={{ color: '#667085' }}>☰ Drag</span>
                      </div>
                      <img src={photo.url} alt={photo.label || ''} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
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
                      <div style={{ display: 'flex', gap: 6, padding: '0 8px 6px' }}>
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => updateField('photos', reorderItems(editData.photos, i, i - 1))}
                          style={{ flex: 1, padding: '8px 4px', background: i === 0 ? '#f2f4f7' : '#e8edf3', color: '#344054', border: 'none', borderRadius: 6, cursor: i === 0 ? 'default' : 'pointer', fontSize: 11, fontWeight: 600 }}
                        >← Earlier</button>
                        <button
                          type="button"
                          disabled={i === editData.photos.length - 1}
                          onClick={() => updateField('photos', reorderItems(editData.photos, i, i + 1))}
                          style={{ flex: 1, padding: '8px 4px', background: i === editData.photos.length - 1 ? '#f2f4f7' : '#e8edf3', color: '#344054', border: 'none', borderRadius: 6, cursor: i === editData.photos.length - 1 ? 'default' : 'pointer', fontSize: 11, fontWeight: 600 }}
                        >Later →</button>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField('photos', editData.photos.filter((_, idx) => idx !== i))}
                        style={{ width: 'calc(100% - 16px)', margin: '0 8px 8px', padding: '8px', background: '#fff1f1', color: '#b42318', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                      >Delete photo</button>
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
                      
                      const res = await fetch(`/api/admin/photos?fileName=${encodeURIComponent(fileName)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'image/jpeg' },
                        body: compressed
                      });
                      
                      if (res.ok) {
                        const result = await res.json();
                        newPhotos.push({ url: result.url, label: 'Other' });
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
    <div className={styles.shell}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div>
            <div className={styles.brandName}>Off Market Daily</div>
            <div className={styles.brandLabel}>Staff admin</div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <a href="/" className={styles.generatorLink}>Create package</a>
          <SignOutButton />
        </div>
      </header>
      
      <main className={styles.content}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Deal operations</p>
            <h1 className={styles.title}>OMD Admin</h1>
            <p className={styles.subtitle}>Create packages, manage deals, and review buyer activity from one clear staff page.</p>
          </div>
          <div className={styles.heroActions}>
            <button type="button" onClick={() => { setActiveTab('signups'); loadSignups(); }} className={styles.secondaryButton}>View buyers</button>
            <a href="/" className={styles.primaryButton}>Create new package</a>
          </div>
        </section>

        {/* Stats bar */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{deals.filter((deal) => !isArchivedDeal(deal.data)).length}</div>
            <div className={styles.statLabel}>Active deals</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${styles.statValueTeal}`}>{analytics?.totals?.views ?? '-'}</div>
            <div className={styles.statLabel}>Page views</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${styles.statValueBlue}`}>{analytics?.totals?.callClicks ?? '-'}</div>
            <div className={styles.statLabel}>Call clicks</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${styles.statValueBlue}`}>{analytics?.totals?.textClicks ?? '-'}</div>
            <div className={styles.statLabel}>Text clicks</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${styles.statValueOrange}`}>{leadSummary?.total ?? '-'}</div>
            <div className={styles.statLabel}>Identified leads</div>
          </div>
        </div>
        <p className={styles.metricNote}>Call and Text are button clicks. Identified leads are buyers who completed the deal-page form.</p>

        {analyticsError && (
          <div style={{ marginBottom: 20, padding: 14, borderRadius: 8, background: '#fff4e5', color: '#8a5a00', fontSize: 13, fontWeight: 600 }}>
            {analyticsError}
          </div>
        )}
        
        <section className={styles.panel}>
        {/* Tab Bar */}
        <div className={styles.tabs}>
          <button 
            onClick={() => setActiveTab('deals')} 
            className={`${styles.tab} ${activeTab === 'deals' ? styles.tabActive : ''}`}
          >
            Deals <span>({deals.length})</span>
          </button>
          <button 
            onClick={() => { setActiveTab('signups'); loadSignups(); }} 
            className={`${styles.tab} ${activeTab === 'signups' ? styles.tabActive : ''}`}
          >
            Buyer Signups
          </button>
          {currentUser?.role === 'owner' && (
            <button
              onClick={() => setActiveTab('team')}
              className={`${styles.tab} ${activeTab === 'team' ? styles.tabActive : ''}`}
            >
              Team Access
            </button>
          )}
        </div>

        {/* Deals Tab */}
        {activeTab === 'deals' && (
        <>
        <div className={styles.toolbar}>
          <input
            className={styles.search}
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search address, city, state, deal number..."
            aria-label="Search deals"
          />
          <div className={styles.filters}>
            {[
              ['all', 'All'],
              ['live', 'Public pages'],
              ['tracking', 'Tracking only'],
              ...(currentUser?.role === 'owner' ? [['archived', 'Archived']] : [])
            ].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setDealFilter(value)} className={`${styles.filter} ${dealFilter === value ? styles.filterActive : ''}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* Deals Table */}
        <div>
          <div className={styles.tableWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>DEAL #</th>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>ADDRESS</th>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>PRICE</th>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>MARKET</th>
                  <th style={{ textAlign: 'center', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>VIEWS</th>
                  <th style={{ textAlign: 'center', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 12 }}>CALL / TEXT / LEADS</th>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>CREATED</th>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>CREATED BY</th>
                  <th style={{ textAlign: 'right', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {visibleDeals.map((deal) => (
                  <tr key={deal.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#00b894', whiteSpace: 'nowrap' }}>
                      #{deal.id}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>{deal.data?.address || 'No address'}</div>
                      <div style={{ color: '#aaa', fontSize: 12 }}>
                        <span className={`${styles.status} ${(isTrackingOnlyDeal(deal.data) || isArchivedDeal(deal.data)) ? styles.statusInternal : ''}`}>
                          {isArchivedDeal(deal.data) ? 'Archived' : isTrackingOnlyDeal(deal.data) ? 'Tracking only' : 'Public page'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1a1a2e' }}>
                      ${deal.data?.askingPrice ? Number(deal.data.askingPrice).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#666', fontSize: 14 }}>
                      {deal.data?.city}, {deal.data?.state}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {isTrackingOnlyDeal(deal.data) ? (
                        <span style={{ color: '#aaa', fontWeight: 600 }}>—</span>
                      ) : (
                        <span
                          onClick={() => loadViewDetails(deal.slug)}
                          style={{
                            background: analytics?.byDeal?.[deal.slug]?.views ? '#e8f5e9' : '#f5f5f5',
                            color: analytics?.byDeal?.[deal.slug]?.views ? '#00b894' : '#999',
                            padding: '4px 12px',
                            borderRadius: 12,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer'
                          }}
                        >
                          {analytics ? (analytics.byDeal?.[deal.slug]?.views || 0) : '—'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {isTrackingOnlyDeal(deal.data) ? (
                        <span style={{ color: '#aaa', fontWeight: 600 }}>—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => loadViewDetails(deal.slug)}
                          title="Call clicks / Text clicks / Identified leads"
                          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', padding: 4 }}
                        >
                          {analytics ? `${analytics.byDeal?.[deal.slug]?.callClicks || 0} / ${analytics.byDeal?.[deal.slug]?.textClicks || 0} / ${leadSummary?.byDeal?.[deal.slug] || 0}` : '—'}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#888', fontSize: 13 }}>
                      {formatDate(deal.created_at)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: '#1a1a2e', fontSize: 13, fontWeight: 600 }}>{deal.data?.audit?.createdBy || 'Not tracked'}</div>
                      {deal.data?.audit?.lastUpdatedBy && deal.data.audit.lastUpdatedBy !== deal.data.audit.createdBy && (
                        <div className={styles.auditText}>Updated by {deal.data.audit.lastUpdatedBy}</div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {!isTrackingOnlyDeal(deal.data) && !isArchivedDeal(deal.data) && (
                          <a
                            href={getPublicDealUrl(deal.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: '6px 14px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: 6, color: '#666', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
                          >
                            View
                          </a>
                        )}
                        <button
                          onClick={() => startEditing(deal)}
                          style={{ padding: '6px 14px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        >
                          Edit
                        </button>
                        {!isTrackingOnlyDeal(deal.data) && (
                          <button
                            onClick={() => openMarketingPackage(deal)}
                            style={{ padding: '6px 14px', background: '#1877f2', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                          >
                            Marketing
                          </button>
                        )}
                        {!isTrackingOnlyDeal(deal.data) && !isArchivedDeal(deal.data) && (
                          <button
                            onClick={() => {
                              const url = getPublicDealUrl(deal.slug);
                              navigator.clipboard.writeText(url);
                              alert('Link copied!');
                            }}
                            style={{ padding: '6px 14px', background: '#00b894', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                          >
                            Copy Link
                          </button>
                        )}
                        {currentUser?.role === 'owner' && (
                          <button
                            onClick={() => setDealArchived(deal, !isArchivedDeal(deal.data))}
                            disabled={saving}
                            style={{ padding: '6px 14px', background: isArchivedDeal(deal.data) ? '#eaf9f5' : '#fff4e5', color: isArchivedDeal(deal.data) ? '#008f73' : '#8a5a00', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                          >
                            {isArchivedDeal(deal.data) ? 'Restore' : 'Archive'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleDeals.length === 0 && <div className={styles.empty}>No deals match this search.</div>}
          </div>
          <div className={styles.mobileList}>
            {visibleDeals.map((deal) => {
              const trackingOnly = isTrackingOnlyDeal(deal.data);
              const dealAnalytics = analytics?.byDeal?.[deal.slug];
              return (
                <article className={styles.mobileCard} key={`mobile-${deal.id}`}>
                  <div className={styles.mobileCardTop}>
                    <div>
                      <div className={styles.mobileDealNumber}>Deal #{deal.id}</div>
                      <div className={styles.mobileAddress}>{deal.data?.address || 'No address'}</div>
                      <div className={styles.mobileMarket}>{deal.data?.city}, {deal.data?.state}</div>
                      <span className={`${styles.status} ${(trackingOnly || isArchivedDeal(deal.data)) ? styles.statusInternal : ''}`}>{isArchivedDeal(deal.data) ? 'Archived' : trackingOnly ? 'Tracking only' : 'Public page'}</span>
                      <div className={styles.auditText} style={{ marginTop: 7 }}>Created by {deal.data?.audit?.createdBy || 'Not tracked'}</div>
                    </div>
                    <div className={styles.mobilePrice}>${deal.data?.askingPrice ? Number(deal.data.askingPrice).toLocaleString() : '-'}</div>
                  </div>

                  <div className={styles.mobileMetrics}>
                    <div>
                      <span className={styles.mobileMetricLabel}>Views</span>
                      <span className={styles.mobileMetricValue}>{trackingOnly ? '-' : (dealAnalytics?.views || 0)}</span>
                    </div>
                    <div>
                      <span className={styles.mobileMetricLabel}>Call / Text / Leads</span>
                      <span className={styles.mobileMetricValue}>{trackingOnly ? '-' : `${dealAnalytics?.callClicks || 0} / ${dealAnalytics?.textClicks || 0} / ${leadSummary?.byDeal?.[deal.slug] || 0}`}</span>
                    </div>
                  </div>

                  <div className={styles.mobileActions}>
                    {!trackingOnly && !isArchivedDeal(deal.data) && <button type="button" onClick={() => loadViewDetails(deal.slug)} className={styles.mobileAction}>Analytics</button>}
                    <button type="button" onClick={() => startEditing(deal)} className={styles.mobileActionPrimary}>Edit</button>
                    {!trackingOnly && <button type="button" onClick={() => openMarketingPackage(deal)} className={styles.mobileActionPrimary}>Marketing</button>}
                    {!trackingOnly && !isArchivedDeal(deal.data) && <a href={getPublicDealUrl(deal.slug)} target="_blank" rel="noopener noreferrer" className={styles.mobileAction}>View page</a>}
                    {!trackingOnly && !isArchivedDeal(deal.data) && (
                      <button type="button" onClick={() => { navigator.clipboard.writeText(getPublicDealUrl(deal.slug)); alert('Link copied!'); }} className={styles.mobileAction}>
                        Copy link
                      </button>
                    )}
                    {currentUser?.role === 'owner' && <button type="button" onClick={() => setDealArchived(deal, !isArchivedDeal(deal.data))} className={styles.mobileActionDanger}>{isArchivedDeal(deal.data) ? 'Restore' : 'Archive'}</button>}
                  </div>
                </article>
              );
            })}
            {visibleDeals.length === 0 && <div className={styles.empty}>No deals match this search.</div>}
          </div>
        </div>
        </>
        )}

        {/* Buyer Signups Tab */}
        {activeTab === 'signups' && (
          <div>
            <div style={{ padding: '16px 20px', borderBottom: '2px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Buyer Signups</span>
                <span style={{ color: '#888', fontSize: 13, marginLeft: 10 }}>({buyerSignups.length} total)</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={loadSignups} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#666' }}>
                  Refresh
                </button>
                <button onClick={exportCSV} disabled={!buyerSignups.length} style={{ padding: '8px 16px', background: '#00b894', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'white', opacity: buyerSignups.length ? 1 : 0.5 }}>
                  Download CSV
                </button>
              </div>
            </div>
            {loadingSignups ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading signups...</div>
            ) : buyerSignups.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>No signups yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>DATE</th>
                      <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>NAME</th>
                      <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>EMAIL</th>
                      <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>PHONE</th>
                      <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>MARKETS</th>
                      <th style={{ textAlign: 'left', padding: '14px 16px', color: '#888', fontWeight: 600, fontSize: 13 }}>SOURCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyerSignups.map((signup) => (
                      <tr key={signup.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '14px 16px', color: '#666', fontSize: 13, whiteSpace: 'nowrap' }}>
                          {new Date(signup.created_at).toLocaleDateString()} {new Date(signup.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>{signup.name || '—'}</td>
                        <td style={{ padding: '14px 16px', color: '#666', fontSize: 14 }}>{signup.email || '—'}</td>
                        <td style={{ padding: '14px 16px', color: '#666', fontSize: 14 }}>{signup.phone || '—'}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13 }}>
                          {signup.markets ? signup.markets.split(', ').map((m, i) => (
                            <span key={i} style={{ display: 'inline-block', background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, marginRight: 4, marginBottom: 2 }}>{m}</span>
                          )) : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#888', fontSize: 12 }}>{signup.source || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {activeTab === 'team' && currentUser?.role === 'owner' && <TeamAccess />}
        </section>
      </main>

    </div>
  );
}
