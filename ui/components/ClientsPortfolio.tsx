'use client';
import {marketingMessages} from '@/ui/i18n/catalogues/marketing';
import {useMessages} from '@/ui/i18n/LanguageProvider';


import Link from './DocumentLink';
import {InlineArrow} from './InlineArrow';
import {asset,MediaImage} from './MediaLibrary';
import styles from './ClientsPortfolio.module.css';

type ClientEntry={id:string;href?:string;action?:string};


function LogoCard({entry,priority=false}:{entry:ClientEntry;priority?:boolean}){const t=useMessages(marketingMessages);
  const contents=<>
    <div className={styles.logo}><MediaImage id={entry.id} priority={priority}/></div>
    <h3 lang="en-KE">{asset(entry.id).title}</h3>
    <span className={styles.action}>{entry.action||t('clients.logo')}{entry.href&&<InlineArrow/>}</span>
  </>;
  return <li>{entry.href?<Link className={styles.card} href={entry.href}>{contents}</Link>:<div className={styles.card}>{contents}</div>}</li>;
}

export function ClientsPortfolio(){const t=useMessages(marketingMessages);const groups:{id:string;title:string;description:string;entries:ClientEntry[]}[]=[
  {id:'client-schools',title:t('schools'),description:t('clients.schools.summary'),entries:[
    {id:'M181',href:'/gallery/school-lari',action:t('clients.schools.action')},
    {id:'M182',href:'/gallery/school-loreto',action:t('clients.schools.action')},
    {id:'M183',href:'/gallery/school-gituamba',action:t('clients.schools.action')},
    {id:'M184',href:'/gallery/school-koinange',action:t('clients.schools.action')},
  ]},
  {id:'client-campuses',title:t('clients.campus.title'),description:t('clients.campus.summary'),entries:[
    {id:'M177'},{id:'M178'},{id:'M185'},
    {id:'M186',href:'/gallery/kips-campus-rave',action:t('clients.campus.action')},
    {id:'M187',href:'/work-with-us',action:t('clients.campaigns')},
    {id:'M188',href:'/gallery/machakos-campus',action:t('clients.campus.action')},
    {id:'M189',href:'/work-with-us',action:t('clients.campaigns')},
    {id:'M190',href:'/work-with-us',action:t('clients.campaigns')},
    {id:'M191',href:'/work-with-us',action:t('clients.campaigns')},
    {id:'M193',href:'/work-with-us',action:t('clients.campaigns')},
    {id:'M194',href:'/work-with-us',action:t('clients.campaigns')},
    {id:'M195'},
    {id:'M196',href:'/gallery/uon-mr-miss-2022',action:t('clients.campus.action')},
  ]},
  {id:'client-media',title:t('clients.media.title'),description:t('clients.media.summary'),entries:[
    {id:'M175',href:'/gallery/urban-news',action:t('clients.broadcast')},
    {id:'M176',href:'/gallery/urban-news',action:t('clients.broadcast')},
    {id:'M179'},
    {id:'M192',href:'/portfolio#campus-work',action:t('clients.campusRave')},
  ]},
];
  return <div className={styles.clients}>
    <section className={'wrap '+styles.intro}>
      <div><p className="eyebrow">{t('clients.eyebrow')}</p><h1>{t('clients.title')}</h1></div>
      <div className={styles.introCopy}>
        <p>{t('clients.summary')}</p>
        <Link className="text-link" href="/portfolio">{t('clients.explore')} <InlineArrow/></Link>
      </div>
    </section>
    <nav className={'wrap '+styles.navigation} aria-label={t('clients.sections')}>
      {groups.map(group=><Link key={group.id} href={'#'+group.id}>{group.title}</Link>)}
    </nav>
    {groups.map((group,index)=><section className={'wrap '+styles.section} id={group.id} key={group.id} aria-labelledby={group.id+'-title'}>
      <div className={styles.heading}><h2 id={group.id+'-title'}>{group.title}</h2><p>{group.description}</p></div>
      <ul className={styles.grid}>{group.entries.map(entry=><LogoCard key={entry.id} entry={entry} priority={index===0}/>)}</ul>
    </section>)}
    <section className={'wrap '+styles.commercial} aria-label={t('clients.adult.label')}>
      <details>
        <summary>{t('clients.adult.title')}</summary>
        <p>{t('clients.adult.summary')}</p>
        <ul className={styles.grid}><LogoCard entry={{id:'M180'}}/></ul>
      </details>
    </section>
    <section className={'wrap '+styles.callout}>
      <div><h2>{t('clients.callout')}</h2><p>{t('clients.discuss')}</p></div>
      <Link className="button" href="/partners">{t('explorePartnerships')} <InlineArrow/></Link>
    </section>
  </div>;
}
