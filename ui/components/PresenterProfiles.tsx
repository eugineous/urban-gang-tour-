'use client';
import Link from './DocumentLink';
import {InlineArrow} from './InlineArrow';
import {MediaImage,MediaFilm} from './MediaLibrary';
import {ShareActions} from './ShareActions';
import styles from './PortfolioProfiles.module.css';
import {WEBSITE_DEFAULTS,type WebsiteContent} from '@/lib/website-content';
import {PRESENTER_BIOGRAPHIES,presenterEventCredits,presenterRelatedStories,type PresenterStory} from '../lib/presenter-biography';
import type {OwnedEvent} from '../lib/owned-event-presentation';

type Props={lucy?:boolean;content?:WebsiteContent|null;events?:OwnedEvent[];posts?:PresenterStory[];initialNow?:number};

export function PresenterProfile({lucy=false,content=null,events=[],posts=[],initialNow=0}:Props){
 const profile=PRESENTER_BIOGRAPHIES[lucy?'lucy':'eugine'];
 const {name,firstName}=profile;
 const booking='/book?type=hosts&host='+(lucy?'lucy':'eugine');
 const paragraphs=content?.body??WEBSITE_DEFAULTS[profile.path].body;
 const credits=presenterEventCredits(events,lucy,initialNow);
 const stories=presenterRelatedStories(posts,lucy);
 const sections=[['biography','Overview'],['broadcasting','Broadcasting'],['selected-work','Selected work'],
  ...(credits.length?[['event-credits','Event credits']]:[]),...(stories.length?[['related-stories','Related stories']]:[]),['photographs','Photographs']];
 return <>
  <nav className="breadcrumbs wrap" aria-label="Breadcrumb"><Link href="/about">About</Link><span aria-hidden="true">/</span><span aria-current="page">{name}</span></nav>
  <article className={'wrap '+styles.biographyPage} aria-labelledby="presenter-name">
   <header className={styles.biographyHeading}>
    <p className="eyebrow">People · Urban Gang Tour</p>
    <h1 id="presenter-name">{content?.title||name}</h1>
    <p>{content?.summary||profile.practice}</p>
   </header>
   <div className={styles.biographyLayout}>
    <aside className={styles.biographyFacts} aria-labelledby="profile-facts-heading">
     <h2 id="profile-facts-heading">{name}</h2>
     <figure>{content?.image?<img src={content.image} alt={name}/>:<MediaImage id={profile.portrait} alt={name} priority/>}<figcaption>{name} · presenter photograph</figcaption></figure>
     <dl><div><dt>Work</dt><dd>{profile.roles.join(', ')}</dd></div><div><dt>Organisation</dt><dd><Link href="/about">Urban Gang Tour</Link></dd></div><div><dt>Role</dt><dd>{profile.position}</dd></div><div><dt>Programme</dt><dd><Link href="/gallery/urban-news">Urban News · PPP TV Kenya</Link></dd></div><div><dt>Works with</dt><dd><Link href={profile.collaboratorPath}>{profile.collaborator}</Link></dd></div></dl>
     <Link href={booking} className={'button '+styles.biographyBooking}>Book {firstName}<InlineArrow/></Link>
     <Link href="/press" className={styles.biographyPress}>Press & interviews</Link>
    </aside>
    <div className={styles.biographyMain}>
     <nav className={styles.biographyContents} aria-label={name+' profile sections'}>
      <h2>On this page</h2><ol>{sections.map(([id,label])=><li key={id}><Link href={'#'+id}>{label}</Link></li>)}</ol>
     </nav>
     <section id="biography" className={styles.biographySection} aria-labelledby="biography-heading">
      <h2 id="biography-heading">Overview</h2>
      {paragraphs.length?paragraphs.map((paragraph,index)=><p className={index===0?styles.biographyLead:undefined} key={index}>{paragraph}</p>):<p>{profile.practice}</p>}
     </section>
     <section id="broadcasting" className={styles.biographySection} aria-labelledby="broadcasting-heading">
      <h2 id="broadcasting-heading">Broadcasting</h2>
      <p>{name} co-hosts <Link href="/gallery/urban-news">Urban News on PPP TV Kenya</Link> with <Link href={profile.collaboratorPath}>{profile.collaborator}</Link>.</p>
      <figure className={styles.biographyStudio}><Link href="/gallery/urban-news"><MediaImage id="M204" alt="Eugine Micah and Lucy Ogunde in the Urban News studio"/></Link><figcaption>From the Urban News studio collection.</figcaption></figure>
     </section>
     <section id="selected-work" className={styles.biographySection} aria-labelledby="selected-work-heading">
      <h2 id="selected-work-heading">Selected work</h2>
      <p>Films from the <Link href="/work-with-us">commercial campaign archive</Link> featuring {firstName}.</p>
      <div className={styles.biographyFilms}>{profile.films.map(id=><MediaFilm key={id} id={id}/>)}</div>
     </section>
     {credits.length>0&&<section id="event-credits" className={styles.biographySection} aria-labelledby="event-credits-heading">
      <h2 id="event-credits-heading">Event credits</h2>
      <ul className={styles.biographyRecords}>{credits.map(credit=><li key={credit.id}><Link href={credit.href}>{credit.name}</Link><span>{credit.date} · {credit.status}</span>{credit.venue&&<span>{credit.venue}</span>}</li>)}</ul>
     </section>}
     {stories.length>0&&<section id="related-stories" className={styles.biographySection} aria-labelledby="related-stories-heading">
      <h2 id="related-stories-heading">Related stories</h2>
      <ul className={styles.biographyStories}>{stories.map(story=><li key={story.id}><Link href={story.href}>{story.headline}</Link></li>)}</ul>
     </section>}
     <section id="photographs" className={styles.biographySection} aria-labelledby="photographs-heading">
      <h2 id="photographs-heading">Photographs</h2>
      <div className={styles.biographyPhotos}>{['M205','M207',profile.portrait].map(id=><Link key={id} href={id===profile.portrait?'/gallery/hosts-commercial':'/gallery/urban-news'}><MediaImage id={id}/></Link>)}</div>
      <p><Link href="/gallery/hosts-commercial">Presenter photographs</Link> · <Link href="/portfolio">Live event portfolio</Link></p>
     </section>
     <section className={styles.biographySection} aria-labelledby="profile-links-heading">
      <h2 id="profile-links-heading">Further information</h2>
      <ul className={styles.biographyStories}><li><Link href="/about">About Urban Gang Tour</Link></li><li><Link href="/gallery/urban-news">Urban News photographs</Link></li><li><Link href="/work-with-us">Commercial films and campaigns</Link></li></ul>
      <ShareActions title={name+' · Urban Gang Tour'} path={profile.path} label={'Share '+firstName+'’s profile'}/>
     </section>
    </div>

   </div>
  </article>
 </>;
}
