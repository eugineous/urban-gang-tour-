'use client';

import Link from './DocumentLink';
import {InlineArrow} from './InlineArrow';
import {asset,MediaImage} from './MediaLibrary';
import styles from './ClientsPortfolio.module.css';

type ClientEntry={id:string;href?:string;action?:string};
const groups:{id:string;title:string;description:string;entries:ClientEntry[]}[]=[
  {id:'client-schools',title:'Schools',description:'Completed tour stops, with photos in the school archive.',entries:[
    {id:'M181',href:'/gallery/school-lari',action:'School event archive'},
    {id:'M182',href:'/gallery/school-loreto',action:'School event archive'},
    {id:'M183',href:'/gallery/school-gituamba',action:'School event archive'},
    {id:'M184',href:'/gallery/school-koinange',action:'School event archive'},
  ]},
  {id:'client-campuses',title:'Campuses & institutions',description:'Campus event collections, institutional campaign films and supplied logos.',entries:[
    {id:'M177'},{id:'M178'},{id:'M185'},
    {id:'M186',href:'/gallery/kips-campus-rave',action:'Campus event archive'},
    {id:'M187',href:'/work-with-us',action:'View campaign films'},
    {id:'M188',href:'/gallery/machakos-campus',action:'Campus event archive'},
    {id:'M189',href:'/work-with-us',action:'View campaign films'},
    {id:'M190',href:'/work-with-us',action:'View campaign films'},
    {id:'M191',href:'/work-with-us',action:'View campaign films'},
    {id:'M193',href:'/work-with-us',action:'View campaign films'},
    {id:'M194',href:'/work-with-us',action:'View campaign films'},
    {id:'M195'},
    {id:'M196',href:'/gallery/uon-mr-miss-2022',action:'Campus event archive'},
  ]},
  {id:'client-media',title:'Media & event brands',description:'Broadcast work and event identities from the archive.',entries:[
    {id:'M175',href:'/gallery/urban-news',action:'Broadcast archive'},
    {id:'M176',href:'/gallery/urban-news',action:'Broadcast archive'},
    {id:'M179'},
    {id:'M192',href:'/portfolio#campus-work',action:'Campus Rave archive'},
  ]},
];

function LogoCard({entry,priority=false}:{entry:ClientEntry;priority?:boolean}){
  const contents=<>
    <div className={styles.logo}><MediaImage id={entry.id} priority={priority}/></div>
    <h3>{asset(entry.id).title}</h3>
    <span className={styles.action}>{entry.action||'Supplied logo'}{entry.href&&<InlineArrow/>}</span>
  </>;
  return <li>{entry.href?<Link className={styles.card} href={entry.href}>{contents}</Link>:<div className={styles.card}>{contents}</div>}</li>;
}

export function ClientsPortfolio(){
  return <div className={styles.clients}>
    <section className={'wrap '+styles.intro}>
      <div><p className="eyebrow">From the archive</p><h1>Our clients.</h1></div>
      <div className={styles.introCopy}>
        <p>Supplied logos and links to past work, including the founders’ earlier projects.</p>
        <Link className="text-link" href="/portfolio">Explore our work <InlineArrow/></Link>
      </div>
    </section>
    <nav className={'wrap '+styles.navigation} aria-label="Client archive sections">
      {groups.map(group=><Link key={group.id} href={'#'+group.id}>{group.title}</Link>)}
    </nav>
    {groups.map((group,index)=><section className={'wrap '+styles.section} id={group.id} key={group.id} aria-labelledby={group.id+'-title'}>
      <div className={styles.heading}><h2 id={group.id+'-title'}>{group.title}</h2><p>{group.description}</p></div>
      <ul className={styles.grid}>{group.entries.map(entry=><LogoCard key={entry.id} entry={entry} priority={index===0}/>)}</ul>
    </section>)}
    <section className={'wrap '+styles.commercial} aria-label="Adult campaign archive">
      <details>
        <summary>Adult commercial campaigns (18+)</summary>
        <p>Betting campaigns from the founders’ commercial archive, kept separate from school and youth work.</p>
        <ul className={styles.grid}><LogoCard entry={{id:'M180'}}/></ul>
      </details>
    </section>
    <section className={'wrap '+styles.callout}>
      <div><h2>Work with us.</h2><p>Discuss an event, campaign or partnership.</p></div>
      <Link className="button" href="/partners">Explore partnerships <InlineArrow/></Link>
    </section>
  </div>;
}
