import Link from 'next/link';

export const metadata = {
  title: 'Shop | Urban Gang Merch',
  description: 'Urban Gang Tour merchandise. Tees, caps, hoodies, accessories. Limited drops at every event. Ships countrywide.',
};

const PRODUCTS = [
  {name:'UGT Classic Tee',price:'KES 1,200',desc:'The original. Black on black. Anton font. Heavyweight cotton. Worn by the students who competed for it.',tag:'Best seller'},
  {name:'UGT Cap',price:'KES 800',desc:'Structured 6-panel. Embroidered logo. One size. The cap that was sold out before the queue moved.',tag:'Limited'},
  {name:'UGT Hoodie',price:'KES 2,800',desc:'Heavyweight fleece. Oversized fit. The one piece that sells out at every event before the afternoon session.',tag:'Limited'},
  {name:'UGT Tote Bag',price:'KES 600',desc:'Canvas. Screen printed. Carries your books and your identity at the same time.',tag:null},
  {name:'UGT Sticker Pack',price:'KES 200',desc:'Five stickers. Five reasons to put them everywhere. Waterproof. Permanent.',tag:null},
  {name:'UGT Event Tee',price:'KES 1,000',desc:'Stop-specific edition. Printed with the school name and date. Only available at the event or while stocks last.',tag:'Event exclusive'},
];

export default function ShopPage() {
  return (
    <>
      <section className="page-hero" style={{paddingBottom:'60px'}}>
        <div className="page-hero-bg" />
        <div className="page-hero-dots" />
        <div className="container" style={{position:'relative',zIndex:2}}>
          <div className="live-badge reveal" style={{marginBottom:'24px'}}><div className="dot" /> Urban Gang Merch · BN-6ASYVPW5</div>
          <h1 className="h-display h-lg reveal reveal-delay-1" style={{color:'var(--ugt-white)',marginBottom:'16px'}}>Wear it<br /><span style={{WebkitTextStroke:'2px var(--ugt-white)',color:'transparent'}}>like you</span><br /><span style={{color:'var(--ugt-orange)'}}>mean it.</span></h1>
          <p className="reveal reveal-delay-2" style={{fontSize:'18px',color:'rgba(240,232,255,0.7)',maxWidth:'560px',marginTop:'20px',lineHeight:1.7}}>Everything here is designed and produced by our team. When you wear it, you are repping something real — a movement built in Kenyan schools, shot on PPP TV, and worn by the students who competed for it.</p>
          <div className="reveal reveal-delay-3" style={{display:'flex',alignItems:'center',gap:'16px',marginTop:'28px',flexWrap:'wrap'}}>
            <div style={{background:'rgba(255,122,0,0.12)',border:'1px solid rgba(255,122,0,0.3)',borderRadius:'var(--r-pill)',padding:'10px 20px',fontFamily:'var(--font-stamp)',fontSize:'13px',letterSpacing:'2px',color:'var(--ugt-orange)'}}>LIMITED DROPS</div>
            <div style={{background:'rgba(204,0,119,0.12)',border:'1px solid rgba(204,0,119,0.3)',borderRadius:'var(--r-pill)',padding:'10px 20px',fontFamily:'var(--font-stamp)',fontSize:'13px',letterSpacing:'2px',color:'rgba(255,255,255,0.7)'}}>SHIPS COUNTRYWIDE</div>
            <a href="https://wa.me/254799886247?text=Hi%20-%20I%27d%20like%20to%20order%20Urban%20Gang%20Merch" target="_blank" rel="noopener" style={{background:'#25D366',color:'#fff',borderRadius:'var(--r-pill)',padding:'10px 20px',fontFamily:'var(--font-stamp)',fontSize:'13px',letterSpacing:'2px',textDecoration:'none'}}>ORDER ON WHATSAPP</a>
          </div>
        </div>
      </section>

      <div className="ticker-wrap orange">
        <div className="ticker-inner fast">
          {['Tees','Caps','Hoodies','Tote Bags','Sticker Packs','Event Exclusives','Limited Drops','Ships Countrywide'].map((t,i) => (
            <div key={i} className="ticker-item">{t} <span className="ticker-sep">*</span></div>
          ))}
          {['Tees','Caps','Hoodies','Tote Bags','Sticker Packs','Event Exclusives','Limited Drops','Ships Countrywide'].map((t,i) => (
            <div key={`b${i}`} className="ticker-item">{t} <span className="ticker-sep">*</span></div>
          ))}
        </div>
      </div>

      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="reveal" style={{marginBottom:'40px'}}>
            <div className="eyebrow">The drop</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Current collection.</h2>
            <p style={{color:'var(--ugt-ink-2)',marginTop:'12px',maxWidth:'480px',fontSize:'16px',lineHeight:1.65}}>Most pieces sell out before they ever reach the online store. Order on WhatsApp to guarantee yours.</p>
          </div>
          <div className="grid-3 reveal reveal-delay-1">
            {PRODUCTS.map(p => (
              <div key={p.name} style={{background:'var(--ugt-white)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',overflow:'hidden',boxShadow:'var(--shadow-sticker-xs)',display:'flex',flexDirection:'column'}}>
                <div style={{background:'var(--ugt-magenta-soft)',height:'200px',display:'flex',alignItems:'center',justifyContent:'center',borderBottom:'var(--border-bold)',position:'relative'}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:'48px',color:'var(--ugt-magenta)',opacity:0.15,letterSpacing:'var(--tracking-crunch)',textTransform:'uppercase'}}>UGT</div>
                  {p.tag && <span className="chip chip-magenta" style={{position:'absolute',top:'12px',right:'12px'}}>{p.tag}</span>}
                </div>
                <div style={{padding:'20px 24px 24px',flex:1,display:'flex',flexDirection:'column',gap:'10px'}}>
                  <div style={{fontFamily:'var(--font-display-alt)',fontSize:'18px',textTransform:'uppercase',color:'var(--ugt-ink)'}}>{p.name}</div>
                  <div style={{fontSize:'13px',color:'var(--ugt-ink-2)',lineHeight:1.6,flex:1}}>{p.desc}</div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'8px'}}>
                    <div style={{fontFamily:'var(--font-display)',fontSize:'22px',color:'var(--ugt-ink)',letterSpacing:'var(--tracking-crunch)'}}>{p.price}</div>
                    <a href={`https://wa.me/254799886247?text=Hi%20-%20I%27d%20like%20to%20order%20${encodeURIComponent(p.name)}`} target="_blank" rel="noopener" className="btn btn-magenta btn-sm">Order</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div style={{maxWidth:'640px'}} className="reveal">
            <div className="eyebrow" style={{color:'var(--ugt-orange)'}}>Wholesale & bulk orders</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-white)',margin:'12px 0 16px'}}>Ordering for your school<br />or organisation?</h2>
            <p style={{color:'rgba(255,255,255,0.65)',fontSize:'16px',lineHeight:1.7,marginBottom:'32px'}}>We do bulk orders for schools, campuses, and organisations. Custom prints available. Talk to us on WhatsApp and we will sort it out.</p>
            <a href="https://wa.me/254799886247?text=Hi%20-%20I%27d%20like%20to%20discuss%20a%20bulk%20order" target="_blank" rel="noopener" className="btn btn-magenta btn-lg">WhatsApp for bulk orders</a>
          </div>
        </div>
      </section>
    </>
  );
}
