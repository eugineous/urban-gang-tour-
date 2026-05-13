import Link from 'next/link';

export const metadata = {
  title: 'Partners | Urban Gang Tour',
  description: 'The institutions and brands that show up with Urban Gang Tour. NACADA, PPP TV Kenya, Synapse Models, Ashton Sounds, Delo Greens Movement and more.',
};

const PARTNERS = [
  {role:'Broadcast partner',name:'PPP TV Kenya',desc:'Urban News on PPP TV Kenya. Up to 8 million viewers per episode. Every stop airs nationally.',img:'/assets/logos/ppp-tv.png'},
  {role:'Official drug prevention partner',name:'NACADA',desc:'National Authority on the Campaign Against Drug Abuse. Embedded in every school event with facilitators who speak how students actually speak.',img:'/assets/logos/nacada-logo-png.png'},
  {role:'Modelling & wellness partner',name:'Synapse Models',desc:'Professional modelling standards inside a school environment. Confidence as a serious capability. The runway is real.',img:'/assets/logos/synapse-models-png.png'},
  {role:'Stage audio partner',name:'Ashton Sounds',desc:'Full PA, monitors, and live sound engineering. The audio is treated as seriously as the stage.',img:null},
  {role:'Environmental partner',name:'Delo Greens Movement',desc:'Founded by King TAE. Tree planting integrated into every school visit. The aim: 10,000 schools across East & Central Africa.',img:null},
  {role:'Campus partner',name:'Hewitt & Bennet College',desc:'NITA-certified, with campuses in Nairobi CBD, Buruburu and Thika. International placements across the UK, Canada, USA and Europe.',img:null},
  {role:'Campus partner',name:'TIBS College',desc:'Thika Institute of Business Studies. UGT extends from high school into higher education.',img:null},
  {role:'Community partner',name:'The Experience Hub',desc:'On the ground, in the room, every event day. The Experience Hub brings the community infrastructure.',img:'/assets/logos/experience-hub-logo.png'},
  {role:'Health partner',name:'Moyo Response',desc:'Mental health and wellness support embedded in the UGT programme. Because the conversation matters.',img:'/assets/logos/moyo-response-png.png'},
];

export default function PartnersPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-inner">
          <div className="eyebrow" style={{color:'var(--ugt-orange)',marginBottom:'12px'}}>Our partners</div>
          <h1 className="h-display h-lg" style={{color:'var(--ugt-white)',marginBottom:'16px'}}>These are the people<br />who show up with us.</h1>
          <p style={{color:'rgba(255,255,255,0.65)',fontSize:'var(--fs-body-lg)',maxWidth:'640px',lineHeight:'var(--lh-loose)'}}>Every partner in this list chose to be here because they believe in the same thing we do. That young people in Kenya deserve more than a seat in a classroom. They deserve a stage.</p>
        </div>
      </section>

      <div className="ticker-wrap">
        <div className="ticker-inner fast">
          {['NACADA','PPP TV Kenya','Synapse Models','The Experience Hub','Delo Greens Movement','Ashton Sounds','Moyo Response','Hewitt and Bennet College','TIBS College'].map((t,i) => (
            <div key={i} className="ticker-item">{t} <span className="ticker-sep">*</span></div>
          ))}
          {['NACADA','PPP TV Kenya','Synapse Models','The Experience Hub','Delo Greens Movement','Ashton Sounds','Moyo Response','Hewitt and Bennet College','TIBS College'].map((t,i) => (
            <div key={`b${i}`} className="ticker-item">{t} <span className="ticker-sep">*</span></div>
          ))}
        </div>
      </div>

      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="reveal" style={{marginBottom:'40px'}}>
            <div className="eyebrow">Operational partners</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Not logos on a document.<br />Partners in the room.</h2>
            <p style={{color:'var(--ugt-ink-2)',marginTop:'14px',maxWidth:'580px',fontSize:'16px',lineHeight:1.7}}>These organisations are embedded in every event. They show up, they deliver, and they believe in what this is.</p>
          </div>
          <div className="grid-3 reveal reveal-delay-1">
            {PARTNERS.map(p => (
              <div key={p.name} className="partner-card">
                <div className="partner-card-logo">
                  {p.img ? (
                    <img src={p.img} alt={p.name} />
                  ) : (
                    <div style={{fontFamily:'var(--font-display)',fontSize:'28px',color:'var(--ugt-magenta)',letterSpacing:'var(--tracking-crunch)',textTransform:'uppercase'}}>{p.name.split(' ').slice(0,2).join(' ')}</div>
                  )}
                </div>
                <div className="partner-card-body">
                  <div className="partner-card-role">{p.role}</div>
                  <div className="partner-card-name">{p.name}</div>
                  <div className="partner-card-desc">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="reveal" style={{marginBottom:'36px'}}>
            <div className="eyebrow">Become a partner</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Your brand belongs<br />in this room.</h2>
            <p style={{color:'var(--ugt-ink-2)',marginTop:'14px',maxWidth:'580px',fontSize:'16px',lineHeight:1.7}}>We offer activation packages for brands that want to reach young Kenyans in a genuine, high-energy environment. Not a banner on a wall. A real presence on a real event day.</p>
          </div>
          <div className="grid-3 reveal reveal-delay-1">
            {[
              {tier:'Title Sponsor',desc:'Your brand leads the event. Name on every piece of communication, stage branding, MC mentions, social content, and the PPP TV broadcast.'},
              {tier:'Category Sponsor',desc:'Own one of the ten battle lanes. Your brand is the name of the competition. Students compete in your name.'},
              {tier:'Activation Partner',desc:'A branded activation on the event ground. Sampling, demos, giveaways, or a booth. Direct access to a captive young audience.'},
            ].map(t => (
              <div key={t.tier} style={{background:'var(--ugt-white)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'32px',boxShadow:'var(--shadow-sticker-xs)'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:'24px',color:'var(--ugt-magenta)',letterSpacing:'var(--tracking-crunch)',textTransform:'uppercase',marginBottom:'12px'}}>{t.tier}</div>
                <div style={{fontSize:'14px',color:'var(--ugt-ink-2)',lineHeight:1.65,marginBottom:'20px'}}>{t.desc}</div>
                <Link href="/contact" className="btn btn-outline btn-sm">Get the package</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div style={{maxWidth:'640px'}} className="reveal">
            <div className="eyebrow" style={{color:'var(--ugt-orange)'}}>Let's talk</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-white)',margin:'12px 0 16px'}}>Ready to be in<br />the room?</h2>
            <p style={{color:'rgba(255,255,255,0.65)',fontSize:'16px',lineHeight:1.7,marginBottom:'32px'}}>Eugine and Lucy lead every partnership conversation personally. Reach out and let's find the right fit for your brand or organisation.</p>
            <Link href="/contact" className="btn btn-magenta btn-lg">Start the conversation</Link>
          </div>
        </div>
      </section>
    </>
  );
}
