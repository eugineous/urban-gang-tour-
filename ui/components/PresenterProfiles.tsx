'use client';
import Link from './DocumentLink';
import {InlineArrow} from './InlineArrow';
import {MediaImage,MediaFilm} from './MediaLibrary';
import styles from './PortfolioProfiles.module.css';
import {WEBSITE_DEFAULTS,type WebsiteContent} from '@/lib/website-content';

export function PresenterProfile({lucy=false,content=null}:{lucy?:boolean;content?:WebsiteContent|null}){
  const name=lucy?'Lucy Ogunde':'Eugine Micah',firstName=lucy?'Lucy':'Eugine';
  const booking='/book?type=hosts&host='+(lucy?'lucy':'eugine');
  const roles=lucy?['TV presenter','MC','Event host']:['TV presenter','Journalist','MC','Event host','Creative producer'];
  const films=lucy?['M215','M216','M220']:['M210','M213','M219'];
  return <>
    <nav className="breadcrumbs wrap" aria-label="Breadcrumb"><Link href="/about">About</Link><span aria-hidden="true">/</span><span aria-current="page">{name}</span></nav>
    <section className={`wrap ${styles.profileHero}`} aria-labelledby="presenter-name"><figure>{content?.image?<img src={content.image} alt={name}/>:<MediaImage id={lucy?'M229':'M231'} alt={name} priority/>}</figure><div><p className="eyebrow">Meet the hosts</p><h1 id="presenter-name">{content?.title||(lucy?<>Lucy<br/>Ogunde.</>:<>Eugine<br/>Micah.</>)}</h1><p className={styles.profileDeck}>{content?.summary??'On screen. On stage. With you.'}</p><div className="role-tags">{roles.map(role=><span key={role}>{role}</span>)}</div><div className={styles.profileActions}><Link href={booking} className="button">Book {firstName} <InlineArrow/></Link><Link href="#selected-work" className="text-link">Watch the work <InlineArrow/></Link></div></div></section>
    <nav className={`wrap ${styles.profileNavigation}`} aria-label={name+' profile sections'}><Link href="#biography">Biography</Link><Link href="#selected-work">Films</Link><Link href="#broadcasting">Urban News</Link><Link href="#photographs">Photos</Link></nav>
    <section className={`section wrap ${styles.profileEditorial}`} id="biography"><aside><p className="eyebrow">Biography</p><h2>Meet {firstName}.</h2></aside><div className={styles.profileArticle}>{(content?.body??WEBSITE_DEFAULTS[lucy?'/author/lucy-ogunde':'/author/eugine-micah'].body).map((paragraph,index)=><p className={index===0?styles.articleLead:undefined} key={index}>{paragraph}</p>)}</div></section>
    <section id="selected-work" className={`section wrap ${styles.profileWork}`}><div className="section-title"><p className="eyebrow">Selected campaigns</p><h2>Watch {firstName}.</h2></div><div className="film-grid">{films.map(id=><MediaFilm key={id} id={id}/>)}</div><div className="section-end"><Link href="/work-with-us" className="text-link">All campaign films <InlineArrow/></Link></div></section>
    <section id="broadcasting" className={`section wrap ${styles.profileBroadcast}`}><div className="section-title"><p className="eyebrow">Broadcasting</p><h2>Urban News.</h2></div><div className={styles.mediaFeature}><Link href="/gallery/urban-news"><MediaImage id="M204" alt="Eugine Micah and Lucy Ogunde in the Urban News studio"/></Link><div><div className={styles.broadcastMarks}><MediaImage id="M175"/><MediaImage id="M176"/></div><h3>With {lucy?'Eugine Micah':'Lucy Ogunde'}.<br/>PPP TV Kenya.</h3><p>Television presenting and culture stories, alongside the tour’s live work.</p><Link className="text-link" href="/gallery/urban-news">View the studio collection <InlineArrow/></Link></div></div></section>
    <section id="photographs" className="section wrap presenter-photos"><div className="section-title"><p className="eyebrow">Photography</p><h2>Behind the screen.</h2></div><div className="presenter-photo-grid">{['M205','M207',lucy?'M229':'M234'].map(id=><Link key={id} href={id==='M229'||id==='M234'?'/gallery/hosts-commercial':'/gallery/urban-news'}><MediaImage id={id}/></Link>)}</div><div className="section-end"><Link className="text-link" href="/gallery/hosts-commercial">Campaign photography <InlineArrow/></Link><Link className="text-link" href="/portfolio">Live event portfolio <InlineArrow/></Link></div></section>
    <section id="professional-enquiries" className="archive-callout wrap"><div><h2>Work with {firstName}.</h2><Link className="text-link" href="/press">Press & interviews <InlineArrow/></Link></div><Link className="button" href={booking}>Discuss an appearance <InlineArrow/></Link></section>
  </>;
}
