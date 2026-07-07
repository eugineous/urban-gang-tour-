import Link from 'next/link';
import { Dot } from 'lucide-react';

export const metadata = {
  title: 'The Crew | Urban Gang Tour',
  description: 'Meet the Urban Gang Tour crew. Hosts, MCs, DJs, hypeman, camera crew, stage management, dancers, modelling leads.',
  keywords: 'Urban Gang Tour crew, Eugine Micah, Lucy Ogunde, Kenyan school events, youth talent Kenya, school concert Kenya, PPP TV Kenya, UGT team',
  alternates: { canonical: 'https://urbangangtour.co.ke/crew' },
};

const CREW = [
  {img:'/assets/people/eugine-micah.png',role:'Co-Founder · Lead Host',name:'Eugine Micah',note:'He built this from zero. Hosts every stop personally. The face of Urban News on PPP TV Kenya.',slug:'eugine-micah'},
  {img:'/assets/people/lucy-ogunde.jpg',role:'Co-Founder · Co-Host',name:'Lucy Ogunde',note:'Executive producer and co-host. The precision and the warmth. She makes the day feel like it belongs to the school.',slug:'lucy-ogunde'},
  {img:'/assets/people/hype-ola.jpg',role:'Experience Hub Lead · Hypeman',name:'Hype Ola',note:'When the crowd peaks, Hype Ola is why. The energy in the room is his responsibility and he takes it seriously.',slug:'hype-ola'},
  {img:'/assets/people/mc-paps.webp',role:'MC',name:'MC Paps',note:'The voice between the moments. Steers the crowd through every transition without losing a single person.',slug:'mc-paps'},
  {img:'/assets/people/rania-martin.webp',role:'Social Content Lead',name:'Rania Martin',note:'PPP TV Editor. After every stop, Rania is why the clips hit. The edit that makes the school famous.',slug:'rania-martin'},
  {img:'/assets/people/dj-xavi.jpg',role:'DJ',name:'DJ Xavi',note:'Sets the tone from the first track. The crowd does not know the day has started until DJ Xavi says it has.',slug:'dj-xavi'},
  {img:'/assets/people/dj-jayjey.jpg',role:'DJ',name:'DJ Jayjey',note:'Energy management. Reads the room and adjusts. The DJ who keeps the battles alive between rounds.',slug:'dj-jayjey'},
  {img:'/assets/people/dj-carian.jpg',role:'DJ',name:'DJ Carian',note:'The closer. When the awards are done and the crowd needs one last push, DJ Carian delivers it.',slug:'dj-carian'},
  {img:'/assets/people/mark-davinci.jpg',role:'Dancer · Choreographer',name:'Mark Davinci',note:'Choreography that moves a crowd. The dance lane is his and he runs it like a competition should be run.',slug:'mark-davinci'},
  {img:'/assets/people/kalamu-nyeusi.jpg',role:'Spoken Word',name:'Kalamu Nyeusi',note:'Truth spoken on purpose. The spoken word category is the quietest before it explodes. Kalamu is why.',slug:'kalamu-nyeusi'},
  {img:'/assets/people/george-morgan.jpg',role:'Camera · Production',name:'George Morgan',note:'The eye behind the lens. Every clip that airs on PPP TV started with George in the right position.',slug:'george-morgan'},
  {img:'/assets/people/pauline-masika.jpg',role:'Synapse Models Lead',name:'Pauline Masika',note:'Professional modelling standards inside a school environment. Confidence as a serious capability.',slug:'pauline-masika'},
];

export default function CrewPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-inner">
          <div className="eyebrow" style={{color:'var(--ugt-orange)',marginBottom:'12px'}}>The crew</div>
          <h1 className="h-display h-lg" style={{color:'var(--ugt-white)',marginBottom:'16px'}}>A team that loves this<br />more than it loves sleep.</h1>
          <p style={{color:'rgba(255,255,255,0.65)',fontSize:'var(--fs-body-lg)',maxWidth:'620px',lineHeight:'var(--lh-loose)'}}>Every event day, a full professional team shows up ready. Hosts. MCs. DJs. Hypeman. Camera crew. Stage management. Dancers. Modelling leads. Security. Production. Operations. These are the people behind it.</p>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'24px'}}>
            <span className="chip chip-ink">Steered by Eugine &amp; Lucy</span>
            <span className="chip chip-ink">Founders. Heads. Core. Ops.</span>
            <span className="chip chip-ink">On the clock, on the ground</span>
          </div>
        </div>
      </section>

      <div className="ticker-wrap">
        <div className="ticker-inner fast">
          {['Eugine Micah','Lucy Ogunde','MC Paps','Hype Ola','Synapse Models','Ashton Sounds','DJ Xavi','DJ Jayjey','Mark Davinci','Kalamu Nyeusi','Rania Martin'].map((t,i) => (
            <div key={i} className="ticker-item">{t} <Dot aria-hidden="true" className="ticker-sep" /></div>
          ))}
          {['Eugine Micah','Lucy Ogunde','MC Paps','Hype Ola','Synapse Models','Ashton Sounds','DJ Xavi','DJ Jayjey','Mark Davinci','Kalamu Nyeusi','Rania Martin'].map((t,i) => (
            <div key={`b${i}`} className="ticker-item">{t} <Dot aria-hidden="true" className="ticker-sep" /></div>
          ))}
        </div>
      </div>

      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="reveal" style={{marginBottom:'40px'}}>
            <div className="eyebrow">The full team</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Everyone who shows up.</h2>
          </div>
          <div className="crew-grid reveal reveal-delay-1">
            {CREW.map(c => (
              <Link key={c.name} href={`/people/${c.slug}`} style={{textDecoration:'none',display:'block'}}>
                <div className="crew-card" style={{height:'100%'}}>
                  <div className="crew-card-img"><img src={c.img} alt={c.name} loading="lazy" /></div>
                  <div className="crew-card-body">
                    <div className="crew-card-role">{c.role}</div>
                    <div className="crew-card-name">{c.name}</div>
                    <div className="crew-card-note">{c.note}</div>
                    <div style={{marginTop:'12px',fontSize:'13px',fontWeight:700,color:'var(--ugt-magenta)',letterSpacing:'0.02em'}}>View profile →</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div style={{maxWidth:'640px'}} className="reveal">
            <div className="eyebrow" style={{color:'var(--ugt-orange)'}}>Join the crew</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-white)',margin:'12px 0 16px'}}>Think you belong<br />on this team?</h2>
            <p style={{color:'rgba(255,255,255,0.65)',fontSize:'16px',lineHeight:1.7,marginBottom:'32px'}}>We are always looking for people who show up fully charged. Camera operators, stage crew, social media, logistics, security. If you are serious, reach out.</p>
            <Link href="/contact" className="btn btn-magenta btn-lg">Get in touch</Link>
          </div>
        </div>
      </section>
    </>
  );
}
