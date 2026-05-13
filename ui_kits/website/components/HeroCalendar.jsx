// Hero + Calendar (reads from window.UGT_DATA)
function HeroStage({ onCta, onWatch }) {
  return (
    <section style={heroStyles.wrap}>
      <div style={heroStyles.glow}/>
      <div style={heroStyles.orangeStripe}/>
      <div style={heroStyles.inner}>
        <div style={heroStyles.grid}>
          <div>
            <div style={heroStyles.eyebrow}>★ High School Talent Search · Mentorship · Awards · Concert</div>
            <h1 style={heroStyles.h1}>
              From<br/>
              <span style={{color:'#C7238E'}}>Potential</span><br/>
              <span style={{color:'#F5A623'}}>to Purpose.</span>
            </h1>
            <p style={heroStyles.sub}>Kenya's largest youth tour goes directly into institutions countrywide — to discover talent, nurture dreams, and build a movement. 30+ crew. T-shaped stage. Broadcast to millions on Urban News, PPP TV Kenya.</p>
            <div style={heroStyles.ctas}>
              <button onClick={onCta} style={heroStyles.primaryBtn}>Bring UGT to your school</button>
              <button onClick={onWatch} style={heroStyles.ghostBtn}>Meet the crew ▸</button>
            </div>
            <div style={heroStyles.stats}>
              <Stat n="8M" l="PPP TV viewers"/>
              <Stat n="30+" l="crew on event day"/>
              <Stat n="42" l="stage boards"/>
              <Stat n="3" l="schools this term"/>
            </div>
          </div>
          <div style={heroStyles.hostsCol}>
            <HostsCollage/>
          </div>
        </div>
      </div>
    </section>
  );
}

function HostsCollage() {
  return (
    <div style={{position:'relative', width:'100%', height:'580px'}}>
      {/* Eugine */}
      <div style={{position:'absolute', top:0, right:'30px', width:'260px', height:'330px', background:'#F5A623', border:'3px solid #fff', borderRadius:'20px', boxShadow:'8px 8px 0 #C7238E', overflow:'hidden', transform:'rotate(-4deg)'}}>
        <img src="../../assets/people/eugine-micah.png" alt="Eugine Micah" style={{width:'100%', height:'100%', objectFit:'cover', objectPosition:'top'}}/>
        <div style={{position:'absolute', bottom:'10px', left:'10px', fontFamily:'Permanent Marker, cursive', fontSize:'20px', color:'#1A1A1A', background:'#fff', padding:'4px 10px', borderRadius:'4px', border:'2px solid #1A1A1A'}}>Eugine</div>
      </div>
      {/* Lucy */}
      <div style={{position:'absolute', bottom:'20px', left:'10px', width:'230px', height:'290px', background:'#C7238E', border:'3px solid #fff', borderRadius:'20px', boxShadow:'8px 8px 0 #F5A623', overflow:'hidden', transform:'rotate(5deg)'}}>
        <img src="../../assets/people/lucy-ogunde.jpg" alt="Lucy Ogunde" style={{width:'100%', height:'100%', objectFit:'cover', objectPosition:'top'}}/>
        <div style={{position:'absolute', bottom:'10px', left:'10px', fontFamily:'Permanent Marker, cursive', fontSize:'20px', color:'#1A1A1A', background:'#fff', padding:'4px 10px', borderRadius:'4px', border:'2px solid #1A1A1A'}}>Lucy</div>
      </div>
      {/* Ticket sticker */}
      <div style={{position:'absolute', top:'150px', left:'60px', background:'#fff', border:'3px solid #1A1A1A', borderRadius:'10px', padding:'10px 14px', boxShadow:'5px 5px 0 #1A1A1A', transform:'rotate(-8deg)', fontFamily:'Archivo Black, sans-serif', fontSize:'13px', textTransform:'uppercase', color:'#1A1A1A', zIndex:3}}>
        Your hosts
      </div>
      {/* Star accent */}
      <div style={{position:'absolute', bottom:'60px', right:'40px', fontSize:'80px', color:'#F5A623', fontFamily:'Anton', textShadow:'4px 4px 0 #1A1A1A', transform:'rotate(12deg)'}}>★</div>
    </div>
  );
}

function Stat({n,l}) {
  return (<div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}><div style={{fontFamily:'Anton',fontSize:'48px',lineHeight:1,color:'#fff',letterSpacing:'-0.02em'}}>{n}</div><div style={{fontFamily:'Inter',fontWeight:800,fontSize:'11px',letterSpacing:'.14em',textTransform:'uppercase',color:'#F5A623',marginTop:'4px'}}>{l}</div></div>);
}

