'use client';
import {marketingMessages} from '@/ui/i18n/catalogues/marketing';
import {MessageText} from '@/ui/i18n/MessageText';
import {useMessages} from '@/ui/i18n/LanguageProvider';

import {OriginalContent} from '@/ui/i18n/OriginalContent';
import Link from './DocumentLink';
import {InlineArrow} from './InlineArrow';
import {MediaImage,MediaFilm} from './MediaLibrary';
import {ShareActions} from './ShareActions';
import styles from './PortfolioProfiles.module.css';
import {WEBSITE_DEFAULTS,type WebsiteContent} from '@/lib/website-content';
import {PRESENTER_BIOGRAPHIES,presenterEventCredits,presenterRelatedStories,type PresenterStory} from '../lib/presenter-biography';
import type {OwnedEvent} from '../lib/owned-event-presentation';

type Props={lucy?:boolean;content?:WebsiteContent|null;events?:OwnedEvent[];posts?:PresenterStory[];initialNow?:number};

export function PresenterProfile({lucy=false,content=null,events=[],posts=[],initialNow=0}:Props){const t=useMessages(marketingMessages);
 const profile=PRESENTER_BIOGRAPHIES[lucy?'lucy':'eugine'];
 const {name,firstName}=profile;
 const booking='/book?type=hosts&host='+(lucy?'lucy':'eugine');
 const paragraphs=content?.body??WEBSITE_DEFAULTS[profile.path].body;
 const credits=presenterEventCredits(events,lucy,initialNow);
 const stories=presenterRelatedStories(posts,lucy);
 const sections=[['biography',t('presenter.overview')],['broadcasting',t('presenter.broadcasting')],['selected-work',t('presenter.work')],
  ...(credits.length?[['event-credits',t('presenter.credits')]]:[]),...(stories.length?[['related-stories',t('presenter.stories')]]:[]),['photographs',t('presenter.photos')]];
 return <>
  <nav className="breadcrumbs wrap" aria-label={t('presenter.breadcrumb')}><Link href="/about">{t('about')}</Link><span aria-hidden="true">/</span><span aria-current="page" lang="en-KE">{name}</span></nav>
  <article className={'wrap '+styles.biographyPage} aria-labelledby="presenter-name">
   <header className={styles.biographyHeading}>
    <p className="eyebrow">{t('presenter.people')}</p>
    <h1 id="presenter-name"><OriginalContent inline>{content?.title||name}</OriginalContent></h1>
    <p><OriginalContent inline>{content?.summary||profile.practice}</OriginalContent></p>
   </header>
   <div className={styles.biographyLayout}>
    <aside className={styles.biographyFacts} aria-labelledby="profile-facts-heading">
     <h2 id="profile-facts-heading" lang="en-KE">{name}</h2>
     <figure>{content?.image?<img src={content.image} alt={name}/>:<MediaImage id={profile.portrait} alt={name} priority/>}<figcaption><MessageText catalogue={marketingMessages} message="presenter.portrait" values={{name:<OriginalContent inline>{name}</OriginalContent>}}/></figcaption></figure>
     <dl><div><dt>{t('presenter.fact.work')}</dt><dd lang="en-KE">{profile.roles.join(', ')}</dd></div><div><dt>{t('presenter.fact.organisation')}</dt><dd><Link href="/about" lang="en-KE">Urban Gang Tour</Link></dd></div><div><dt>{t('presenter.fact.role')}</dt><dd lang="en-KE">{profile.position}</dd></div><div><dt>{t('presenter.fact.programme')}</dt><dd><Link href="/gallery/urban-news" lang="en-KE">Urban News · PPP TV Kenya</Link></dd></div><div><dt>{t('presenter.fact.collaborator')}</dt><dd><Link href={profile.collaboratorPath} lang="en-KE">{profile.collaborator}</Link></dd></div></dl>
     <Link href={booking} className={'button '+styles.biographyBooking}><MessageText catalogue={marketingMessages} message="presenter.book" values={{firstName:<OriginalContent inline>{firstName}</OriginalContent>}}/><InlineArrow/></Link>
     <Link href="/press" className={styles.biographyPress}>{t('presenter.press')}</Link>
    </aside>
    <div className={styles.biographyMain}>
     <nav className={styles.biographyContents} aria-label={t('presenter.sections',{name})}>
      <h2>{t('presenter.onPage')}</h2><ol>{sections.map(([id,label])=><li key={id}><Link href={'#'+id}>{label}</Link></li>)}</ol>
     </nav>
     <section id="biography" className={styles.biographySection} aria-labelledby="biography-heading">
      <h2 id="biography-heading">{t('presenter.overview')}</h2>
      {paragraphs.length?paragraphs.map((paragraph,index)=><p className={index===0?styles.biographyLead:undefined} key={index}><OriginalContent inline>{paragraph}</OriginalContent></p>):<p><OriginalContent inline>{profile.practice}</OriginalContent></p>}
     </section>
     <section id="broadcasting" className={styles.biographySection} aria-labelledby="broadcasting-heading">
      <h2 id="broadcasting-heading">{t('presenter.broadcasting')}</h2>
      <p><MessageText catalogue={marketingMessages} message="presenter.broadcastSentence" values={{name:<OriginalContent inline>{name}</OriginalContent>,programmeLink:<Link href="/gallery/urban-news" lang="en-KE">Urban News on PPP TV Kenya</Link>,collaboratorLink:<Link href={profile.collaboratorPath} lang="en-KE">{profile.collaborator}</Link>}}/></p>
      <figure className={styles.biographyStudio}><Link href="/gallery/urban-news"><MediaImage id="M204" alt={t('presenter.studioAlt')}/></Link><figcaption>{t('presenter.studio')}</figcaption></figure>
     </section>
     <section id="selected-work" className={styles.biographySection} aria-labelledby="selected-work-heading">
      <h2 id="selected-work-heading">{t('presenter.work')}</h2>
      <p><MessageText catalogue={marketingMessages} message="presenter.films" values={{archiveLink:<Link href="/work-with-us">{t('presenter.campaignArchive')}</Link>,firstName:<OriginalContent inline>{firstName}</OriginalContent>}}/></p>
      <div className={styles.biographyFilms}>{profile.films.map(id=><MediaFilm key={id} id={id}/>)}</div>
     </section>
     {credits.length>0&&<section id="event-credits" className={styles.biographySection} aria-labelledby="event-credits-heading">
      <h2 id="event-credits-heading">{t('presenter.credits')}</h2>
      <ul className={styles.biographyRecords}>{credits.map(credit=><li key={credit.id}><Link href={credit.href} lang="en-KE">{credit.name}</Link><span lang="en-KE">{credit.date} · {credit.status}</span>{credit.venue&&<span lang="en-KE">{credit.venue}</span>}</li>)}</ul>
     </section>}
     {stories.length>0&&<section id="related-stories" className={styles.biographySection} aria-labelledby="related-stories-heading">
      <h2 id="related-stories-heading">{t('presenter.stories')}</h2>
      <ul className={styles.biographyStories}>{stories.map(story=><li key={story.id}><Link href={story.href} lang="en-KE">{story.headline}</Link></li>)}</ul>
     </section>}
     <section id="photographs" className={styles.biographySection} aria-labelledby="photographs-heading">
      <h2 id="photographs-heading">{t('presenter.photos')}</h2>
      <div className={styles.biographyPhotos}>{['M205','M207',profile.portrait].map(id=><Link key={id} href={id===profile.portrait?'/gallery/hosts-commercial':'/gallery/urban-news'}><MediaImage id={id}/></Link>)}</div>
      <p><Link href="/gallery/hosts-commercial">{t('presenter.photoLink')}</Link> · <Link href="/portfolio">{t('presenter.livePortfolio')}</Link></p>
     </section>
     <section className={styles.biographySection} aria-labelledby="profile-links-heading">
      <h2 id="profile-links-heading">{t('presenter.information')}</h2>
      <ul className={styles.biographyStories}><li><Link href="/about">{t('aboutBrand')}</Link></li><li><Link href="/gallery/urban-news">{t('presenter.newsPhotos')}</Link></li><li><Link href="/work-with-us">{t('presenter.commercial')}</Link></li></ul>
      <ShareActions title={name+' · Urban Gang Tour'} path={profile.path} label={t('presenter.share',{firstName})}/>
     </section>
    </div>

   </div>
  </article>
 </>;
}
