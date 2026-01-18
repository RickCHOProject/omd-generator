'use client';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

function DealPageContent() {
  const searchParams = useSearchParams();
  const [deal, setDeal] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const data = searchParams.get('d');
      if (data) {
        const decoded = JSON.parse(atob(data));
        setDeal(decoded);
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    }
  }, [searchParams]);

  const formatCurrency = (num) => num ? '$' + Number(num).toLocaleString() : '$0';
  const calculateSpread = () => deal ? (Number(deal.arv) || 0) - (Number(deal.askingPrice) || 0) : 0;

  const HouseIcon = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  );

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Deal Not Found</h1>
          <p style={{ color: '#64748b' }}>This deal may have expired or the link is invalid.</p>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24 }}>Loading...</div>
        </div>
      </div>
    );
  }

  const photos = deal.photos || [];

  return (
    <div style={{ background: '#fff', fontFamily: '"DM Sans", sans-serif', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HouseIcon size={22} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#111827', fontFamily: 'Montserrat, sans-serif' }}>OffMarket Daily</span>
        </div>
        <div style={{ background: '#dcfce7', color: '#166534', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>Exclusive Deal</div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40, padding: 40, maxWidth: 1400, margin: '0 auto' }}>
        <div>
          {/* PHOTOS */}
          {photos.length > 0 ? (
            <div style={{ marginBottom: 32 }}>
              <div style={{ width: '100%', height: 420, borderRadius: 16, overflow: 'hidden', marginBottom: 12, position: 'relative', background: '#f1f5f9' }}>
                {photos[activeImg]?.url && (
                  <img src={photos[activeImg].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Property" />
                )}
                <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>{photos[activeImg]?.label || 'Photo'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {photos.map((p, i) => (
                  <img key={i} src={p.url} onClick={() => setActiveImg(i)} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: activeImg === i ? '3px solid #3b82f6' : '3px solid transparent', flexShrink: 0 }} alt="" />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: 400, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 48 }}>🏠</div>
                <div>Photos available upon request</div>
              </div>
            </div>
          )}

          {/* ADDRESS */}
          <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 8, fontFamily: 'Montserrat, sans-serif', color: '#111827' }}>{deal.address || '123 Main St'}</h1>
          <p style={{ fontSize: 18, color: '#6b7280', marginBottom: 28 }}>{deal.city}, {deal.state} {deal.zip}</p>

          {/* STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32, padding: 24, background: '#f8fafc', borderRadius: 16 }}>
            {[
              { l: 'Beds', v: deal.beds },
              { l: 'Baths', v: deal.baths },
              { l: 'Sq Ft', v: deal.sqft ? Number(deal.sqft).toLocaleString() : '-' },
              { l: 'Year', v: deal.yearBuilt }
            ].map(s => (
              <div key={s.l}>
                <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>{s.l}</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>{s.v || '-'}</div>
              </div>
            ))}
          </div>

          {/* CONDITION NOTES */}
          {deal.conditionNotes && (
            <div style={{ padding: 24, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, fontFamily: 'Montserrat, sans-serif' }}>Condition Notes</h3>
              <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.7, margin: 0 }}>{deal.conditionNotes}</p>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div>
          <div style={{ padding: 28, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', borderRadius: 20, marginBottom: 16, boxShadow: '0 8px 30px rgba(30,64,175,0.35)' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontFamily: 'Montserrat, sans-serif' }}>Asking Price</div>
            <div style={{ fontSize: 44, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>{formatCurrency(deal.askingPrice)}</div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.2)', margin: '20px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>ARV</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>{formatCurrency(deal.arv)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>Spread</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#86efac', fontFamily: 'Montserrat, sans-serif' }}>{formatCurrency(calculateSpread())}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: 24, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, fontFamily: 'Montserrat, sans-serif' }}>Deal Terms</h3>
            {[
              { l: 'COE', v: deal.coe ? new Date(deal.coe).toLocaleDateString() : 'TBD' },
              { l: 'EMD', v: deal.emd ? formatCurrency(deal.emd) : 'TBD' },
              { l: 'Occupancy', v: deal.occupancy },
              { l: 'Access', v: deal.access }
            ].map(t => (
              <div key={t.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#64748b', fontSize: 14 }}>{t.l}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{t.v}</span>
              </div>
            ))}
          </div>

          <a href={`sms:${deal.phone?.replace(/\D/g, '')}?body=I'm interested in ${deal.address}`} style={{ display: 'block', width: '100%', padding: '18px 24px', background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 700, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', fontFamily: 'Montserrat, sans-serif', marginBottom: 12 }}>I'm Interested — Text Now</a>
          <a href={`tel:${deal.phone?.replace(/\D/g, '')}`} style={{ display: 'block', textAlign: 'center', color: '#64748b', fontSize: 14, textDecoration: 'none' }}>Or tap to call: <span style={{ fontWeight: 600, color: '#374151' }}>{deal.phone}</span></a>
        </div>
      </div>

      {/* FOOTER WITH DISCLOSURES */}
      <div style={{ padding: '24px 40px', borderTop: '1px solid #e5e7eb', background: '#f8fafc', marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#374151', fontFamily: 'Montserrat, sans-serif' }}>OffMarket Daily</span>
        </div>
      </div>
      <div style={{ padding: '32px 40px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontWeight: 600 }}>Copyright © OffMarket Daily. All rights reserved.</p>
          <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Disclaimer:</p>
          <p style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>House is being sold as-is, and the buyer is to pay all closing costs. {formatCurrency(deal.emd)} Non-Refundable earnest money to be deposited by NOON of the following day or contract will be cancelled. Buyer must close with cash or hard money loan.</p>
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
}

export default function DealPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <DealPageContent />
    </Suspense>
  );
}
