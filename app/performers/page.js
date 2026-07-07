import Link from 'next/link';
import { Dot } from 'lucide-react';

export const metadata = {
  title: 'Performers | Urban Gang Tour',
  description: 'Artists and performers on the Urban Gang Tour stage. Music, dance, spoken word, comedy, modelling. Lineups announced per stop.',
  keywords: 'Urban Gang Tour performers, Kenyan school events, youth talent Kenya, school concert Kenya, PPP TV Kenya, UGT artists, Kenya live performers',
  alternates: { canonical: 'https://urbangangtour.co.ke/performers' },
};

export default function PerformersPage() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-bg" />
        <div className="page-hero-dots" />
        <div className="container" style={{position:'relative',zIndex:2}}>
          <div className="live-badge reveal" style={{marginBottom:'24px'}}><div className="dot" /> Booked by Eugine · Announced per stop</div>
          <h1 className="h-display h-lg reveal reveal-delay-1" style={{color:'var(--ugt-white)',marginBottom:'16px'}}>We share the stage<br /><span style={{color:'var(--ugt-orange)'}}>with people who</span><br /><span style={{WebkitTextStroke:'2px var(--ugt-magenta)',color:'transparent'}}>have something to say.</span></h1>
          <p className="reveal reveal-delay-2" style={{fontSize:'18px',color:'rgba(255,255,255,0.65)',maxWidth:'560px',lineHeight:1.7,marginBottom:'32px'}}>Every Urban Gang Tour event features live performances from artists who connect with a young audience. Music. Dance. Spoken word. For schools we bring artists whose songs students already know. For universities and mega events, we scale accordingly. Lineups announced as each stop confirms.</p>
          <a href="#apply" className="btn btn-primary reveal reveal-delay-3">Think you belong on this stage? Say less. →</a>
        </div>
      </section>

      <div className="ticker-wrap orange">
        <div className="ticker-inner fast">
          {['Music','Spoken Word','Dance','Comedy','Modelling','Drama','Real talent. Real stage.'].map((t,i) => (
            <div key={i} className="ticker-item">{t} <Dot aria-hidden="true" className="ticker-sep" /></div>
          ))}
          {['Music','Spoken Word','Dance','Comedy','Modelling','Drama','Real talent. Real stage.'].map((t,i) => (
            <div key={`b${i}`} className="ticker-item">{t} <Dot aria-hidden="true" className="ticker-sep" /></div>
          ))}
        </div>
      </div>

      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="reveal" style={{marginBottom:'40px'}}>
            <div className="eyebrow">The lineup philosophy</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Artists who connect.<br />Not just perform.</h2>
            <p style={{color:'var(--ugt-ink-2)',marginTop:'14px',maxWidth:'580px',fontSize:'16px',lineHeight:1.7}}>We do not book artists for the sake of a name on a flyer. Every performer on a UGT stage is chosen because they speak the language of the students in that room. The energy has to be right. The message has to land.</p>
          </div>
          <div className="grid-3 reveal reveal-delay-1">
            {[
              {cat:'Music',desc:'Artists whose songs students already know. From gospel to afrobeats to drill. The genre matches the school.'},
              {cat:'Dance',desc:'Choreography that moves a crowd. From the corridor to the runway. Synapse Models leads the modelling lane.'},
              {cat:'Spoken Word',desc:'Truth spoken on purpose. The category that goes the quietest before it explodes.'},
              {cat:'Comedy',desc:'The crowd needs to breathe. A comedian who reads the room keeps the energy alive between battles.'},
              {cat:'Hype',desc:'Hype Ola is on every stage. The crowd does not peak without him. That is not a claim. That is a track record.'},
              {cat:'MC',desc:'MC Paps steers the crowd through every transition. The voice between the moments.'},
            ].map(c => (
              <div key={c.cat} style={{background:'var(--ugt-white)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'28px',boxShadow:'var(--shadow-sticker-xs)'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:'32px',color:'var(--ugt-magenta)',letterSpacing:'var(--tracking-crunch)',textTransform:'uppercase',marginBottom:'12px'}}>{c.cat}</div>
                <div style={{fontSize:'14px',color:'var(--ugt-ink-2)',lineHeight:1.65}}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark" id="apply">
        <div className="container">
          <div style={{maxWidth:'640px'}} className="reveal">
            <div className="eyebrow" style={{color:'var(--ugt-orange)'}}>Apply to perform</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-white)',margin:'12px 0 16px'}}>Think you belong<br />on this stage?</h2>
            <p style={{color:'rgba(255,255,255,0.65)',fontSize:'16px',lineHeight:1.7,marginBottom:'32px'}}>Send Eugine a message. Tell him who you are, what you do, and why a room full of Kenyan students needs to hear it. Keep it short. Keep it real.</p>
            <div style={{display:'flex',gap:'14px',flexWrap:'wrap'}}>
              <a href="https://wa.me/254799886247?text=Hi%20-%20I%27d%20like%20to%20perform%20on%20Urban%20Gang%20Tour" target="_blank" rel="noopener" className="btn btn-magenta btn-lg">Message on WhatsApp</a>
              <Link href="/contact" className="btn btn-outline-white btn-lg">Use the contact form</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
