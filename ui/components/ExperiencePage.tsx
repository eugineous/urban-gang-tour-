'use client';
import {marketingMessages} from '@/ui/i18n/catalogues/marketing';
import {MessageText} from '@/ui/i18n/MessageText';
import {useMessages} from '@/ui/i18n/LanguageProvider';

import Link from './DocumentLink';
import {MediaImage} from './MediaLibrary';
import {InlineArrow} from './InlineArrow';



export function ExperiencePage(){const t=useMessages(marketingMessages);const services = [
  {title:t('schoolEvents'),text:t('experience.school.text'),image:'M083',href:'/book?type=school',action:t('experience.school.action')},
  {title:'Campus Rave',original:true,text:t('experience.campus.text'),image:'M120',href:'/book?type=campus',action:t('experience.campus.action')},
  {title:t('experience.hosting.title'),text:t('experience.hosting.text'),image:'M207',href:'/book?type=hosts',action:t('experience.hosting.action')},
  {title:t('experience.production.title'),text:t('experience.production.text'),image:'M073',href:'/book?type=public',action:t('experience.production.action')},
  {title:t('experience.campaigns.title'),text:t('experience.campaigns.text'),image:'M204',href:'/work-with-us',action:t('experience.campaigns.action')},
  {title:t('experience.ticketing.title'),text:t('experience.ticketing.text'),image:'M049',href:'/events',action:t('browseEvents')},
];
  return <>
    <section className="page-intro wrap"><div><p className="eyebrow">{t('whatWeDo')}</p><h1><MessageText catalogue={marketingMessages} message="experience.title" values={{br:<br/>}}/></h1></div><p>{t('experience.summary')}</p></section>
    <section className="section wrap experience-services" aria-label={t('experience.services')}><div className="service-grid visual-services">{services.map(service=><article key={service.href}>
      <Link className="service-image" href={service.href} aria-label={service.action}><MediaImage id={service.image}/></Link>
      <div className="service-copy"><h2 lang={service.original?'en-KE':undefined}>{service.title}</h2><p>{service.text}</p><Link className="text-link" href={service.href}>{service.action} <InlineArrow/></Link></div>
    </article>)}</div></section>
    <section className="wrap experience-next"><div><h2>{t('quote.title')}</h2><p>{t('quote.summary')}</p><details><summary>{t('quote.pricing')}</summary><p>{t('quote.conditions')}</p></details></div><Link className="button" href="/book">{t('requestQuote')} <InlineArrow/></Link><Link className="text-link" href="/shop">{t('shopMerchandise')} <InlineArrow/></Link></section>
  </>;
}
