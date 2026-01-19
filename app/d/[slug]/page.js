'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  useEffect(() => {
    const fetchDeal = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/deals?slug=eq.${params.slug}&select=*`,
          { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }}
        );
        const data = await response.json();
        if (data?.[0]) setDeal(data[0].data);
      } catch (err) {
        console.error('Error fetching deal:', err);
      }
      setLoading(false);
    };
    if (params.slug) fetchDeal();
  }, [params.slug]);
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
  const spread = (Number(deal.arv) || 0) - (Number(deal.askingPrice) || 0);
  const photos = deal.photos || [];
  const heroPhoto = photos[selectedPhotoIndex] || photos[0];
  const maxThumbnails = 5;
  const remainingPhotos = photos.length - maxThumbnails;
  return (
    <>
      {/* Main Page */}
      <div style={{
        minHeight: '100vh',
        background: '#f8f9fa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Full Width Container */}
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
              {/* Main Image - Click to Enlarge */}
              <div
                onClick={() => openLightbox(selectedPhotoIndex)}
                style={{
                  position: 'relative',
                  width: '100%',
                  paddingTop: '56.25%', /* 16:9 aspect ratio */
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={heroPhoto.url}
                  alt={heroPhoto.label || 'Property'}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
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
                  Click to enlarge
                </div>
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
              {/* Thumbnail Strip */}
              {photos.length > 1 && (
                <div style={{
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
          <div style={{
            background: 'linear-gradient(135deg, #00b894, #00cec9)',
            padding: 'clamp(20px, 5vw, 30px)',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, letterSpacing: 1 }}>ASKING PRICE</div>
            <div style={{
              fontSize: 'clamp(36px, 10vw, 52px)',
              fontWeight: 'bold',
              margin: '5px 0'
            }}>${formatPrice(deal.askingPrice)}</div>
            <div style={{
              marginTop: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'inline-block',
              padding: '10px 24px',
              borderRadius: 25,
              fontSize: 'clamp(13px, 3vw, 15px)',
              fontWeight: 500
            }}>
              ARV: ${formatPrice(deal.arv)} &nbsp;|&nbsp; Spread: ${formatPrice(spread)}
            </div>
          </div>
          {/* Details Section */}
          <div style={{ padding: 'clamp(20px, 5vw, 40px)' }}>
            
            {/* Stats Grid */}
            <div style={{
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
            {/* Photo Grid */}
            {photos.length > 0 && (
              <>
                <h2 style={{
                  color: '#1a1a2e',
                  borderBottom: '3px solid #00b894',
                  paddingBottom: 12,
                  marginBottom: 20,
                  fontSize: 'clamp(18px, 4vw, 24px)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Property Photos</span>
                  {photos.length > 6 && (
                    <button
                      onClick={() => setGalleryOpen(true)}
                      style={{
                        background: '#00b894',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      View All {photos.length} Photos
                    </button>
                  )}
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 12
                }}>
                  {photos.slice(0, 6).map((photo, i) => (
                    <div
                      key={i}
                      onClick={() => openLightbox(i)}
                      style={{ cursor: 'pointer' }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.label || `Photo ${i + 1}`}
                        style={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 8
                        }}
                      />
                      <div style={{
                        fontSize: 12,
                        color: '#666',
                        marginTop: 5,
                        textAlign: 'center'
                      }}>{photo.label}</div>
                    </div>
                  ))}
                </div>
                {photos.length > 6 && (
                  <button
                    onClick={() => setGalleryOpen(true)}
                    style={{
                      width: '100%',
                      marginTop: 15,
                      padding: 15,
                      background: '#f8f9fa',
                      border: '2px dashed #ddd',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#666'
                    }}
                  >
                    + View All {photos.length} Photos
                  </button>
                )}
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
              <div style={{
                display: 'flex',
                gap: 15,
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <a
                  href={`sms:${deal.phone || '480-266-3864'}`}
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
                House is being sold as-is, and the buyer is to pay all closing costs. $7,000 Non-Refundable earnest money to be deposited by NOON of the following day or contract will be cancelled. Buyer must close with cash or hard money loan. The buyer is not relying on any representations, whether written or oral, regarding the properties above. Price based on a cash or hard money offer and is net to seller. Buyers to do their own independent due diligence. Buyer must do your own due diligence, evaluation and inspection prior to making an offer. Determining value is the buyer's responsibility. Seller strongly recommends buyers employ an Investment Realtor to help determine value. Any reference to the value of a property by the Seller or any representative of the Seller is an opinion of value. Everyone has a differing opinion on value, cost of construction, materials, quality of workmanship and market speculation. Value is ultimately the buyer's responsibility and they should be diligent in determining market value.
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
      {/* Lightbox Modal */}
      {lightboxOpen && photos.length > 0 && (
        <div
          onClick={() => setLightboxOpen(false)}
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
    </>
  );
}
