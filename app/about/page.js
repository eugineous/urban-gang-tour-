import Link from 'next/link';

export const metadata = {
  title: 'About Urban Gang Tour | Talent, Mentorship & Events | Kenya',
  description: 'Urban Gang Tour is an events company built by Eugine Micah and Lucy Ogunde — talent battles, mentorship, awards and national TV inside Kenyan high schools, universities and campuses.',
};

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-inner">
          <div className="eyebrow" style={{color:'var(--ugt-orange)',marginBottom:'12px'}}>About Urban Gang Tour</div>
          <h1 className="h-display h-lg" style={{color:'var(--ugt-white)',marginBottom:'16px'}}>We are the day<br />students never forget.</h1>
          <p style={{color:'rgba(255,255,255,0.65)',fontSize:'var(--fs-body-lg)',maxWidth:'620px',lineHeight:'var(--lh-loose)'}}>Urban Gang Tour started with a simple question: what happens when you stop telling young people what to do and start giving them a stage? What happens is exactly what you would expect. They rise to it.</p>
        </div>
      </section>

      {/* WHAT IT IS */}
      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="grid-2 reveal">
            <div>
              <div className="eyebrow" style={{marginBottom:'16px'}}>The full picture</div>
              <h2 className="h-display h-md" style={{color:'var(--ugt-ink)',marginBottom:'20px'}}>A movement.<br />Not a show.</h2>
              <p style={{color:'var(--ugt-ink-2)',fontSize:'16px',lineHeight:'1.75',marginBottom:'16px'}}>Built by <strong>Eugine Micah</strong> and <strong>Lucy Ogunde</strong>, Urban Gang Tour is a registered Kenyan events company that produces full-scale talent, mentorship and entertainment programmes for high schools, universities, colleges, and campus communities across the country.</p>
              <p style={{color:'var(--ugt-ink-2)',fontSize:'16px',lineHeight:'1.75',marginBottom:'16px'}}>Every event is broadcast on Urban News on PPP TV Kenya, where the programme has reached up to <strong>8 million viewers nationally</strong>. From Potential to Purpose is not a tagline. It is the lens through which every part of what we do is designed.</p>
              <p style={{color:'var(--ugt-ink-2)',fontSize:'16px',lineHeight:'1.75'}}>Students compete. Working professionals mentor. The crowd sings along. Trees go in the ground. Awards get handed out on stage. Then it all airs on national television. That is the whole brief.</p>
            </div>
            <div>
              <img src="/assets/people/experience-hub-team.jpg" alt="Urban Gang Tour on stage" style={{borderRadius:'var(--r-xl)',border:'var(--border-bold)',boxShadow:'var(--shadow-sticker-ink)',width:'100%'}} />
            </div>
          </div>
        </div>
      </section>

      {/* MISSION + VISION */}
      <section className="section section-soft">
        <div className="container">
          <div className="grid-2 reveal">
            <div style={{background:'var(--ugt-magenta)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'40px',boxShadow:'var(--shadow-sticker-magenta)',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.08) 1px,transparent 1px)',backgroundSize:'18px 18px'}} />
              <div style={{position:'relative',zIndex:1}}>
                <div style={{fontFamily:'var(--font-body)',fontSize:'11px',fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.6)',marginBottom:'12px'}}>Mission</div>
                <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,3vw,32px)',color:'var(--ugt-white)',lineHeight:1.1,letterSpacing:'var(--tracking-crunch)',textTransform:'uppercase',marginBottom:'16px'}}>"Find Kenyan young people with real talent and give them a real stage."</h2>
                <p style={{fontSize:'15px',color:'rgba(255,255,255,0.75)',lineHeight:1.7}}>That is the whole mission. No filler. No participation certificates. A proper platform for real talent, broadcast to millions.</p>
              </div>
            </div>
            <div style={{background:'var(--ugt-white)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'40px',boxShadow:'var(--shadow-sticker-ink)'}}>
              <div style={{fontFamily:'var(--font-body)',fontSize:'11px',fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--ugt-magenta)',marginBottom:'12px'}}>Vision</div>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,3vw,32px)',color:'var(--ugt-ink)',lineHeight:1.1,letterSpacing:'var(--tracking-crunch)',textTransform:'uppercase',marginBottom:'16px'}}>"A Kenya where no talented young person goes unseen."</h2>
              <p style={{fontSize:'15px',color:'var(--ugt-ink-2)',lineHeight:1.7}}>Every county. Every school type. Every talent category. If you have something real, Urban Gang Tour will find you a stage.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER QUOTE */}
      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="reveal" style={{marginBottom:'36px'}}>
            <div className="eyebrow">The story</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Where it started.</h2>
          </div>
          <div className="reveal reveal-delay-1" style={{background:'var(--ugt-white)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'40px',boxShadow:'var(--shadow-sticker-ink)',display:'grid',gridTemplateColumns:'200px 1fr',gap:'32px',alignItems:'start'}}>
            <img src="/assets/people/eugine-micah.png" alt="Eugine Micah" style={{borderRadius:'var(--r-lg)',border:'var(--border-bold)',boxShadow:'var(--shadow-sticker-xs)',width:'200px',aspectRatio:'3/4',objectFit:'cover',objectPosition:'top'}} />
            <div>
              <blockquote style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,3vw,32px)',lineHeight:1.15,letterSpacing:'var(--tracking-crunch)',textTransform:'uppercase',color:'var(--ugt-ink)',marginBottom:'16px'}}><span style={{color:'var(--ugt-magenta)'}}>"</span>What happens when you stop telling young people what to do and start giving them a stage? They rise to it. Every single time.</blockquote>
              <div style={{fontSize:'12px',fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--ugt-ink-muted)'}}>Eugine Micah · Co-Founder &amp; Lead Host · Urban News, PPP TV Kenya</div>
              <p style={{color:'var(--ugt-ink-2)',fontSize:'15px',lineHeight:1.75,marginTop:'20px'}}><strong>Eugine Micah</strong> is the face of Urban News on PPP TV Kenya, a daily programme with a national reach. He designs the format, books the talent, builds the partnerships, and holds the stage with the kind of energy that makes students lean in. <strong>Lucy Ogunde</strong> is the executive producer and co-host — the precision of someone who has thought through every detail and the warmth of someone who genuinely loves being in a room full of young people finding their voice.</p>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="section section-soft">
        <div className="container">
          <div className="reveal" style={{marginBottom:'32px'}}>
            <div className="eyebrow">Values</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>What we stand on.</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'16px'}} className="reveal reveal-delay-1">
            {[
              {word:'Authenticity',desc:'No performance for performance sake. We keep it real in every room.'},
              {word:'Energy',desc:'We show up fully charged. Every event. Every crew member. Every time.'},
              {word:'Impact',desc:'Every stop should change something in a student, a school, a community.'},
              {word:'Accountability',desc:'We deliver what we promise. We show up on time and we do the work.'},
              {word:'Culture',desc:'Rooted in Kenyan youth culture. We do not import a vibe. We are the vibe.'},
            ].map(v => (
              <div key={v.word} style={{background:'var(--ugt-white)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'24px 18px',textAlign:'center',boxShadow:'var(--shadow-sticker-xs)'}}>
                <span style={{fontFamily:'var(--font-display)',fontSize:'18px',color:'var(--ugt-magenta)',letterSpacing:'var(--tracking-crunch)',textTransform:'uppercase',display:'block',marginBottom:'8px'}}>{v.word}</span>
                <div style={{fontSize:'13px',color:'var(--ugt-ink-2)',lineHeight:1.55}}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="reveal" style={{marginBottom:'32px'}}>
            <div className="eyebrow">Timeline</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Where we have been.<br />Where we are going.</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:0,border:'var(--border-bold)',borderRadius:'var(--r-xl)',overflow:'hidden',boxShadow:'var(--shadow-sticker-ink)'}} className="reveal reveal-delay-1">
            {[
              {year:'2025',event:'Founded',detail:'Eugine Micah and Lucy Ogunde launch Urban Gang Tour. The idea becomes a movement.'},
              {year:'2026 · Term 1',event:'On PPP TV',detail:'First school visits. Urban News on PPP TV Kenya begins its national run.'},
              {year:'2026 · Term 2',event:'Kiambu & Beyond',detail:'Koinange Girls, Loreto Kiambu, Gathirimu Girls, PCEA Gituamba. TIBS College on campus.'},
              {year:'2027',event:'Countrywide',detail:'Universities, colleges, polytechnics, mega events. East Africa next.'},
            ].map((t,i) => (
              <div key={t.year} style={{background:'var(--ugt-white)',padding:'28px 24px',borderRight:i<3?'var(--border-bold)':'none'}}>
                <div style={{fontFamily:'var(--font-handwritten)',fontSize:'28px',color:'var(--ugt-magenta)',marginBottom:'8px'}}>{t.year}</div>
                <div style={{fontFamily:'var(--font-display-alt)',fontSize:'16px',textTransform:'uppercase',color:'var(--ugt-ink)',marginBottom:'8px'}}>{t.event}</div>
                <div style={{fontSize:'13px',color:'var(--ugt-ink-2)',lineHeight:1.6}}>{t.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section-dark">
        <div className="container">
          <div style={{maxWidth:'640px'}} className="reveal">
            <div className="eyebrow" style={{color:'var(--ugt-orange)'}}>Let's get to work</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-white)',margin:'12px 0 16px'}}>The next great Kenyan<br />artist is in a classroom<br />right now.</h2>
            <p style={{color:'rgba(255,255,255,0.65)',fontSize:'16px',lineHeight:1.7,marginBottom:'32px'}}>Bring us in and we will find them. Eugine Micah and Lucy Ogunde lead every conversation personally.</p>
            <div style={{display:'flex',gap:'14px',flexWrap:'wrap'}}>
              <Link href="/contact" className="btn btn-magenta btn-lg">Book a stop</Link>
              <Link href="/partners" className="btn btn-outline-white btn-lg">Partner with us</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
