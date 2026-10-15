'use client';
import Link from './DocumentLink';
import {MediaImage} from './MediaLibrary';
import {InlineArrow} from './InlineArrow';

const services = [
  {title:'School events',text:'Talent shows, culture days and colour festivals.',image:'M083',href:'/book?type=school',action:'Plan a school event'},
  {title:'Campus Rave',text:'Student stages, performances and campus activations.',image:'M120',href:'/book?type=campus',action:'Plan a campus event'},
  {title:'Live hosting',text:'Eugine & Lucy. Together or individually.',image:'M207',href:'/book?type=hosts',action:'Book the hosts'},
  {title:'Event production',text:'Programme, stage and supplier coordination.',image:'M073',href:'/book?type=public',action:'Plan your event'},
  {title:'Brand campaigns',text:'Presenting and production for your audience.',image:'M204',href:'/work-with-us',action:'View campaign work'},
  {title:'Events & merchandise',text:'Find your next event. Wear the tour.',image:'M049',href:'/events',action:'Find events'},
];

export function ExperiencePage(){
  return <>
    <section className="page-intro wrap"><div><p className="eyebrow">What we do</p><h1>The experience.</h1></div><p>School stages. Campus culture. Live moments.</p></section>
    <section className="section wrap experience-services" aria-label="Our services"><div className="service-grid visual-services">{services.map(service=><article key={service.title}>
      <Link className="service-image" href={service.href} aria-label={service.action}><MediaImage id={service.image}/></Link>
      <div className="service-copy"><h2>{service.title}</h2><p>{service.text}</p><Link className="text-link" href={service.href}>{service.action} <InlineArrow/></Link></div>
    </article>)}</div></section>
    <section className="wrap experience-next"><div><h2>Make it yours.</h2><p>Your audience. Your venue. A programme we agree together.</p><details><summary>School pricing</summary><p>School-funded or agreed student tickets. Student pricing can start at KES 250; the programme and school agreement determine your quote.</p></details></div><Link className="button" href="/book">Request a quote <InlineArrow/></Link><Link className="text-link" href="/shop">Shop the tour <InlineArrow/></Link></section>
  </>;
}
