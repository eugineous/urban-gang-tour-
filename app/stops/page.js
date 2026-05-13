import Link from 'next/link';

export const metadata = {
  title: 'Tour Stops | Urban Gang Tour 2026',
  description: 'The 2026 Urban Gang Tour calendar. Schools, universities, colleges and campuses across Kenya.',
};

export default function StopsPage() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-bg" />
        <div className="page-hero-dots" />
        <div className="container" style={{position:'relative',zIndex:2}}>
          <div className="live-badge reveal" style={{marginBottom:'24px'}}><div className="dot" /> 2026 calendar · booking open</div>
          <h1 className="h-display h-lg reveal reveal-delay-1" style={{color:'var(--ugt-white)',marginBottom:'16px'}}>The calendar is<br /><span style={{color:'var(--ugt-orange)'}}>building.</span><br /><span style={{WebkitTextStroke:'2px var(--ugt-magenta)',color:'transparent'}}>Yours is next.</span></h1>
          <p className="reveal reveal-delay-2" style={{fontSize:'18px',color:'rgba(255,255,255,0.65)',maxWidth:'560px',lineHeight:1.7}}>Three schools locked in Kiambu, with PCEA Gituamba announced soon. Universities and colleges in conversation. If your institution wants in, the line is open.</p>
        </div>
      </section>

      <div className="ticker-wrap">
        <div className="ticker-inner fast">
          {['Koinange Girls - 30 May','Loreto Kiambu - 1 June','Gathirimu Girls - 4 July','Bookings Open','Is Your School Next?'].map((t,i) => (
            <div key={i} className="ticker-item">{t} <span className="ticker-sep">✦</span></div>
          ))}
          {['Koinange Girls - 30 May','Loreto Kiambu - 1 June','Gathirimu Girls - 4 July','Bookings Open','Is Your School Next?'].map((t,i) => (
            <div key={`b${i}`} className="ticker-item">{t} <span className="ticker-sep">✦</span></div>
          ))}
        </div>
      </div>

      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="reveal" style={{marginBottom:'40px'}}>
            <div className="eyebrow">Confirmed stops</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Three schools.<br />Three days that matter.</h2>
          </div>
          <div className="stops-grid reveal reveal-delay-1">
            {[
              {date:'30',month:'May 2026',name:'Senior Chief Koinange Girls',theme:'Find your voice.',location:'Kiambaa, Kiambu County',color:'var(--ugt-magenta)',gallery:'/gallery/koinange'},
              {date:'1',month:'June 2026',name:'Loreto Kiambu Girls High School',theme:'Own your story.',location:'Kiambu Town, Kiambu County',color:'var(--ugt-orange)',gallery:'/gallery/loreto'},
              {date:'4',month:'July 2026',name:'Gathirimu Girls Technical High',theme:'Skill is the superpower.',location:'Githunguri, Kiambu County',color:'var(--ugt-purple)',gallery:'/gallery/gathirimu'},
            ].map(s => (
              <div key={s.name} className="stop-card">
                <div className="stop-card-date-row" style={{background:s.color}}>
                  <div className="stop-card-date">{s.date}</div>
                  <div className="stop-card-month">{s.month}</div>
                </div>
                <div className="stop-card-body">
                  <span className="chip chip-confirmed" style={{alignSelf:'flex-start'}}>Confirmed</span>
                  <div className="stop-card-name ugt-xs-underline">{s.name}</div>
                  <div className="stop-card-theme">{s.theme}</div>
                  <div className="stop-card-location">{s.location}</div>
                  <Link href={s.gallery} className="btn btn-primary btn-sm" style={{alignSelf:'flex-start',marginTop:'auto'}}>Recon gallery</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="reveal" style={{marginBottom:'36px'}}>
            <div className="eyebrow">Coming soon</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>More stops in conversation.</h2>
          </div>
          <div className="grid-2 reveal reveal-delay-1">
            {[
              {name:'PCEA Gituamba Secondary School',location:'Gituamba, Kiambu County',status:'Announced'},
              {name:'TIBS College',location:'Thika, Kiambu County',status:'In conversation'},
              {name:'Hewitt & Bennet College',location:'Nairobi CBD / Buruburu / Thika',status:'In conversation'},
              {name:'Your institution',location:'Anywhere in Kenya',status:'Open'},
            ].map(s => (
              <div key={s.name} style={{background:'var(--ugt-white)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'28px',boxShadow:'var(--shadow-sticker-xs)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
                <div>
                  <div style={{fontFamily:'var(--font-display-alt)',fontSize:'18px',textTransform:'uppercase',color:'var(--ugt-ink)',marginBottom:'6px'}}>{s.name}</div>
                  <div style={{fontSize:'13px',color:'var(--ugt-ink-muted)',fontWeight:600}}>{s.location}</div>
                </div>
                <span className="chip chip-outline">{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div style={{maxWidth:'640px'}} className="reveal">
            <div className="eyebrow" style={{color:'var(--ugt-orange)'}}>Book a stop</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-white)',margin:'12px 0 16px'}}>Is your school<br />or campus next?</h2>
            <p style={{color:'rgba(255,255,255,0.65)',fontSize:'16px',lineHeight:1.7,marginBottom:'32px'}}>Reach out and Eugine and Lucy will lead the conversation personally. Schools, universities, colleges, polytechnics, churches, mega events.</p>
            <Link href="/contact" className="btn btn-magenta btn-lg">Propose a stop</Link>
          </div>
        </div>
      </section>
    </>
  );
}
