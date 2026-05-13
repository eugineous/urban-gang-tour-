// Sections for home page + reusable: About-on-home, Partners, Sponsor, Footer, NewsTicker, BroadcastHome, HostsSpotlight
function AboutSection() {
  const pillars = [
    { n:'01', h:'Urban Pods', p:'Five 30-min mentorship breakouts. Money, digital, leadership, mind, talent. We speak Gen Z, not corporate.' },
    { n:'02', h:'Talent Showcase', p:'Choir, gospel, poetry, drama, rap, dance, comedy, modelling. Students perform with us, not at us.' },
    { n:'03', h:'Tree Planting', p:'With The Green Movement. School scouts take long-term stewardship of every tree.' },
    { n:'04', h:'Broadcast', p:'Every event becomes a full Urban News episode on PPP TV. Winners featured nationally.' },
  ];
  return (
    <section style={{background:'#fff', padding:'90px 36px'}}>
      <div style={{maxWidth:'1200px', margin:'0 auto'}}>
        <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#C7238E'}}>What happens on tour</div>
        <h2 style={{fontFamily:'Anton', fontSize:'84px', color:'#1A1A1A', margin:'10px 0 40px', letterSpacing:'-0.02em', textTransform:'uppercase', lineHeight:.95}}>
          5 AM to 5:30 PM.<br/><span style={{color:'#C7238E'}}>One full day.</span> <span style={{backgroundImage:'linear-gradient(transparent 60%, #F5A623 60%, #F5A623 92%, transparent 92%)', padding:'0 .05em'}}>One school.</span>
        </h2>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'20px'}}>
          {pillars.map(p=>(
            <div key={p.n} style={{background:'#FDF0F7', border:'3px solid #1A1A1A', borderRadius:'18px', padding:'22px', boxShadow:'6px 6px 0 #C7238E'}}>
              <div style={{fontFamily:'Anton', fontSize:'44px', color:'#C7238E', lineHeight:1, letterSpacing:'-0.02em'}}>{p.n}</div>
              <div style={{height:'6px', background:'#1A1A1A', width:'40px', margin:'8px 0 14px'}}/>
              <div style={{fontFamily:'Archivo Black, sans-serif', fontSize:'20px', color:'#1A1A1A', textTransform:'uppercase', lineHeight:1.1}}>{p.h}</div>
              <p style={{fontFamily:'Inter', fontSize:'14px', color:'#3A3A3A', lineHeight:1.55, marginTop:'10px'}}>{p.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HostsSpotlight({ onMeetCrew }) {
  return (
    <section style={{background:'#FDF0F7', padding:'90px 36px', borderTop:'3px solid #1A1A1A', borderBottom:'3px solid #1A1A1A'}}>
      <div style={{maxWidth:'1200px', margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:'50px', alignItems:'center'}}>
        <div style={{position:'relative', height:'460px'}}>
          <img src="../../assets/people/eugine-lucy.jpg" alt="Eugine & Lucy" style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', objectFit:'cover', border:'3px solid #1A1A1A', borderRadius:'22px', boxShadow:'10px 10px 0 #C7238E'}}/>
          <div style={{position:'absolute', top:'-16px', left:'-16px', background:'#F5A623', border:'3px solid #1A1A1A', borderRadius:'10px', padding:'8px 14px', fontFamily:'Archivo Black, sans-serif', fontSize:'14px', textTransform:'uppercase', transform:'rotate(-4deg)'}}>On camera · Urban News</div>
        </div>
        <div>
          <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#C7238E'}}>Your hosts</div>
          <h2 style={{fontFamily:'Anton', fontSize:'76px', color:'#1A1A1A', margin:'10px 0 18px', letterSpacing:'-0.02em', textTransform:'uppercase', lineHeight:.95}}>
            Eugine & Lucy.<br/>The <span style={{color:'#C7238E'}}>voice</span> of the tour.
          </h2>
          <p style={{fontFamily:'Inter', fontSize:'17px', color:'#3A3A3A', lineHeight:1.55, marginBottom:'18px'}}>Eugine Micah is the creative director and lead host; Lucy Ogunde is his co-host and co-director. Together they front every Urban News episode on PPP TV Kenya — reaching up to 8 million viewers — and take the mic on every UGT stage, from 10 AM to 5:30 PM.</p>
          <p style={{fontFamily:'Inter', fontSize:'17px', color:'#3A3A3A', lineHeight:1.55, marginBottom:'26px'}}>When one host is working the stage, the other is shooting TV segments — intro, student interviews, canteen, clubs, principal's office, outro. Eight segments. Every school. One episode.</p>
          <button onClick={onMeetCrew} style={{fontFamily:'Inter', fontWeight:900, fontSize:'14px', letterSpacing:'.1em', textTransform:'uppercase', padding:'16px 26px', border:'3px solid #1A1A1A', borderRadius:'999px', background:'#C7238E', color:'#fff', boxShadow:'6px 6px 0 #1A1A1A', cursor:'pointer'}}>Meet the full crew →</button>
        </div>
      </div>
    </section>
  );
}

function BroadcastHome() {
  return (
    <section style={{background:'#1A1A1A', padding:'80px 36px', color:'#fff', position:'relative', overflow:'hidden'}}>
      <div style={{position:'absolute', top:'20px', right:'-30px', fontFamily:'Anton', fontSize:'200px', color:'#C7238E', opacity:.1, lineHeight:1}}>ON AIR</div>
      <div style={{maxWidth:'1200px', margin:'0 auto', position:'relative', display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:'40px', alignItems:'center'}}>
        <div style={{background:'#fff', border:'3px solid #fff', borderRadius:'24px', padding:'30px', boxShadow:'10px 10px 0 #C7238E'}}>
          <img src="../../assets/logos/urban-news.png" alt="Urban News" style={{width:'100%', maxHeight:'220px', objectFit:'contain'}}/>
        </div>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
            <span style={{width:'10px', height:'10px', borderRadius:'999px', background:'#E53935', boxShadow:'0 0 12px #E53935'}}></span>
            <span style={{fontFamily:'Inter', fontWeight:900, fontSize:'11px', letterSpacing:'.2em', textTransform:'uppercase', color:'#F5A623'}}>Live on PPP TV Kenya</span>
          </div>
          <h2 style={{fontFamily:'Anton', fontSize:'80px', margin:'0 0 16px', letterSpacing:'-0.02em', textTransform:'uppercase', lineHeight:.95}}>
            Urban News.<br/><span style={{color:'#F5A623'}}>Every event.</span><br/><span style={{color:'#C7238E'}}>National TV.</span>
          </h2>
          <p style={{fontFamily:'Inter', fontSize:'17px', color:'#B8B8C0', lineHeight:1.55, maxWidth:'620px'}}>Every UGT tour stop becomes a 25–30 minute Urban News episode on PPP TV Kenya — reaching up to 8 million viewers. Two winners from every school return to the PPP TV studio for a live follow-up interview. That's national exposure, delivered.</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3, auto)', gap:'30px', marginTop:'26px'}}>
            <SmallStat n="8M" l="PPP TV viewers"/>
            <SmallStat n="400K+" l="Urban News daily"/>
            <SmallStat n="25–30m" l="per episode"/>
          </div>
        </div>
      </div>
    </section>
  );
}
function SmallStat({n,l}) {
  return <div><div style={{fontFamily:'Anton', fontSize:'42px', lineHeight:1, color:'#fff'}}>{n}</div><div style={{fontFamily:'Inter', fontWeight:800, fontSize:'11px', letterSpacing:'.14em', textTransform:'uppercase', color:'#F5A623', marginTop:4}}>{l}</div></div>;
}

function NewsTicker({ onMore }) {
  const items = (window.UGT_DATA?.news) || [];
  return (
    <section style={{background:'#fff', padding:'80px 36px', borderTop:'3px solid #1A1A1A'}}>
      <div style={{maxWidth:'1200px', margin:'0 auto'}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:'30px'}}>
          <div>
            <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#C7238E'}}>Latest from the tour</div>
            <h2 style={{fontFamily:'Anton', fontSize:'68px', color:'#1A1A1A', margin:'8px 0 0', letterSpacing:'-0.02em', textTransform:'uppercase', lineHeight:.95}}>News & updates</h2>
          </div>
          <button onClick={onMore} style={{fontFamily:'Inter', fontWeight:900, fontSize:'12px', letterSpacing:'.12em', textTransform:'uppercase', padding:'12px 20px', border:'3px solid #1A1A1A', borderRadius:'999px', background:'#fff', color:'#1A1A1A', boxShadow:'4px 4px 0 #C7238E', cursor:'pointer'}}>All news →</button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'18px'}}>
          {items.map((n,i)=>(
            <article key={i} style={{background:'#FDF0F7', border:'3px solid #1A1A1A', borderRadius:'16px', padding:'20px', boxShadow:'5px 5px 0 #1A1A1A'}}>
              <div style={{display:'inline-block', fontFamily:'Inter', fontWeight:900, fontSize:'10px', letterSpacing:'.14em', padding:'4px 10px', borderRadius:'999px', background:n.color, color:'#fff', marginBottom:12}}>{n.tag}</div>
              <div style={{fontFamily:'ui-monospace, monospace', fontSize:'11px', color:'#6B6B6B', letterSpacing:'.1em'}}>{n.date}</div>
              <h3 style={{fontFamily:'Archivo Black, sans-serif', fontSize:'18px', color:'#1A1A1A', margin:'8px 0', lineHeight:1.2, textTransform:'uppercase'}}>{n.title}</h3>
              <p style={{fontFamily:'Inter', fontSize:'13px', color:'#3A3A3A', lineHeight:1.55}}>{n.excerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PartnersSection() {
  const partners = (window.UGT_DATA?.partners) || [];
  return (
    <section style={{background:'#1A1A1A', padding:'90px 36px', color:'#fff'}}>
      <div style={{maxWidth:'1200px', margin:'0 auto'}}>
        <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#F5A623'}}>The squad</div>
        <h2 style={{fontFamily:'Anton', fontSize:'72px', margin:'10px 0 40px', letterSpacing:'-0.02em', textTransform:'uppercase', lineHeight:.95}}>
          Partners already <span style={{color:'#C7238E'}}>on board.</span>
        </h2>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'20px'}}>
          {partners.map(p=>(
            <div key={p.name} style={{padding:'24px', border:'3px solid #fff', borderRadius:'18px', background:'#0A0A0A', position:'relative'}}>
              <div style={{width:'14px', height:'14px', borderRadius:'999px', background:p.color, boxShadow:`0 0 20px ${p.color}`, marginBottom:'16px'}}/>
              <div style={{fontFamily:'Archivo Black, sans-serif', fontSize:'22px', textTransform:'uppercase', lineHeight:1.05}}>{p.name}</div>
              <div style={{fontFamily:'Inter', fontWeight:800, fontSize:'11px', color:'#F5A623', marginTop:6, letterSpacing:'.08em', textTransform:'uppercase'}}>{p.role}</div>
              <p style={{fontFamily:'Inter', fontSize:'13px', color:'#B8B8C0', marginTop:'12px', lineHeight:1.55}}>{p.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SponsorSection({ onCta }) {
  const tiers = [
    { emoji:'⭐', name:'Presenting', scope:'Naming rights. First right of refusal on every segment. Opening + closing credits on PPP TV.' },
    { emoji:'🏆', name:'Impact', scope:'Logo on backdrop. Own 2–3 segments or categories. Brand mention on every episode.' },
    { emoji:'💡', name:'Category', scope:'Own one segment or award category. Tagged in all event content. Booth at select events.' },
    { emoji:'🌱', name:'Community', scope:'Products, snacks, seedlings, merch, services. On-stage thank-you and logo recognition.' },
  ];
  return (
    <section style={{background:'#F5A623', padding:'90px 36px'}}>
      <div style={{maxWidth:'1200px', margin:'0 auto'}}>
        <div style={{fontFamily:'Permanent Marker, cursive', fontSize:'28px', color:'#1A1A1A', transform:'rotate(-2deg)'}}>psst — sponsor us!</div>
        <h2 style={{fontFamily:'Anton', fontSize:'88px', color:'#1A1A1A', margin:'10px 0 16px', letterSpacing:'-0.02em', textTransform:'uppercase', lineHeight:.95}}>
          Invest in Kenya's youth. <span style={{color:'#C7238E'}}>Leave a legacy.</span>
        </h2>
        <p style={{fontFamily:'Inter', fontSize:'19px', color:'#1A1A1A', maxWidth:'700px', lineHeight:1.5, marginBottom:'40px'}}>Imagine thousands of students chanting your brand name from a stage. Imagine your logo on a certificate a 16-year-old frames and hangs on their wall. That's what UGT delivers — event after event, school after school.</p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'18px'}}>
          {tiers.map(t=>(
            <div key={t.name} style={{background:'#fff', border:'3px solid #1A1A1A', borderRadius:'18px', padding:'22px', boxShadow:'6px 6px 0 #1A1A1A'}}>
              <div style={{fontSize:'40px', lineHeight:1}}>{t.emoji}</div>
              <div style={{fontFamily:'Archivo Black, sans-serif', fontSize:'22px', textTransform:'uppercase', color:'#C7238E', marginTop:'10px'}}>{t.name}</div>
              <p style={{fontFamily:'Inter', fontSize:'14px', color:'#3A3A3A', lineHeight:1.55, marginTop:'8px'}}>{t.scope}</p>
            </div>
          ))}
        </div>
        <div style={{marginTop:'36px', display:'flex', gap:16}}>
          <button onClick={onCta} style={{fontFamily:'Inter', fontWeight:900, fontSize:'15px', letterSpacing:'.1em', textTransform:'uppercase', padding:'18px 28px', border:'3px solid #1A1A1A', borderRadius:'999px', background:'#1A1A1A', color:'#fff', boxShadow:'6px 6px 0 #C7238E', cursor:'pointer'}}>Start the conversation</button>
        </div>
      </div>
    </section>
  );
}

function Footer({ onNav }) {
  const year = 2026;
  return (
    <footer style={{background:'#0A0A0A', color:'#fff', padding:'60px 36px 30px'}}>
      <div style={{maxWidth:'1200px', margin:'0 auto', display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'36px'}}>
        <div>
          <img src="../../assets/logos/ugt-logo-full.png" alt="" style={{width:'150px', filter:'drop-shadow(0 4px 10px rgba(199,35,142,.4))'}}/>
          <p style={{fontFamily:'Inter', fontSize:'14px', color:'#B8B8C0', marginTop:'16px', lineHeight:1.55}}>From Potential to Purpose. A youth movement shot on national TV.</p>
          <div style={{marginTop:16, fontFamily:'Inter', fontSize:'12px', color:'#6B6B6B'}}>Official merchandise, branded drops, and event wear</div>
        </div>
        <FooterCol h="Programme" l={[['Calendar','schools'],['About','about'],['News','news'],['Apply','apply']]} onNav={onNav}/>
        <FooterCol h="Partners" l={[['Destiny Life Church','about'],['PPP TV Kenya','about'],['The Experience Hub','about'],['The Green Movement','about']]} onNav={onNav}/>
        <FooterCol h="Contact" l={[['euginemicah@gmail.com','contact'],['Nairobi, Kenya','contact'],['Book Your School','apply']]} onNav={onNav}/>
      </div>
      <div style={{maxWidth:'1200px', margin:'40px auto 0', paddingTop:'20px', borderTop:'1.5px dashed #3A3A3A', display:'flex', justifyContent:'space-between', fontFamily:'Inter', fontSize:'12px', color:'#6B6B6B', letterSpacing:'.1em', textTransform:'uppercase'}}>
        <div>© {year} Urban Gang Tour</div>
        <div>From Potential — to Purpose.</div>
      </div>
    </footer>
  );
}
function FooterCol({h,l,onNav}) {
  return (<div>
    <div style={{fontFamily:'Inter', fontWeight:900, fontSize:'11px', letterSpacing:'.14em', textTransform:'uppercase', color:'#F5A623', marginBottom:'14px'}}>{h}</div>
    {l.map(([label,route],i)=>(<div key={i} style={{fontFamily:'Inter', fontSize:'14px', color:'#E8E8ED', marginBottom:'8px', cursor:'pointer'}} onClick={()=>onNav&&onNav(route)}>{label}</div>))}
  </div>);
}

window.AboutSection = AboutSection;
window.PartnersSection = PartnersSection;
window.SponsorSection = SponsorSection;
window.Footer = Footer;
window.HostsSpotlight = HostsSpotlight;
window.BroadcastHome = BroadcastHome;
window.NewsTicker = NewsTicker;
