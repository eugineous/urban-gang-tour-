'use client';
import Link from './DocumentLink';
import {MediaImage} from './MediaLibrary';
import {InlineArrow} from './InlineArrow';

const services = [
  {title:'School events',text:'Talent shows, culture days and colour festivals.',image:'M083',href:'/book?type=school',action:'Plan a school event'},
  {title:'Campus Rave',text:'Student stages, performances and campus activations.',image:'M120',href:'/book?type=campus',action:'Plan a campus event'},
  {title:'Live hosting',text:'Eugine and Lucy, together or individually.',image:'M207',href:'/book?type=hosts',action:'Book the hosts'},
  {title:'Event production',text:'Programme, stage and supplier coordination.',image:'M073',href:'/book?type=public',action:'Plan your event'},
  {title:'Brand campaigns',text:'Presenting, campaign films and brand activations.',image:'M204',href:'/work-with-us',action:'View campaign work'},
  {title:'Event listings & tickets',text:'Browse upcoming events and ticket options.',image:'M049',href:'/events',action:'Browse events'},
];

export function ExperiencePage(){
  return <>
    <section className="page-intro wrap"><div><p className="eyebrow">What we do</p><h1>Events, hosting<br/>& production.</h1></div><p>For schools, campuses and brands in Kenya.</p></section>
    <section className="section wrap experience-services" aria-label="Our services"><div className="service-grid visual-services">{services.map(service=><article key={service.title}>
      <Link className="service-image" href={service.href} aria-label={service.action}><MediaImage id={service.image}/></Link>
      <div className="service-copy"><h2>{service.title}</h2><p>{service.text}</p><Link className="text-link" href={service.href}>{service.action} <InlineArrow/></Link></div>
    </article>)}</div></section>
    <section className="wrap experience-next"><div><h2>Request a quote.</h2><p>Tell us your event type, venue and preferred date.</p><details><summary>School pricing</summary><p>School-funded or agreed student tickets. Student pricing can start at KES 250; the programme and school agreement determine your quote.</p></details></div><Link className="button" href="/book">Request a quote <InlineArrow/></Link><Link className="text-link" href="/shop">Shop merchandise <InlineArrow/></Link></section>
  </>;
}
