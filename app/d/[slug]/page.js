'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { isPublicDeal } from '../../../lib/dealRecord.mjs';
import { removeUnexpectedContactActions } from '../../../lib/contactActions.mjs';
const SUPABASE_URL = 'https://wqvfsynpxfwacesvjlmd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L0SuigrNUZpsWC66KSVCOA_EuypYe5i';
const HouseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);
const ChevronLeft = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
const ChevronRight = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);
const CloseIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
export default function DealPage() {
  const params = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const trackedViewRef = useRef('');
  const interestedTrackedRef = useRef(false);
  const contactActionsRef = useRef(null);

  // === SWIPE SUPPORT (NEW) ===
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const heroTouchStartX = useRef(0);
  const heroTouchEndX = useRef(0);
  // === END SWIPE SUPPORT ===

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/deals?slug=eq.${params.slug}&select=*`,
          { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }}
        );
        const data = await response.json();
        const dealData = data?.[0]?.data;
        if (isPublicDeal(dealData)) setDeal(dealData);
      } catch (err) {
        console.error('Error fetching deal:', err);
      }
      setLoading(false);
    };
    if (params.slug) fetchDeal();
  }, [params.slug]);

  const getVisitorId = () => {
    try {
      let visitorId = localStorage.getItem('omd_visitor_id');
      if (!visitorId) {
        visitorId = 'v_' + Math.random().toString(36).slice(2, 14) + Date.now().toString(36);
        localStorage.setItem('omd_visitor_id', visitorId);
      }
      return visitorId;
    } catch (error) {
      return 'anon_' + Math.random().toString(36).slice(2, 10);
    }
  };

  const trackDealEvent = async (eventType) => {
    if (typeof window === 'undefined' || window.location.hostname !== 'deals.offmarketdaily.com') {
      return { tracked: false, skipped: 'non-production' };
    }

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          dealSlug: params.slug,
          eventType,
          visitorId: getVisitorId(),
          referrer: document.referrer || null,
          userAgent: navigator.userAgent || null
        })
      });
      if (!response.ok) throw new Error(`Tracking failed with status ${response.status}.`);
      return response.json();
    } catch (error) {
      console.warn(`OMD ${eventType} tracking failed:`, error);
      return { tracked: false, error: true };
    }
  };

  // Record one page view per mounted deal page. Clicks use the same reliable endpoint.
  useEffect(() => {
    if (!params.slug || !deal) return;
    if (trackedViewRef.current === params.slug) return;
    trackedViewRef.current = params.slug;
    trackDealEvent('view');
  }, [params.slug, deal]);

  // === LEAD CAPTURE POPUP ===
  const [showLeadPopup, setShowLeadPopup] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '' });
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  useEffect(() => {
    if (!params.slug || !deal) return;
    // Keep preview deployments read-only and prevent accidental test leads.
    if (typeof window !== 'undefined' && window.location.hostname !== 'deals.offmarketdaily.com') return;
    // Check if already submitted or dismissed
    try {
      const dismissed = localStorage.getItem('omd_lead_' + params.slug);
      if (dismissed) return;
    } catch (e) {}
    // Wait until the buyer has spent time with the deal and scrolled into the page.
    // This keeps cold-outreach visitors from seeing a form before the deal itself.
    let timerElapsed = false;
    let buyerEngaged = false;
    let popupShown = false;
    const maybeShowPopup = () => {
      if (!timerElapsed || !buyerEngaged || popupShown) return;
      try {
        const dismissed = localStorage.getItem('omd_lead_' + params.slug);
        if (!dismissed) {
          popupShown = true;
          setShowLeadPopup(true);
        }
      } catch (e) {
        popupShown = true;
        setShowLeadPopup(true);
      }
    };
    const handleScroll = () => {
      const availableScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = availableScroll > 0 ? window.scrollY / availableScroll : 0;
      if (scrollProgress >= 0.35) {
        buyerEngaged = true;
        maybeShowPopup();
      }
    };
    const timer = setTimeout(() => {
      timerElapsed = true;
      maybeShowPopup();
    }, 45000);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [params.slug, deal]);

  const submitLead = async () => {
    if (!leadForm.name && !leadForm.email) return;
    try {
      if (typeof window !== 'undefined' && window.location.hostname !== 'deals.offmarketdaily.com') {
        setLeadSubmitted(true);
        return;
      }
      let visitorId = null;
      try { visitorId = localStorage.getItem('omd_visitor_id'); } catch (e) {}
      const response = await fetch(`${SUPABASE_URL}/rest/v1/deal_leads`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          deal_slug: params.slug,
          visitor_id: visitorId,
          name: leadForm.name || null,
          email: leadForm.email || null,
          phone: leadForm.phone || null
        })
      });
      if (!response.ok) throw new Error(`Lead submission failed with status ${response.status}.`);
      if (!interestedTrackedRef.current) {
        interestedTrackedRef.current = true;
        trackDealEvent('interested');
      }
      setLeadSubmitted(true);
      try { localStorage.setItem('omd_lead_' + params.slug, 'submitted'); } catch (e) {}
      setTimeout(() => setShowLeadPopup(false), 2000);
    } catch (e) {
      setShowLeadPopup(false);
    }
  };

  const dismissPopup = () => {
    setShowLeadPopup(false);
    try { localStorage.setItem('omd_lead_' + params.slug, 'dismissed'); } catch (e) {}
  };

  const handleContactClick = async (event, eventType, href) => {
    event.preventDefault();
    await trackDealEvent(eventType);
    window.location.href = href;
  };
  // === END LEAD CAPTURE ===

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen && !galleryOpen) return;
      if (e.key === 'Escape') {
        setLightboxOpen(false);
        setGalleryOpen(false);
      }
      if (e.key === 'ArrowLeft') navigatePhoto(-1);
      if (e.key === 'ArrowRight') navigatePhoto(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, galleryOpen, selectedPhotoIndex, deal]);

  // Keep the locked buyer CTA limited to the two approved phone actions,
  // including when browser software attempts to inject an extra control.
  useEffect(() => {
    const container = contactActionsRef.current;
    if (!container) return;
    const enforceApprovedActions = () => removeUnexpectedContactActions(container);
    enforceApprovedActions();
    const observer = new MutationObserver(enforceApprovedActions);
    observer.observe(container, { childList: true });
    return () => observer.disconnect();
  }, [deal]);

  const formatPrice = (num) => num ? Number(num).toLocaleString() : '';
  const navigatePhoto = (direction) => {
    if (!deal?.photos?.length) return;
    const newIndex = selectedPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < deal.photos.length) {
      setSelectedPhotoIndex(newIndex);
    }
  };
  const openLightbox = (index) => {
    setSelectedPhotoIndex(index);
    setLightboxOpen(true);
  };

  // === SWIPE HANDLERS (NEW) ===
  const handleSwipeEnd = (startX, endX) => {
    const diff = startX - endX;
    const minSwipeDistance = 50;
    if (Math.abs(diff) < minSwipeDistance) return;
    if (diff > 0) {
      // Swiped left → next photo
      navigatePhoto(1);
    } else {
      // Swiped right → previous photo
      navigatePhoto(-1);
    }
  };

  const heroSwipeHandlers = {
    onTouchStart: (e) => { heroTouchStartX.current = e.touches[0].clientX; },
    onTouchEnd: (e) => {
      heroTouchEndX.current = e.changedTouches[0].clientX;
      handleSwipeEnd(heroTouchStartX.current, heroTouchEndX.current);
    }
  };

  const lightboxSwipeHandlers = {
    onTouchStart: (e) => { touchStartX.current = e.touches[0].clientX; },
    onTouchEnd: (e) => {
      touchEndX.current = e.changedTouches[0].clientX;
      handleSwipeEnd(touchStartX.current, touchEndX.current);
    }
  };
  // === END SWIPE HANDLERS ===

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f9fa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #e0e0e0',
            borderTopColor: '#00b894',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#666' }}>Loading deal...</p>
        </div>
      </div>
    );
  }
  if (!deal) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f9fa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <HouseIcon />
          <h2 style={{ margin: '20px 0 10px', color: '#1a1a2e' }}>Deal Not Found</h2>
          <p style={{ color: '#666' }}>This deal may have been removed or the link is incorrect.</p>
        </div>
      </div>
    );
  }
  const photos = deal.photos || [];
  const heroPhoto = photos[selectedPhotoIndex] || photos[0];
  const maxThumbnails = 5;
  const remainingPhotos = photos.length - maxThumbnails;
  const sidePhotoIndexes = [1, 2]
    .map((offset) => (selectedPhotoIndex + offset) % photos.length)
    .filter((index, position, indexes) => index !== selectedPhotoIndex && indexes.indexOf(index) === position);
  return (
    <>
      {/* Main Page */}
      <div style={{
        minHeight: '100vh',
        background: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Full-width listing shell; the photo grid absorbs wide screens without stretching one image. */}
        <div style={{ 
          width: '100%',
          background: 'white',
          minHeight: '100vh'
        }}>
          
          {/* Header */}
          <div style={{
            background: '#1a1a2e',
            color: 'white',
            padding: '15px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <a href="https://offmarketdaily.com" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'white' }}>
              <HouseIcon />
              <span style={{ fontWeight: 700, fontSize: 18 }}>Off Market Daily</span>
            </a>
            <span style={{
              background: '#00b894',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600
            }}>Exclusive Deal</span>
          </div>
          {/* Hero Image Section */}
          {heroPhoto && (
            <div style={{ position: 'relative' }}>
              <div className="deal-hero-grid">
                {/* Main Image - Click to Enlarge, SWIPE to navigate */}
                <div
                  className="deal-hero-main"
                  onClick={() => openLightbox(selectedPhotoIndex)}
                  {...heroSwipeHandlers}
                >
                  <img
                    src={heroPhoto.url}
                    alt={heroPhoto.label || 'Property'}
                    className="deal-hero-image"
                  />
                  {/* Address overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                    padding: '60px 20px 20px'
                  }}>
                    <h1 style={{
                      color: 'white',
                      margin: 0,
                      fontSize: 'clamp(20px, 5vw, 32px)',
                      fontWeight: 700
                    }}>{deal.address}</h1>
                    <p style={{
                      color: 'rgba(255,255,255,0.85)',
                      margin: '5px 0 0',
                      fontSize: 'clamp(14px, 3vw, 18px)'
                    }}>{deal.city}, {deal.state} {deal.zip}</p>
                  </div>
                </div>
                {sidePhotoIndexes.length > 0 && (
                  <div
                    className="deal-hero-side"
                    style={{ gridTemplateRows: `repeat(${sidePhotoIndexes.length}, minmax(0, 1fr))` }}
                  >
                    {sidePhotoIndexes.map((photoIndex) => (
                      <div
                        key={photoIndex}
                        className="deal-hero-tile"
                        onClick={() => openLightbox(photoIndex)}
                      >
                        <img
                          src={photos[photoIndex].url}
                          alt={photos[photoIndex].label || `Property photo ${photoIndex + 1}`}
                          className="deal-hero-image"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {/* Click to enlarge hint */}
                <div style={{
                  position: 'absolute',
                  top: 15,
                  right: 15,
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  {photos.length > 1 ? `View all ${photos.length} photos` : 'Click to enlarge'}
                </div>
              </div>
              {/* Thumbnail Strip */}
              {photos.length > 1 && (
                <div className="deal-thumbnail-strip" style={{
                  display: 'flex',
                  gap: 8,
                  padding: '12px 20px',
                  background: '#1a1a2e',
                  overflowX: 'auto'
                }}>
                  {photos.slice(0, maxThumbnails).map((photo, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedPhotoIndex(i)}
                      style={{
                        flexShrink: 0,
                        width: 80,
                        height: 60,
                        borderRadius: 6,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: selectedPhotoIndex === i ? '3px solid #00b894' : '3px solid transparent',
                        opacity: selectedPhotoIndex === i ? 1 : 0.7,
                        transition: 'all 0.2s'
                      }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.label || `Photo ${i + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  ))}
                  {remainingPhotos > 0 && (
                    <div
                      onClick={() => setGalleryOpen(true)}
                      style={{
                        flexShrink: 0,
                        width: 80,
                        height: 60,
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: 14
                      }}
                    >
                      +{remainingPhotos} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Price Banner */}
          <div className="deal-price-banner" style={{
            background: 'linear-gradient(135deg, #00b894, #00cec9)',
            padding: '24px clamp(22px, 5vw, 48px)',
            color: 'white'
          }}>
            <div style={{
              maxWidth: 760,
              margin: '0 auto',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 12, opacity: 0.9, letterSpacing: 1.5, fontWeight: 700 }}>ASKING PRICE</div>
              <div style={{
                fontSize: 'clamp(42px, 6vw, 60px)',
                lineHeight: 1.05,
                fontWeight: 800,
                marginTop: 6
              }}>${formatPrice(deal.askingPrice)}</div>
              <div className="deal-price-summary" style={{
                marginTop: 14,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 14,
                fontSize: 'clamp(14px, 1.8vw, 18px)',
                fontWeight: 500
              }}>
                <span><span style={{ opacity: 0.84 }}>Estimated ARV:</span> <strong>${formatPrice(deal.arv)}</strong></span>
              </div>
            </div>
          </div>
          {/* Details Section */}
          <div className="deal-details" style={{
            width: '100%',
            padding: 'clamp(20px, 5vw, 40px)'
          }}>
            
            {/* Stats Grid */}
            <div className="deal-stats-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'clamp(10px, 3vw, 20px)',
              marginBottom: 35
            }}>
              {[
                { v: deal.beds, l: 'Beds' },
                { v: deal.baths, l: 'Baths' },
                { v: formatPrice(deal.sqft), l: 'Sq Ft' },
                { v: deal.yearBuilt, l: 'Year Built' }
              ].map((x, i) => (
                <div key={i} style={{
                  textAlign: 'center',
                  padding: 'clamp(12px, 3vw, 20px)',
                  background: '#f8f9fa',
                  borderRadius: 12
                }}>
                  <div style={{
                    fontSize: 'clamp(20px, 5vw, 30px)',
                    fontWeight: 'bold',
                    color: '#1a1a2e'
                  }}>{x.v}</div>
                  <div style={{
                    color: '#666',
                    fontSize: 'clamp(11px, 2.5vw, 14px)'
                  }}>{x.l}</div>
                </div>
              ))}
            </div>
            {/* Deal Terms */}
            <h2 style={{
              color: '#1a1a2e',
              borderBottom: '3px solid #00b894',
              paddingBottom: 12,
              marginBottom: 20,
              fontSize: 'clamp(18px, 4vw, 24px)'
            }}>Deal Terms</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 15,
              marginBottom: 35
            }}>
              {[
                { l: 'Occupancy', v: deal.occupancy || 'TBD' },
                { l: 'Access', v: deal.access || 'Easy Access' },
                { l: 'Close of Escrow', v: deal.coe },
                { l: 'EMD Required', v: '$' + formatPrice(deal.emd) },
                { l: 'HOA', v: deal.hoa || 'N/A' }
              ].map((x, i) => (
                <div key={i} style={{
                  padding: 15,
                  background: '#f8f9fa',
                  borderRadius: 10
                }}>
                  <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>{x.l}</div>
                  <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 15 }}>{x.v}</div>
                </div>
              ))}
            </div>
            {/* Condition Notes */}
            {deal.conditionNotes && (
              <>
                <h2 style={{
                  color: '#1a1a2e',
                  borderBottom: '3px solid #00b894',
                  paddingBottom: 12,
                  marginBottom: 20,
                  fontSize: 'clamp(18px, 4vw, 24px)'
                }}>Property Condition</h2>
                <p style={{
                  color: '#555',
                  lineHeight: 1.8,
                  fontSize: 15,
                  marginBottom: 35
                }}>{deal.conditionNotes}</p>
              </>
            )}
            {/* CTA Section */}
            <div style={{
              textAlign: 'center',
              marginTop: 45,
              padding: 'clamp(25px, 5vw, 40px)',
              background: '#1a1a2e',
              borderRadius: 16
            }}>
              <h2 style={{
                color: 'white',
                margin: '0 0 20px',
                fontSize: 'clamp(20px, 5vw, 28px)'
              }}>Interested in this deal?</h2>
              <div ref={contactActionsRef} data-omd-contact-actions="approved" style={{
                display: 'flex',
                gap: 15,
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <a
                  href={`sms:${deal.phone || '480-266-3864'}`}
                  onClick={(event) => handleContactClick(event, 'text', `sms:${deal.phone || '480-266-3864'}`)}
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, #00b894, #00cec9)',
                    color: 'white',
                    padding: '16px 40px',
                    borderRadius: 30,
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: 17
                  }}
                >
                  📱 Text Now
                </a>
                <a
                  href={`tel:${deal.phone || '480-266-3864'}`}
                  onClick={(event) => handleContactClick(event, 'call', `tel:${deal.phone || '480-266-3864'}`)}
                  style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.15)',
                    color: 'white',
                    padding: '16px 40px',
                    borderRadius: 30,
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: 17,
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}
                >
                  📞 Call
                </a>
              </div>
            </div>
            {/* Full Disclosures */}
            <div style={{
              marginTop: 45,
              padding: 25,
              background: '#f8f9fa',
              borderRadius: 10,
              fontSize: 12,
              color: '#777',
              lineHeight: 1.7
            }}>
              <strong style={{ color: '#555' }}>Disclosures:</strong>
              <p style={{ margin: '10px 0 0' }}>
                Property is being sold as-is, and the buyer is to pay all closing costs. $7,000 Non-Refundable earnest money to be deposited by NOON of the following day or contract will be cancelled. Buyer must close with cash or hard money loan. The buyer is not relying on any representations, whether written or oral, regarding the properties above. Price based on a cash or hard money offer and is net to seller. Buyers to do their own independent due diligence. Buyer must do your own due diligence, evaluation and inspection prior to making an offer. Determining value is the buyer's responsibility. Seller strongly recommends buyers employ an Investment Realtor to help determine value. Any reference to the value of a property by the Seller or any representative of the Seller is an opinion of value. Everyone has a differing opinion on value, cost of construction, materials, quality of workmanship and market speculation. Value is ultimately the buyer's responsibility and they should be diligent in determining market value.
              </p>
              <p style={{ margin: '15px 0 0' }}>
                <strong style={{ color: '#555' }}>REALTORS:</strong> If you are currently working with a client, and wish to receive a commission, please note that the wholesale price does not include your commission. You may want to negotiate a commission with your client separate from the wholesale price or you may adjust the wholesale price upwards to include your commission.
              </p>
              <p style={{ margin: '15px 0 0' }}>
                <strong style={{ color: '#555' }}>WHOLESALERS:</strong> If you'd like to JV on this deal send us a text message, email, or call to let us know you are going to be sharing our deal with your investors.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Lightbox Modal — NOW WITH SWIPE */}
      {lightboxOpen && photos.length > 0 && (
        <div
          onClick={() => setLightboxOpen(false)}
          {...lightboxSwipeHandlers}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 50,
              height: 50,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}
          >
            <CloseIcon />
          </button>
          {/* Photo Counter */}
          <div style={{
            position: 'absolute',
            top: 25,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontSize: 16,
            fontWeight: 500
          }}>
            {selectedPhotoIndex + 1} / {photos.length}
          </div>
          {/* Previous Button */}
          {selectedPhotoIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigatePhoto(-1); }}
              style={{
                position: 'absolute',
                left: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 55,
                height: 55,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <ChevronLeft />
            </button>
          )}
          {/* Main Image */}
          <img
            onClick={(e) => e.stopPropagation()}
            src={photos[selectedPhotoIndex].url}
            alt={photos[selectedPhotoIndex].label || 'Property'}
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: 8
            }}
          />
          {/* Next Button */}
          {selectedPhotoIndex < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigatePhoto(1); }}
              style={{
                position: 'absolute',
                right: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 55,
                height: 55,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <ChevronRight />
            </button>
          )}
          {/* Photo Label */}
          <div style={{
            position: 'absolute',
            bottom: 25,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontSize: 14,
            background: 'rgba(0,0,0,0.5)',
            padding: '8px 16px',
            borderRadius: 20
          }}>
            {photos[selectedPhotoIndex].label || 'Property Photo'}
          </div>
        </div>
      )}
      {/* Full Gallery Modal */}
      {galleryOpen && photos.length > 0 && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.95)',
          zIndex: 1000,
          overflow: 'auto',
          padding: '60px 20px 20px'
        }}>
          {/* Close Button */}
          <button
            onClick={() => setGalleryOpen(false)}
            style={{
              position: 'fixed',
              top: 15,
              right: 15,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 50,
              height: 50,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              zIndex: 1001
            }}
          >
            <CloseIcon />
          </button>
          {/* Gallery Title */}
          <h2 style={{
            color: 'white',
            textAlign: 'center',
            marginBottom: 30,
            fontSize: 24
          }}>All {photos.length} Photos</h2>
          {/* Photo Grid */}
          <div style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 15
          }}>
            {photos.map((photo, i) => (
              <div
                key={i}
                onClick={() => { setGalleryOpen(false); openLightbox(i); }}
                style={{ cursor: 'pointer' }}
              >
                <img
                  src={photo.url}
                  alt={photo.label || `Photo ${i + 1}`}
                  style={{
                    width: '100%',
                    height: 160,
                    objectFit: 'cover',
                    borderRadius: 8
                  }}
                />
                <div style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  marginTop: 6,
                  textAlign: 'center'
                }}>{photo.label || `Photo ${i + 1}`}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === LEAD CAPTURE POPUP === */}
      {showLeadPopup && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={dismissPopup}>
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              width: '90%',
              maxWidth: 440,
              padding: 28,
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'popIn 0.3s ease'
            }}
          >
            {leadSubmitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>You're on the list!</div>
                <div style={{ fontSize: 14, color: '#666', marginTop: 6 }}>We'll reach out if anything changes on this deal.</div>
              </div>
            ) : (
              <>
                <button onClick={dismissPopup} style={{ float: 'right', background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer', padding: '0 4px' }}>×</button>
                <h3 style={{ fontSize: 19, color: '#1a1a2e', margin: '0 0 6px', fontWeight: 700 }}>Want updates on this deal?</h3>
                <p style={{ fontSize: 13, color: '#666', margin: '0 0 18px', lineHeight: 1.5 }}>Get notified if the price drops or terms change. No spam — just this deal.</p>
                <input
                  type="text"
                  placeholder="Your name"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 14, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 14, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }}
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 14, marginBottom: 14, boxSizing: 'border-box', outline: 'none' }}
                />
                <button 
                  onClick={submitLead}
                  style={{ width: '100%', background: '#00b894', color: 'white', border: 'none', padding: '14px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 10 }}
                >
                  Keep Me Updated
                </button>
                <div onClick={dismissPopup} style={{ textAlign: 'center', fontSize: 12, color: '#999', cursor: 'pointer' }}>No thanks, just browsing</div>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        [data-omd-contact-actions="approved"] > :nth-child(n+3) { display: none !important; }
      `}</style>
      {/* === END LEAD CAPTURE POPUP === */}
    </>
  );
}
