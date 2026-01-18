'use client';
import { useState, useEffect } from 'react';

const SUPABASE_URL = 'https://wqvfsynpxfwacesvjlmd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_L0SuigrNUZpsWC66KSVCOA_EuypYe5i';

export default function AdminDashboard() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${SUPABASE_URL}/rest/v1/deals?select=*&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch deals');
      
      const data = await response.json();
      setDeals(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDeal = async (id, slug) => {
    try {
      // Delete from database
      const response = await fetch(`${SUPABASE_URL}/rest/v1/deals?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete deal');
      
      // Remove from local state
      setDeals(deals.filter(d => d.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert('Error deleting deal: ' + err.message);
    }
  };

  const copyLink = (slug) => {
    const url = `https://deals.offmarketdaily.com/d/${slug}`;
    navigator.clipboard.writeText(url);
    alert('Link copied!');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return '$' + Number(price).toLocaleString();
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: '#1e3a5f', 
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={{ color: '#fff', fontSize: '20px', fontWeight: '600' }}>OMD Admin</span>
        </div>
        <a 
          href="/"
          style={{
            backgroundColor: '#10b981',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          + New Deal
        </a>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
          Published Deals
        </h1>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          {deals.length} deal{deals.length !== 1 ? 's' : ''} published
        </p>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            Loading deals...
          </div>
        )}

        {error && (
          <div style={{ 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '8px', 
            padding: '16px',
            color: '#dc2626'
          }}>
            Error: {error}
          </div>
        )}

        {!loading && !error && deals.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px', 
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>No deals published yet</p>
            <a 
              href="/"
              style={{
                backgroundColor: '#1e3a5f',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Create Your First Deal
            </a>
          </div>
        )}

        {!loading && !error && deals.length > 0 && (
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Table Header */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1fr 1fr 1fr 180px',
              padding: '14px 20px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: '600',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <div>Address</div>
              <div>Price</div>
              <div>Market</div>
              <div>Created</div>
              <div style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {/* Deal Rows */}
            {deals.map((deal) => {
              const data = deal.data || {};
              const address = data.address || 'No address';
              const city = data.city || '';
              const state = data.state || '';
              const market = [city, state].filter(Boolean).join(', ') || '-';
              const price = data.askingPrice;

              return (
                <div 
                  key={deal.id}
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 180px',
                    padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '2px' }}>
                      {address}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {deal.slug}
                    </div>
                  </div>
                  <div style={{ color: '#1e293b', fontWeight: '500' }}>
                    {formatPrice(price)}
                  </div>
                  <div style={{ color: '#64748b' }}>
                    {market}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '14px' }}>
                    {formatDate(deal.created_at)}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => window.open(`/d/${deal.slug}`, '_blank')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f1f5f9',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#475569',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      title="View deal page"
                    >
                      View
                    </button>
                    <button
                      onClick={() => window.location.href = `/?edit=${deal.slug}`}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#1e3a5f',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      title="Edit deal"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => copyLink(deal.slug)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#10b981',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      title="Copy link"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(deal)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#fee2e2',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#dc2626',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      title="Delete deal"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Delete Deal?</h3>
            <p style={{ color: '#64748b', marginBottom: '8px' }}>
              This will permanently delete:
            </p>
            <p style={{ 
              fontWeight: '500', 
              color: '#1e293b', 
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px'
            }}>
              {deleteConfirm.data?.address || deleteConfirm.slug}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#475569',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDeal(deleteConfirm.id, deleteConfirm.slug)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
