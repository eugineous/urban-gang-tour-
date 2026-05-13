import Link from 'next/link';

export const metadata = {
  title: 'Events | Urban Gang Tour 2026',
  description: 'All Urban Gang Tour events — schools, universities, colleges, polytechnics, mega events. The full 2026 calendar.',
};

const EVENTS = [
  {date:'30',month:'May 2026',name:'Senior Chief Koinange Girls High School',theme:'Find your voice.',location:'Kiambaa, Kiambu County',status:'Confirmed',color:'var(--ugt-magenta)',gallery:'/gallery/koinange'},
  {date:'1',month:'June 2026',name:'Loreto Kiambu Girls High School',theme:'Own your story.',location:'Kiambu Town, Kiambu County',status:'Confirmed',color:'var(--ugt-orange)',gallery:'/gallery/loreto'},
  {date:'4',month:'July 2026',name:'Gathirimu Girls Technical High School',theme:'Skill is the superpower.',location:'Githunguri, Kiambu County',status:'Confirmed',color:'var(--ugt-purple)',gallery:'/gallery/gathirimu'},
  {date:'TBC',month:'July 2026',name:'PCEA Gituamba Secondary School',theme:'Roots and reach.',location:'Gituamba, Kiambu County',status:'Announced',color:'var(--ugt-green)',gallery:null},
  {date:'TBC',month:'Aug 2026',name:'TIBS College',theme:'Campus edition.',location:'Thika, Kiambu County',status:'In conversation',color:'var(--ugt-ink)',gallery:null},
];

export default function EventsPage() {
  return (
    <>
      <section className="page-hero" style={{paddingBottom:'60px'}}>
        <div className="page-hero-bg" />
        <div className="page-hero-dots" />
        <div className="container" style={{position:'relative',zIndex:2}}>
          <div className="live-badge reveal" style={{marginBottom:'24px'}}><div className="dot" /> 2026 · Booking countrywide</div>
          <h1 className="h-display h-lg reveal reveal-delay-1" style={{color:'var(--ugt-white)',marginBottom:'16px'}}>Every event.<br /><span style={{color:'var(--ugt-orange)'}}>Every stop.</span><br /><span style={{WebkitTextStroke:'2px var(--ugt-magenta)',color:'transparent'}}>All right here.</span></h1>
          <p className="reveal reveal-delay-2" style={{fontSize:'18px',color:'rgba(255,255,255,0.65)',maxWidth:'560px',lineHeight:1.7}}>Schools, universities, colleges, polytechnics, mega events. The full calendar as it builds. If your audience is young and your ambitions are big, we are the right people to call.</p>
        </div>
      </section>

      <div className="ticker-wrap">
        <div className="ticker-inner fast">
          {['Koinange Girls - 30 May','Loreto Kiambu - 1 June','Gathirimu Girls - 4 July','Schools · Universities · Churches · Festivals','Propose an Event'].map((t,i) => (
            <div key={i} className="ticker-item">{t} <span className="ticker-sep">✦</span></div>
          ))}
          {['Koinange Girls - 30 May','Loreto Kiambu - 1 June','Gathirimu Girls - 4 July','Schools · Universities · Churches · Festivals','Propose an Event'].map((t,i) => (
            <div key={`b${i}`} className="ticker-item">{t} <span className="ticker-sep">✦</span></div>
          ))}
        </div>
      </div>

      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="reveal" style={{marginBottom:'40px'}}>
            <div className="eyebrow">2026 calendar</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>The stops so far.</h2>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'20px'}} className="reveal reveal-delay-1">
            {EVENTS.map(ev => (
              <div key={ev.name} style={{background:'var(--ugt-white)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',overflow:'hidden',boxShadow:'var(--shadow-sticker-xs)',display:'grid',gridTemplateColumns:'120px 1fr auto',alignItems:'center'}}>
                <div style={{background:ev.color,padding:'24px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.1) 1px,transparent 1px)',backgroundSize:'14px 14px'}} />
                  <div style={{fontFamily:'var(--font-handwritten)',fontSize:'40px',color:'var(--ugt-white)',lineHeight:1,position:'relative',zIndex:1}}>{ev.date}</div>
                  <div style={{fontFamily:'var(--font-body)',fontSize:'10px',fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.7)',position:'relative',zIndex:1}}>{ev.month}</div>
                </div>
                <div style={{padding:'24px 28px'}}>
                  <span className={`chip ${ev.status==='Confirmed'?'chip-confirmed':'chip-outline'}`} style={{marginBottom:'10px'}}>{ev.status}</span>
                  <div style={{fontFamily:'var(--font-display-alt)',fontSize:'20px',textTransform:'uppercase',color:'var(--ugt-ink)',marginBottom:'6px'}}>{ev.name}</div>
                  <div style={{fontFamily:'var(--font-script)',fontSize:'16px',color:'var(--ugt-magenta)',marginBottom:'6px'}}>{ev.theme}</div>
                  <div style={{fontSize:'13px',color:'var(--ugt-ink-muted)',fontWeight:600}}>{ev.location}</div>
                </div>
                <div style={{padding:'24px'}}>
                  {ev.gallery ? (
                    <Link href={ev.gallery} className="btn btn-primary btn-sm">View gallery</Link>
                  ) : (
                    <Link href="/contact" className="btn btn-outline btn-sm">Propose a stop</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div style={{maxWidth:'640px'}} className="reveal">
            <div className="eyebrow" style={{color:'var(--ugt-orange)'}}>Is your institution next?</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-white)',margin:'12px 0 16px'}}>The calendar is still<br />being written.</h2>
            <p style={{color:'rgba(255,255,255,0.65)',fontSize:'16px',lineHeight:1.7,marginBottom:'32px'}}>Schools, universities, colleges, polytechnics, churches, mega events. If your audience is young and your ambitions are big, reach out and let's talk.</p>
            <Link href="/contact" className="btn btn-magenta btn-lg">Propose a stop</Link>
          </div>
        </div>
      </section>
    </>
  );
}
