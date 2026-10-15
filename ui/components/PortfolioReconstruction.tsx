'use client';
import {InlineArrow} from './InlineArrow';
import Link from './DocumentLink';
import {MediaFilm,MediaImage,collections} from './MediaLibrary';
import timeline from '../data/tour-timeline.json';
import styles from './PortfolioProfiles.module.css';

const stops=timeline.entries.filter(entry=>entry.status==='completed');
function Project({slug}:{slug:string}){
  const collection=collections.find(item=>item.slug===slug);
  if(!collection)return null;
  return <article className={styles.archiveProject}><Link className={styles.projectImage} href={'/gallery/'+slug} aria-label={'View '+collection.title}><MediaImage id={collection.coverId}/><span>View photos <InlineArrow/></span></Link><div className={styles.projectContent}><p className="eyebrow">{collection.category}</p><h3><Link href={'/gallery/'+slug}>{collection.title}</Link></h3><p>{collection.description}</p></div></article>;
}
function Heading({label,title}:{label:string;title:string}){return <div className="section-title"><p className="eyebrow">{label}</p><h2>{title}</h2></div>}

export function PortfolioPage(){return <>
  <section className={`page-intro wrap ${styles.portfolioIntro}`}><div><p className="eyebrow">Selected work</p><h1>Our portfolio.</h1></div><div className={styles.introAside}><p>Schools. Campuses. Campaigns. On stage and on screen.</p><Link className="button" href="/book">Book the tour <InlineArrow/></Link></div></section>
  <nav className={`wrap ${styles.portfolioNavigation}`} aria-label="Portfolio sections">{[['Schools','school-work'],['Campus Rave','campus-work'],['Campaigns','campaign-work'],['Live events','live-work'],['Broadcast','media-work']].map(([label,id])=><Link key={id} href={'#'+id}>{label}</Link>)}</nav>
  <section id="school-work" className={`section wrap ${styles.portfolioSection}`}><Heading label="01 · School tour" title="School memories."/><div className={styles.schoolProjects}>{stops.map(stop=><article className={styles.schoolProject} key={stop.id}><Link className={styles.schoolImage} href={'/gallery/school-'+stop.id}><img src={stop.image!} alt={'Urban Gang Tour at '+stop.name} loading="lazy" decoding="async"/></Link><div><p className="eyebrow"><time dateTime={stop.date!}>{new Intl.DateTimeFormat('en-KE',{day:'numeric',month:'short',year:'numeric'}).format(new Date(stop.date!+'T12:00:00+03:00'))}</time> · {stop.venue}</p><h3>{stop.name}</h3><Link className="text-link" href={'/gallery/school-'+stop.id}>View photos <InlineArrow/></Link></div></article>)}</div><div className="section-end"><Link className="text-link" href="/tour-stops">All tour stops <InlineArrow/></Link></div></section>
  <section id="campus-work" className={`section wrap ${styles.portfolioSection}`}><Heading label="02 · Campus Rave" title="Campus energy."/><div className={styles.projectGrid}>{['machakos-campus','uon-mr-miss-2022','tibs-campus','kips-campus-rave'].map(slug=><Project key={slug} slug={slug}/>)}</div></section>
  <section id="campaign-work" className={`section wrap ${styles.portfolioSection}`}><Heading label="03 · Campaigns" title="On camera."/><div className={`film-grid ${styles.campaignFilms}`}>{['M210','M213','M215'].map(id=><MediaFilm id={id} key={id}/>)}</div><div className={styles.projectGrid}>{['tecno-uon','infinix-kicc'].map(slug=><Project key={slug} slug={slug}/>)}</div><div className="section-end"><Link className="text-link" href="/work-with-us">All campaign films <InlineArrow/></Link></div></section>
  <section id="live-work" className={`section wrap ${styles.portfolioSection}`}><Heading label="04 · Live events" title="Music. Culture. Connection."/><div className={styles.projectGrid}><Project slug="nairobi-choirs"/><div className={styles.liveProjectCopy}><h3>Your next live moment.</h3><p>Talent nights, colour festivals and celebrations.</p><Link className="button" href="/book?type=public">Plan an event <InlineArrow/></Link></div></div></section>
  <section id="media-work" className={`section wrap ${styles.portfolioSection}`}><Heading label="05 · Broadcast" title="Urban News."/><div className={styles.mediaFeature}><Link href="/gallery/urban-news"><MediaImage id="M204" alt="Eugine and Lucy in the Urban News studio"/></Link><div><div className={styles.broadcastMarks}><MediaImage id="M175"/><MediaImage id="M176"/></div><h3>Eugine & Lucy.<br/>PPP TV Kenya.</h3><Link className="text-link" href="/gallery/urban-news">View studio photos <InlineArrow/></Link><Link className="text-link" href="/press">Press enquiries <InlineArrow/></Link></div></div></section>
  <section className="archive-callout wrap"><h2>Let’s make your next moment.</h2><Link className="button" href="/book">Book the tour <InlineArrow/></Link></section>
</>}
