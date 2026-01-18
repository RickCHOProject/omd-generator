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

export default function DealPage() {
  const params = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeal = async () => {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/deals?slug=eq.${params.slug}&select=*`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }}
      );
      const data = await response.json();
      if (data?.[0]) setDeal(data[0].data);
      setLoading(false);
    };
    if (params.slug) fetchDeal();
  }, [params.slug]);

  const formatPrice = (num) => num ? Number(num).toLocaleString() : '';

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>Loading...</div>;
  if (!deal) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>Deal not found</div>;

  const spread = (Number(deal.arv) || 0) - (Number(deal.askingPrice) || 0);
  const heroPhoto = deal.photos?.find(p => p.label === 'Exterior - Front') || deal.photos?.[0];

  return (
    <div style={{minHeight:'100vh',background:'#f8f9fa'}}>
      <div style={{maxWidth:900,margin:'0 auto',background:'white'}}>
        <div style={{background:'#1a1a2e',color:'white',padding:'15px 30px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}><HouseIcon/><span style={{fontWeight:700}}>Off Market Daily</span></div>
          <span style={{background:'#00b894',padding:'4px 12px',borderRadius:20,fontSize:12}}>Exclusive Deal</span>
        </div>
        {heroPhoto && <div style={{position:'relative',height:400}}><img src={heroPhoto.url} style={{width:'100%',height:'100%',objectFit:'cover'}}/><div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,0.8))',padding:30}}><h1 style={{color:'white',margin:0}}>{deal.address}</h1><p style={{color:'rgba(255,255,255,0.8)',margin:'5px 0 0'}}>{deal.city}, {deal.state} {deal.zip}</p></div></div>}
        <div style={{background:'linear-gradient(135deg,#00b894,#00cec9)',padding:25,textAlign:'center',color:'white'}}>
          <div style={{fontSize:14,opacity:0.9}}>ASKING PRICE</div>
          <div style={{fontSize:48,fontWeight:'bold'}}>${formatPrice(deal.askingPrice)}</div>
          <div style={{marginTop:10,background:'rgba(255,255,255,0.2)',display:'inline-block',padding:'8px 20px',borderRadius:20}}>ARV: ${formatPrice(deal.arv)} | Spread: ${formatPrice(spread)}</div>
        </div>
        <div style={{padding:30}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20,marginBottom:30}}>
            {[{v:deal.beds,l:'Beds'},{v:deal.baths,l:'Baths'},{v:formatPrice(deal.sqft),l:'Sq Ft'},{v:deal.yearBuilt,l:'Year Built'}].map((x,i)=><div key={i} style={{textAlign:'center',padding:20,background:'#f8f9fa',borderRadius:12}}><div style={{fontSize:28,fontWeight:'bold',color:'#1a1a2e'}}>{x.v}</div><div style={{color:'#666'}}>{x.l}</div></div>)}
          </div>
          <h2 style={{color:'#1a1a2e',borderBottom:'2px solid #00b894',paddingBottom:10}}>Deal Terms</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:15,marginBottom:30}}>
            {[{l:'Occupancy',v:deal.occupancy||'TBD'},{l:'Access',v:deal.access||'Easy Access'},{l:'Close of Escrow',v:deal.coe},{l:'EMD Required',v:'$'+formatPrice(deal.emd)}].map((x,i)=><div key={i} style={{padding:15,background:'#f8f9fa',borderRadius:8}}><div style={{color:'#666',fontSize:14}}>{x.l}</div><div style={{fontWeight:600}}>{x.v}</div></div>)}
          </div>
          <h2 style={{color:'#1a1a2e',borderBottom:'2px solid #00b894',paddingBottom:10}}>Property Condition</h2>
          <p style={{color:'#666',lineHeight:1.8}}>{deal.conditionNotes}</p>
          {deal.photos?.length > 0 && <><h2 style={{color:'#1a1a2e',borderBottom:'2px solid #00b894',paddingBottom:10,marginTop:30}}>Photos</h2><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>{deal.photos.map((p,i)=><div key={i}><img src={p.url} style={{width:'100%',height:150,objectFit:'cover',borderRadius:8}}/><div style={{fontSize:12,color:'#666',marginTop:5}}>{p.label}</div></div>)}</div></>}
          <div style={{textAlign:'center',marginTop:40,padding:30,background:'#1a1a2e',borderRadius:12}}>
            <h2 style={{color:'white',margin:'0 0 15px'}}>Interested?</h2>
            <a href={`sms:${deal.phone||'480-266-3864'}`} style={{display:'inline-block',background:'linear-gradient(135deg,#00b894,#00cec9)',color:'white',padding:'15px 40px',borderRadius:30,textDecoration:'none',fontWeight:'bold',fontSize:18}}>Text Now</a>
          </div>
          <div style={{marginTop:40,padding:20,background:'#f8f9fa',borderRadius:8,fontSize:12,color:'#888'}}><strong>Disclosures:</strong> Property sold as-is. Buyer responsible for due diligence. All figures are estimates. EMD non-refundable after inspection period.</div>
        </div>
      </div>
    </div>
  );
}