const heroStyles = {
  wrap: { position:'relative', background:'#0A0A0A', padding:'70px 36px 100px', overflow:'hidden', borderBottom:'3px solid #1A1A1A' },
  glow: { position:'absolute', inset:0, background:'radial-gradient(ellipse 800px 500px at 30% 0%, rgba(199,35,142,.55) 0%, rgba(10,10,10,0) 60%)', pointerEvents:'none' },
  orangeStripe: { position:'absolute', top:'120px', right:'-60px', width:'200px', height:'80px', background:'#F5A623', transform:'rotate(-8deg)', opacity:.2 },
  inner: { position:'relative', maxWidth:'1280px', margin:'0 auto' },
  grid: { display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:'40px', alignItems:'center' },
  eyebrow: { fontFamily:'Inter, sans-serif', fontWeight:800, fontSize:'13px', letterSpacing:'.18em', textTransform:'uppercase', color:'#F5A623', marginBottom:'22px' },
  h1: { fontFamily:'Anton, sans-serif', fontSize:'140px', lineHeight:0.9, color:'#fff', margin:0, letterSpacing:'-0.02em', textTransform:'uppercase' },
  sub: { fontFamily:'Inter, sans-serif', fontSize:'18px', lineHeight:1.55, color:'#E8E8ED', maxWidth:'580px', marginTop:'26px' },
  ctas: { display:'flex', gap:'14px', marginTop:'28px', flexWrap:'wrap' },
  primaryBtn: { fontFamily:'Inter, sans-serif', fontWeight:900, fontSize:'14px', letterSpacing:'.1em', textTransform:'uppercase', padding:'16px 26px', border:'3px solid #1A1A1A', borderRadius:'999px', background:'#C7238E', color:'#fff', boxShadow:'6px 6px 0 #F5A623', cursor:'pointer' },
  ghostBtn: { fontFamily:'Inter, sans-serif', fontWeight:900, fontSize:'14px', letterSpacing:'.1em', textTransform:'uppercase', padding:'16px 26px', border:'3px solid #fff', borderRadius:'999px', background:'transparent', color:'#fff', cursor:'pointer' },
  stats: { display:'grid', gridTemplateColumns:'repeat(4, auto)', gap:'36px', marginTop:'44px', paddingTop:'28px', borderTop:'1.5px dashed #C7238E' },
  hostsCol: { position:'relative' },
};

function CalendarSection({ onOpenSchool }) {
  const schools = (window.UGT_DATA && window.UGT_DATA.schools) || [];
  const openSlot = { id:null, shortName:'Your school here?', dateShort:'TBD', county:'Nationwide', status:'OPEN', color:'#1A1A1A' };
  const events = [...schools, openSlot];
  return (
    <section style={{background:'#C7238E', padding:'80px 36px', position:'relative', overflow:'hidden'}}>
      <div style={{position:'absolute', inset:0, background:'radial-gradient(ellipse 600px 120px at 20% 30%, rgba(255,255,255,.18), transparent 60%), radial-gradient(ellipse 400px 80px at 80% 70%, rgba(255,255,255,.12), transparent 60%)', pointerEvents:'none'}}/>
      <div style={{position:'relative', maxWidth:'1200px', margin:'0 auto'}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:'40px', flexWrap:'wrap', gap:16}}>
          <div>
            <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#F5A623'}}>The Calendar</div>
            <h2 style={{fontFamily:'Bangers, cursive', fontSize:'72px', color:'#fff', margin:'8px 0 0', letterSpacing:'.03em', lineHeight:.95}}>
              <span style={{color:'#F5A623'}}>2ND TERM</span> CALENDAR
            </h2>
          </div>
          <div style={{fontFamily:'Permanent Marker, cursive', fontSize:'28px', color:'#fff', transform:'rotate(-3deg)'}}>Bookings still open!</div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'18px'}}>
          {events.map((e,i)=>(
            <EventCard key={i} {...e} tilt={i%2?2:-2} onClick={e.id?()=>onOpenSchool(e.id):null}/>
          ))}
        </div>
      </div>
    </section>
  );
}

function EventCard({ id, dateShort, shortName, name, county, status, color, tilt=0, onClick, theme, eventNo }) {
  const isOpen = status==='OPEN';
  const displayName = shortName || name || 'TBA';
  return (
    <div
      onClick={onClick}
      style={{background:'#fff', border:'3px solid #1A1A1A', borderRadius:'18px', padding:'22px', boxShadow:'6px 6px 0 #1A1A1A', transform:`rotate(${tilt}deg)`, position:'relative', cursor:onClick?'pointer':'default', transition:'transform .2s'}}
      onMouseEnter={(e)=>{if(onClick)e.currentTarget.style.transform=`rotate(${tilt}deg) translateY(-4px)`}}
      onMouseLeave={(e)=>{if(onClick)e.currentTarget.style.transform=`rotate(${tilt}deg)`}}
    >
      <div style={{position:'absolute', top:'-10px', right:'20px', width:'64px', height:'20px', background:'rgba(245,166,35,.85)', transform:'rotate(-6deg)', borderRadius:'2px'}}/>
      {eventNo && <div style={{position:'absolute', top:'12px', right:'14px', fontFamily:'Archivo Black', fontSize:'11px', color:'#6B6B6B', letterSpacing:'.14em'}}>#{eventNo}</div>}
      <div style={{fontFamily:'Permanent Marker, cursive', fontSize:'32px', color:'#1A1A1A', lineHeight:1, marginBottom:'6px'}}>{dateShort}</div>
      <div style={{height:'8px', background:'#F5A623', width:'60%', marginBottom:'14px', borderRadius:'2px'}}/>
      <div style={{fontFamily:'Anton, sans-serif', fontSize:'22px', textTransform:'uppercase', color:'#1A1A1A', lineHeight:1.05, letterSpacing:'-0.01em', minHeight:'46px'}}>{displayName}</div>
      <div style={{fontFamily:'Inter', fontWeight:700, fontSize:'12px', color:'#6B6B6B', marginTop:'6px'}}>{county}, Kenya</div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'14px'}}>
        <div style={{fontFamily:'Inter', fontWeight:900, fontSize:'11px', letterSpacing:'.14em', padding:'6px 12px', borderRadius:'999px', background: isOpen?'#F5A623':color, color: isOpen?'#1A1A1A':'#fff', border:'2px solid #1A1A1A'}}>{status}</div>
        {onClick && <div style={{fontFamily:'Inter', fontWeight:900, fontSize:'11px', letterSpacing:'.14em', color:'#C7238E'}}>VIEW →</div>}
      </div>
    </div>
  );
}

window.HeroStage = HeroStage;
window.CalendarSection = CalendarSection;
window.EventCard = EventCard;
