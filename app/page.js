import Link from 'next/link';

export const metadata = {
  title: 'Urban Gang Tour | From Potential to Purpose',
  description: 'Production-quality live events in Kenyan schools. Talent battles, mentorship, awards and national TV.',
};

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section style={{background:'var(--ugt-bg-dark)',paddingTop:'80px',paddingBottom:'80px',position:'relative',overflow:'hidden',minHeight:'90vh',display:'flex',alignItems:'center'}}>
        <div style={{position:'absolute',inset:0,background:'var(--grad-stage-glow)',pointerEvents:'none'}} />
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(204,0,119,0.06) 1px,transparent 1px)',backgroundSize:'24px 24px',pointerEvents:'none'}} />
        <div className="container" style={{position:'relative',zIndex:1}}>
          <div className="reveal" style={{marginBottom:'16px'}}>
            <span className="chip chip-live"><span className="dot" />2026 · Booking now</span>
          </div>
          <h1 className="h-display h-xl reveal reveal-delay-1" style={{color:'var(--ugt-white)',marginBottom:'24px',maxWidth:'900px'}}>
            From<br /><span style={{color:'var(--ugt-magenta)'}}>Potential</span><br />to Purpose.
          </h1>
          <p className="reveal reveal-delay-2" style={{color:'rgba(255,255,255,0.65)',fontSize:'var(--fs-body-lg)',maxWidth:'560px',lineHeight:'var(--lh-loose)',marginBottom:'36px'}}>
            Urban Gang Tour walks into Kenyan schools and campuses with a full professional crew, a proper stage, and national television. Then we hand the mic to the students.
          </p>
          <div className="reveal reveal-delay-3" style={{display:'flex',gap:'14px',flexWrap:'wrap'}}>
            <Link href="/stops" className="btn btn-magenta btn-lg">See the 2026 calendar</Link>
            <Link href="/about" className="btn btn-outline-white btn-lg">What this is</Link>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-inner">
          {['Singing & Rap','Dance','Spoken Word','Poetry','Modelling','News Reporting','Public Speaking','Art','Teachers Competition','Eating Competition','From Potential to Purpose'].map((t,i) => (
            <div key={i} className="ticker-item">{t} <span className="ticker-sep">*</span></div>
          ))}
          {['Singing & Rap','Dance','Spoken Word','Poetry','Modelling','News Reporting','Public Speaking','Art','Teachers Competition','Eating Competition','From Potential to Purpose'].map((t,i) => (
            <div key={`b${i}`} className="ticker-item">{t} <span className="ticker-sep">*</span></div>
          ))}
        </div>
      </div>

      {/* TOUR STOPS */}
      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="flex-between reveal" style={{marginBottom:'40px',flexWrap:'wrap',gap:'16px'}}>
            <div>
              <div className="eyebrow">2026 calendar · booking now</div>
              <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>The calendar is<br />filling up. Fast.</h2>
              <p style={{color:'var(--ugt-ink-2)',marginTop:'12px',maxWidth:'440px',fontSize:'16px',lineHeight:'1.65'}}>Three schools confirmed in Kiambu. Universities and colleges in conversation. If your institution wants in, the line is open.</p>
            </div>
            <Link href="/stops" className="btn btn-outline">See all stops</Link>
          </div>
          <div className="stops-grid reveal reveal-delay-1">
            <div className="stop-card">
              <div className="stop-card-date-row">
                <div className="stop-card-date">30</div>
                <div className="stop-card-month">May 2026</div>
              </div>
              <div className="stop-card-body">
                <span className="chip chip-confirmed" style={{alignSelf:'flex-start'}}>Confirmed</span>
                <div className="stop-card-name ugt-xs-underline">Senior Chief Koinange Girls</div>
                <div className="stop-card-theme">Find your voice.</div>
                <div className="stop-card-location">Kiambaa, Kiambu County</div>
                <Link href="/gallery/koinange" className="btn btn-primary btn-sm" style={{alignSelf:'flex-start',marginTop:'auto'}}>Recon gallery</Link>
              </div>
            </div>
            <div className="stop-card">
              <div className="stop-card-date-row" style={{background:'var(--ugt-orange)'}}>
                <div className="stop-card-date">1</div>
                <div className="stop-card-month">June 2026</div>
              </div>
              <div className="stop-card-body">
                <span className="chip chip-confirmed" style={{alignSelf:'flex-start'}}>Confirmed</span>
                <div className="stop-card-name ugt-xs-underline">Loreto Kiambu Girls High School</div>
                <div className="stop-card-theme">Own your story.</div>
                <div className="stop-card-location">Kiambu Town, Kiambu County</div>
                <Link href="/gallery/loreto" className="btn btn-primary btn-sm" style={{alignSelf:'flex-start',marginTop:'auto'}}>Recon gallery</Link>
              </div>
            </div>
            <div className="stop-card">
              <div className="stop-card-date-row" style={{background:'var(--ugt-purple)'}}>
                <div className="stop-card-date">4</div>
                <div className="stop-card-month">July 2026</div>
              </div>
              <div className="stop-card-body">
                <span className="chip chip-confirmed" style={{alignSelf:'flex-start'}}>Confirmed</span>
                <div className="stop-card-name ugt-xs-underline">Gathirimu Girls Technical High</div>
                <div className="stop-card-theme">Skill is the superpower.</div>
                <div className="stop-card-location">Githunguri, Kiambu County</div>
                <Link href="/gallery/gathirimu" className="btn btn-primary btn-sm" style={{alignSelf:'flex-start',marginTop:'auto'}}>Recon gallery</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE PILLARS */}
      <section className="section section-soft">
        <div className="container">
          <div className="reveal" style={{marginBottom:'40px'}}>
            <div className="eyebrow">What this is</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Three pillars.<br />One unforgettable day.</h2>
            <p style={{color:'var(--ugt-ink-2)',marginTop:'12px',maxWidth:'560px',fontSize:'16px',lineHeight:'1.65'}}>We walk into a school or campus with a full professional crew. A proper stage. DJs, hype, cameras, energy. Then we hand the mic to the students and let them show the country who they are.</p>
          </div>
          <div className="grid-4 reveal reveal-delay-1">
            {[
              {num:'01',title:'Compete.',body:'Ten battle lanes. Singing, rap, dance, spoken word, poetry, modelling, news reporting, public speaking, art, even a teachers\' competition. Real winners. Real certificates. A TV moment that belongs to them.'},
              {num:'02',title:'Connect.',body:'Aspiring journalists shadow our camera crew. Future stylists work the runway with our modelling team. Young presenters share the stage with Eugine and Lucy. The career you dream about is standing in front of you for a day.'},
              {num:'03',title:'Celebrate.',body:'From the first DJ set to the last award, this day belongs to your students. Tree planting. Group photos. Urban Gang Moments instant prints. Snacks. Real conversations. Smiles shared with people who actually care.'},
              {num:'04',title:'Broadcast.',body:'Then we film it all and air it on national television. Urban News on PPP TV Kenya, with reach up to 8 million viewers. The school that hosts us becomes the school the country watched.'},
            ].map(item => (
              <div key={item.num} style={{background:'var(--ugt-white)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'28px',boxShadow:'var(--shadow-sticker-xs)'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:'48px',color:'var(--ugt-magenta)',lineHeight:1,marginBottom:'12px'}}>{item.num}</div>
                <div style={{fontFamily:'var(--font-display-alt)',fontSize:'20px',textTransform:'uppercase',color:'var(--ugt-ink)',marginBottom:'10px'}}>{item.title}</div>
                <div style={{fontSize:'14px',color:'var(--ugt-ink-2)',lineHeight:'1.65'}}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CREW PREVIEW */}
      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="flex-between reveal" style={{marginBottom:'36px',flexWrap:'wrap',gap:'16px'}}>
            <div>
              <div className="eyebrow">The faces</div>
              <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Eugine and Lucy.<br />And a team that loves<br />this more than sleep.</h2>
            </div>
            <Link href="/crew" className="btn btn-outline">Meet everyone</Link>
          </div>
          <div className="crew-grid reveal reveal-delay-1">
            {[
              {img:'/assets/people/eugine-micah.png',role:'Co-Founder',name:'Eugine Micah',note:'Lead Host. Creative Director. He built this from zero and hosts every stop personally.'},
              {img:'/assets/people/lucy-ogunde.jpg',role:'Co-Founder',name:'Lucy Ogunde',note:'Co-Host. Community Architect. She makes the day feel like it belongs to the school.'},
              {img:'/assets/people/hype-ola.jpg',role:'Experience Hub Lead',name:'Hype Ola',note:'Hypeman. When the crowd peaks, Hype Ola is why.'},
              {img:'/assets/people/rania-martin.webp',role:'Social Content Lead',name:'Rania Martin',note:'PPP TV Editor. After every stop, Rania is why the clips hit.'},
            ].map(c => (
              <div key={c.name} className="crew-card">
                <div className="crew-card-img"><img src={c.img} alt={c.name} loading="lazy" /></div>
                <div className="crew-card-body">
                  <div className="crew-card-role">{c.role}</div>
                  <div className="crew-card-name">{c.name}</div>
                  <div className="crew-card-note">{c.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNERS */}
      <section className="section section-soft">
        <div className="container">
          <div className="flex-between reveal" style={{marginBottom:'36px',flexWrap:'wrap',gap:'16px'}}>
            <div>
              <div className="eyebrow">Partners already in the room</div>
              <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Serious institutions.<br />Already here.</h2>
            </div>
            <Link href="/partners" className="btn btn-outline">See the partner story</Link>
          </div>
          <div className="partner-logos-grid reveal reveal-delay-1">
            {[
              {img:'/assets/logos/ppp-tv.png',name:'PPP TV Kenya'},
              {img:'/assets/logos/nacada-logo-png.png',name:'NACADA'},
              {img:'/assets/logos/synapse-models-png.png',name:'Synapse Models'},
              {img:'/assets/logos/experience-hub-logo.png',name:'The Experience Hub'},
              {img:'/assets/logos/moyo-response-png.png',name:'Moyo Response'},
              {img:'/assets/logos/destiny-life-church-png.png',name:'Destiny Life Church'},
            ].map(p => (
              <div key={p.name} className="partner-logo-tile">
                <img src={p.img} alt={p.name} />
                <div className="name">{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section-dark">
        <div className="container">
          <div style={{maxWidth:'640px'}} className="reveal">
            <div className="eyebrow" style={{color:'var(--ugt-orange)'}}>Ready to move</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-white)',margin:'12px 0 16px'}}>The next great Kenyan<br />artist, journalist, model,<br />or leader is sitting in a<br />classroom right now.</h2>
            <p style={{color:'rgba(255,255,255,0.65)',fontSize:'16px',lineHeight:'1.7',marginBottom:'32px'}}>Bring us in and we will find them. School, university, college, polytechnic, mega event — if your audience is young and your ambitions are big, we are the right people to call.</p>
            <div style={{display:'flex',gap:'14px',flexWrap:'wrap'}}>
              <Link href="/contact" className="btn btn-magenta btn-lg">Talk to Eugine and Lucy</Link>
              <Link href="/partners" className="btn btn-outline-white btn-lg">Partner with us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ORANGE TICKER */}
      <div className="ticker-wrap orange">
        <div className="ticker-inner">
          {['Singing & Rap','Dance','Spoken Word','Poetry','Modelling','News Reporting','Public Speaking','Art','Teachers Competition','Eating Competition','From Potential to Purpose'].map((t,i) => (
            <div key={i} className="ticker-item">{t} <span className="ticker-sep">*</span></div>
          ))}
          {['Singing & Rap','Dance','Spoken Word','Poetry','Modelling','News Reporting','Public Speaking','Art','Teachers Competition','Eating Competition','From Potential to Purpose'].map((t,i) => (
            <div key={`b${i}`} className="ticker-item">{t} <span className="ticker-sep">*</span></div>
          ))}
        </div>
      </div>
    </>
  );
}
