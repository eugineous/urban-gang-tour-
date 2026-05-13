import Link from 'next/link';
import { notFound } from 'next/navigation';

const GALLERIES = {
  koinange: {
    title: 'Senior Chief Koinange Girls',
    date: '30 May 2026',
    theme: 'Find your voice.',
    location: 'Kiambaa, Kiambu County',
    color: 'var(--ugt-magenta)',
    description: 'The recon visit to Senior Chief Koinange Girls High School. Scoping the venue, meeting the administration, and getting a feel for the energy before the full event day.',
    images: [
      '/assets/people/experience-hub-team.jpg',
      '/assets/people/experience-hub-team-2.jpg',
      '/assets/people/hype-ola-dj-carian.jpg',
    ],
  },
  loreto: {
    title: 'Loreto Kiambu Girls High School',
    date: '1 June 2026',
    theme: 'Own your story.',
    location: 'Kiambu Town, Kiambu County',
    color: 'var(--ugt-orange)',
    description: 'The recon visit to Loreto Kiambu Girls High School. A school with history and a student body ready to show the country what they are made of.',
    images: [
      '/assets/people/experience-hub-team.jpg',
      '/assets/people/eugine-micah.png',
      '/assets/people/lucy-ogunde.jpg',
    ],
  },
  gathirimu: {
    title: 'Gathirimu Girls Technical High School',
    date: '4 July 2026',
    theme: 'Skill is the superpower.',
    location: 'Githunguri, Kiambu County',
    color: 'var(--ugt-purple)',
    description: 'The recon visit to Gathirimu Girls Technical High School. A technical school where skill is the identity — and Urban Gang Tour is here to put that on national television.',
    images: [
      '/assets/people/experience-hub-team-2.jpg',
      '/assets/people/hype-ola.jpg',
      '/assets/people/dj-xavi.jpg',
    ],
  },
};

export async function generateStaticParams() {
  return Object.keys(GALLERIES).map(slug => ({ slug }));
}

export async function generateMetadata({ params }) {
  const g = GALLERIES[params.slug];
  if (!g) return {};
  return {
    title: `${g.title} Gallery | Urban Gang Tour`,
    description: g.description,
  };
}

export default function GalleryPage({ params }) {
  const g = GALLERIES[params.slug];
  if (!g) notFound();

  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-inner">
          <div style={{marginBottom:'12px'}}>
            <Link href="/stops" style={{color:'rgba(255,255,255,0.55)',fontSize:'13px',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase'}}>← Back to stops</Link>
          </div>
          <div className="eyebrow" style={{color:'var(--ugt-orange)',marginBottom:'12px'}}>Recon gallery · {g.date}</div>
          <h1 className="h-display h-lg" style={{color:'var(--ugt-white)',marginBottom:'16px'}}>{g.title}</h1>
          <div style={{fontFamily:'var(--font-script)',fontSize:'22px',color:'var(--ugt-orange)',marginBottom:'12px'}}>{g.theme}</div>
          <p style={{color:'rgba(255,255,255,0.65)',fontSize:'var(--fs-body-lg)',maxWidth:'600px',lineHeight:'var(--lh-loose)'}}>{g.description}</p>
        </div>
      </section>

      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="reveal" style={{marginBottom:'36px'}}>
            <div className="eyebrow">Recon photos</div>
            <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>Before the event day.</h2>
            <p style={{color:'var(--ugt-ink-2)',marginTop:'12px',maxWidth:'480px',fontSize:'16px',lineHeight:1.65}}>The recon visit is where we scope the venue, meet the administration, and start building the energy before the full crew arrives.</p>
          </div>
          <div className="grid-3 reveal reveal-delay-1">
            {g.images.map((img, i) => (
              <div key={i} style={{borderRadius:'var(--r-xl)',overflow:'hidden',border:'var(--border-bold)',boxShadow:'var(--shadow-sticker-xs)',aspectRatio:'4/3'}}>
                <img src={img} alt={`${g.title} recon ${i+1}`} style={{width:'100%',height:'100%',objectFit:'cover'}} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'24px'}} className="reveal">
            <div>
              <div className="eyebrow">Event details</div>
              <h2 className="h-display h-md" style={{color:'var(--ugt-ink)'}}>The full event day<br />is coming.</h2>
            </div>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <Link href="/contact" className="btn btn-magenta">Book a similar stop</Link>
              <Link href="/stops" className="btn btn-outline">See all stops</Link>
            </div>
          </div>
          <div style={{marginTop:'36px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'20px'}} className="reveal reveal-delay-1">
            {[
              {label:'Date',value:g.date},
              {label:'Location',value:g.location},
              {label:'Theme',value:g.theme},
            ].map(d => (
              <div key={d.label} style={{background:'var(--ugt-white)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'24px',boxShadow:'var(--shadow-sticker-xs)'}}>
                <div style={{fontSize:'11px',fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--ugt-magenta)',marginBottom:'8px'}}>{d.label}</div>
                <div style={{fontFamily:'var(--font-display-alt)',fontSize:'18px',textTransform:'uppercase',color:'var(--ugt-ink)'}}>{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
