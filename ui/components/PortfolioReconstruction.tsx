'use client';

import {InlineArrow} from './InlineArrow';
import Link from './DocumentLink';
import {MediaFilm, MediaImage, asset, collections} from './MediaLibrary';
import timeline from '../data/tour-timeline.json';
import library from '../data/media-library.json';
import styles from './PortfolioProfiles.module.css';

const completedStops = timeline.entries.filter(entry => entry.status === 'completed');
const schoolMarks: Record<string, string> = {koinange: 'M184', loreto: 'M182', gituamba: 'M183', lari: 'M181'};

function ArchiveMarks({ids, href = '/clients'}: {ids: string[]; href?: string}) {
  return <div className={styles.archiveMarks}>{ids.map(id => <Link href={href} key={id}><MediaImage id={id}/><span>{asset(id).title}</span></Link>)}</div>;
}

function ArchiveProject({slug}: {slug: string}) {
  const collection = collections.find(item => item.slug === slug);
  if (!collection) return null;
  const photographs = library.assets.filter(item => item.collection === slug && item.kind === 'photograph');
  const films = library.assets.filter(item => item.collection === slug && item.kind === 'video' && !item.adult);
  return <article className={styles.archiveProject}>
    <Link className={styles.projectImage} href={`/gallery/${slug}`} aria-label={`Explore ${collection.title}`}><MediaImage id={collection.coverId}/><span>View the archive <InlineArrow/></span></Link>
    <div className={styles.projectContent}><p className="eyebrow">{collection.category} · Documented work</p><h3><Link href={`/gallery/${slug}`}>{collection.title}</Link></h3><p>{collection.description}</p><dl><div><dt>Available to explore</dt><dd>{photographs.length} photographs{films.length > 0 ? ` · ${films.length} films` : ''}</dd></div><div><dt>Next step</dt><dd><Link href={`/gallery/${slug}`}>See the work and its context <InlineArrow/></Link></dd></div></dl></div>
  </article>;
}

export function PortfolioPage() {
  return <>
    <section className={`page-intro wrap ${styles.portfolioIntro}`}><div><p className="eyebrow">Urban Gang Tour · Selected work</p><h1>Made for people.<br/>Remembered in moments.</h1></div><div className={styles.introAside}><p>From the school hall to the campus stage. From a live audience to the camera. Explore the work, then imagine what we can make together.</p><Link className="button" href="/book">Book Urban Gang Tour <InlineArrow/></Link></div></section>
    <nav className={`wrap ${styles.portfolioNavigation}`} aria-label="Portfolio sections">{[
      ['School experiences', 'school-work'], ['Campus Rev', 'campus-work'], ['Institutional campaigns', 'campaign-work'], ['Live events', 'live-work'], ['Broadcast & media', 'media-work'],
    ].map(([label, id]) => <Link key={id} href={`#${id}`}>{label}<InlineArrow/></Link>)}</nav>
    <section className={`wrap ${styles.portfolioInstitutions}`} aria-labelledby="archive-institutions"><div><p className="eyebrow">Recognise the places. Explore the work.</p><h2 id="archive-institutions">Institutions in our archive.</h2><p>Each name leads to the corresponding event or media collection.</p></div><div className={styles.archiveMarks}>{[
      ['M184', 'school-koinange'], ['M182', 'school-loreto'], ['M183', 'school-gituamba'], ['M181', 'school-lari'], ['M196', 'uon-mr-miss-2022'], ['M188', 'machakos-campus'],
    ].map(([id, slug]) => <Link href={`/gallery/${slug}`} key={id}><MediaImage id={id}/><span>{asset(id).title}</span></Link>)}</div></section>
    <section id="school-work" className={`section wrap ${styles.portfolioSection}`}><div className="section-title"><p className="eyebrow">01 · School experiences</p><h2>Potential takes<br/>the stage.</h2></div><div className={styles.sectionIntroduction}><p>School visits give students a place to perform and celebrate their community. The recorded stops below link to the available photographs and timeline; planning visits remain identified separately.</p><Link className="text-link" href="/book?type=school">Plan a school experience <InlineArrow/></Link></div><div className={styles.schoolProjects}>{completedStops.map(entry => <article key={entry.id} className={styles.schoolProject}><Link href={`/gallery/school-${entry.id}`} className={styles.schoolImage}><img src={entry.image!} alt={`Urban Gang Tour archive at ${entry.name}`} loading="lazy" decoding="async"/></Link><div><div className={styles.schoolProjectHeading}><MediaImage id={schoolMarks[entry.id]}/><p className="eyebrow">Recorded completed stop</p></div><h3>{entry.name}</h3><dl><div><dt>Archive date</dt><dd><time dateTime={entry.date!}>{new Intl.DateTimeFormat('en-KE', {day: 'numeric', month: 'long', year: 'numeric'}).format(new Date(`${entry.date}T12:00:00+03:00`))}</time></dd></div><div><dt>Location in the tour record</dt><dd>{entry.venue}</dd></div></dl><Link className="text-link" href={`/gallery/school-${entry.id}`}>Explore this stop <InlineArrow/></Link></div></article>)}</div></section>
    <section id="campus-work" className={`section wrap ${styles.portfolioSection}`}><div className="section-title"><p className="eyebrow">02 · Campus Rev</p><h2>A campus.<br/>A shared experience.</h2></div><div className={styles.sectionIntroduction}><p>Campus Rev is Urban Gang Tour’s college and university offering. Explore the earlier campus archive: pageants, performances and student crowds. Original event names and artwork are preserved with their collections.</p><Link className="text-link" href="/book?type=campus">Discuss your campus programme <InlineArrow/></Link></div><div className={styles.projectGrid}>{['machakos-campus', 'uon-mr-miss-2022', 'tibs-campus', 'kips-campus-rave'].map(slug => <ArchiveProject slug={slug} key={slug}/>)}</div></section>
    <section id="campaign-work" className={`section wrap ${styles.portfolioSection}`}><div className="section-title"><p className="eyebrow">03 · Institutional & brand campaigns</p><h2>Your message.<br/>A human connection.</h2></div><div className={styles.sectionIntroduction}><p>The institutional film archive features college advertisements and presenting work with Eugine and Lucy. Watch the finished pieces, then brief us on your audience, message and production needs.</p><Link className="text-link" href="/book?type=commercial">Start a campaign brief <InlineArrow/></Link></div><ArchiveMarks ids={['M187', 'M190', 'M189', 'M191', 'M193', 'M194']} href="/work-with-us"/><div className={`film-grid ${styles.campaignFilms}`}>{['M210', 'M213', 'M215'].map(id => <MediaFilm id={id} key={id}/>)}</div><div className={styles.projectGrid}>{['tecno-uon', 'infinix-kicc'].map(slug => <ArchiveProject slug={slug} key={slug}/>)}</div><Link className="text-link" href="/work-with-us">See the full campaign film archive <InlineArrow/></Link></section>
    <section id="live-work" className={`section wrap ${styles.portfolioSection}`}><div className="section-title"><p className="eyebrow">04 · Live events & special formats</p><h2>Bring the room<br/>together.</h2></div><div className={styles.liveProject}><ArchiveProject slug="nairobi-choirs"/><div className={styles.liveProjectCopy}><p className="eyebrow">Start with the audience</p><h3>Music. Culture.<br/>A programme of your own.</h3><p>Explore the Nairobi Battle of the Choirs archive for a view of a live music setting. For a colour festival, talent night or themed experience, share the audience and venue so the team can build the programme with you.</p><Link className="button" href="/book?type=public">Plan a live experience <InlineArrow/></Link></div></div></section>
    <section id="media-work" className={`section wrap ${styles.portfolioSection}`}><div className="section-title"><p className="eyebrow">05 · Broadcast & media</p><h2>The story carries on.</h2></div><div className={styles.mediaFeature}><Link href="/gallery/urban-news"><MediaImage id="M204"/></Link><div><div className={styles.broadcastMarks}><MediaImage id="M175"/><MediaImage id="M176"/></div><h3>Urban News.<br/>Eugine & Lucy.</h3><p>Studio portraits and broadcasting imagery from the Urban News archive. Discuss interviews, event photography, filming and recaps as part of your brief; the distribution plan is agreed for each project.</p><Link className="text-link" href="/gallery/urban-news">Explore the broadcast archive <InlineArrow/></Link><Link className="text-link" href="/press">Press & interview enquiries <InlineArrow/></Link></div></div></section>
    <section className="archive-callout wrap"><div><p className="eyebrow">Your audience. Our next brief.</p><h2>What are we making together?</h2><p>Tell us your audience, venue and preferred date. We’ll discuss the programme, production requirements and quote.</p></div><Link className="button" href="/book">Book Urban Gang Tour <InlineArrow/></Link></section>
  </>;
}
