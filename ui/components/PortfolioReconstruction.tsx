'use client';
import {marketingMessages,type MarketingKey} from '@/ui/i18n/catalogues/marketing';
import {MessageText} from '@/ui/i18n/MessageText';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {OriginalContent} from '@/ui/i18n/OriginalContent';
import type {MessageValues} from '@/lib/i18n/messages';


import {Fragment,useState} from 'react';
import {InlineArrow} from './InlineArrow';
import Link from './DocumentLink';
import {asset, collections, media} from './MediaLibrary';
import {ShowcaseShelf, type ShowcaseItem} from './ShowcaseShelf';
import {completedSchoolWork} from '../lib/portfolio-events';
import {ownedEventPresentation, publicOwnedEvents, type OwnedEvent} from '../lib/owned-event-presentation';
import {normalizePosterUrl, posterUrl, publicPartnerDetails} from '../../lib/partner-events';
import styles from './ShowcaseShelf.module.css';

const text=(value:unknown) => typeof value==='string' ? value.trim() : '';
type Translate=(key:MarketingKey,values?:MessageValues)=>string;

function collectionItem(slug:string,t:Translate):ShowcaseItem[] {
  const collection=collections.find(item => item.slug===slug);
  if (!collection) return [];
  const photographs=media.filter(item => item.collection===slug && item.kind==='photograph').length;
  return [{id:'collection-'+slug,title:collection.title,href:'/gallery/'+slug,label:<MessageText catalogue={marketingMessages} message="item.collection" values={{category:<OriginalContent inline>{collection.category}</OriginalContent>}}/>,description:collection.description,mediaId:collection.coverId,action:t('item.photos',{count:photographs})}];
}

function filmItem(id:string,t:Translate):ShowcaseItem[] {
  const film=asset(id);
  if (!film || film.kind!=='video' || film.adult || !film.poster) return [];
  const seconds=Math.round(film.duration || 0);
  const filmDuration=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  return [{id:'film-'+id,title:film.title,href:film.src,label:<MessageText catalogue={marketingMessages} message="item.filmArchive"/>,mediaId:id,imageAlt:t('item.filmPoster',{title:film.title}),action:t('item.openFilm'),filmDuration}];
}

function eventItem(event:OwnedEvent, now:number,t:Translate):ShowcaseItem {
  const view=ownedEventPresentation(event, now);
  const image=normalizePosterUrl(text(event.image));
  const partner=event.kind==='partner' ? publicPartnerDetails(event.partnerDetails) : null;
  const venue=[text(event.venue),text(event.city)].filter((value,index,values) => value && values.indexOf(value)===index).join(', ');
  const parts=[partner?.role&&<OriginalContent inline>{partner.role}</OriginalContent>,partner?.institutions.length&&<OriginalContent inline>{partner.institutions.join(' · ')}</OriginalContent>,partner?.client&&<MessageText catalogue={marketingMessages} message="item.client" values={{client:<OriginalContent inline>{partner.client}</OriginalContent>}}/>,venue&&<OriginalContent inline>{venue}</OriginalContent>].filter(Boolean);
  const description=parts.map((part,index)=><Fragment key={index}>{index>0&&' · '}{part}</Fragment>);
  return {id:'event-'+String(event.id || event.slug),title:text(event.name),href:view.href,label:view.label+' · '+view.dateLabel,description,image:posterUrl(image)?image:undefined,imageAlt:t('item.eventImage',{name:text(event.name)}),action:t('item.record')};
}

export function PortfolioPage({events=[], initialNow}:{events?:OwnedEvent[];initialNow?:number}) {const t=useMessages(marketingMessages);
  const [now]=useState(() => initialNow ?? Date.now());
  const schools=completedSchoolWork(events, now).map(event => eventItem(event, now,t));
  const completedLive=publicOwnedEvents(events, now).filter(event => event.kind!=='school' && event.status==='completed' && /^[a-z0-9-]{1,80}$/.test(text(event.slug))).map(event => eventItem(event, now,t));
  const campus=['machakos-campus','uon-mr-miss-2022','tibs-campus','kips-campus-rave'].flatMap(slug=>collectionItem(slug,t));
  const campaigns=[...['M210','M213','M215','M214','M216','M219','M220'].flatMap(id=>filmItem(id,t)),...['tecno-uon','infinix-kicc'].flatMap(slug=>collectionItem(slug,t))];
  const live=[...completedLive,...collectionItem('nairobi-choirs',t),...['M092','M093','M112','M113','M114'].flatMap(id=>filmItem(id,t))];
  const broadcast:ShowcaseItem[]=media.filter(item => item.collection==='urban-news' && item.kind==='photograph').map((photo,index) => ({id:'photo-'+photo.id,title:t('item.broadcastPhoto',{number:String(index+1).padStart(2,'0')}),titleContent:<MessageText catalogue={marketingMessages} message="item.broadcastPhoto" values={{number:String(index+1).padStart(2,'0')}}/>,href:photo.src,label:<MessageText catalogue={marketingMessages} message="item.broadcastArchive"/>,mediaId:photo.id,imageAlt:photo.title+' '+String(index+1),action:t('item.openPhoto')}));

  return <div className={styles.portfolio}>
    <section className={'wrap '+styles.intro}><div><p className="eyebrow">{t('presenter.work')}</p><h1>{t('portfolio.title')}</h1></div><div className={styles.introAside}><p>{t('portfolio.summary')}</p><Link className="button" href="/book">{t('bookTeam')} <InlineArrow/></Link></div></section>
    <nav className={'wrap '+styles.navigation} aria-label={t('portfolio.sections')}>{[[t('schools'),'school-work'],['Campus Rave','campus-work'],[t('campaigns'),'campaign-work'],[t('liveEvents'),'live-work'],[t('broadcast'),'media-work']].map(([label,id]) => <Link key={id} href={'#'+id} lang={id==='campus-work'?'en-KE':undefined}>{label}</Link>)}</nav>
    <ShowcaseShelf factoryCopy originalLabel id="school-work" label="01 · Urban Gang Tour" title={t('portfolio.school.title')} description={t('portfolio.school.summary')} items={schools} emptyMessage={t('portfolio.school.empty')} footer={<><Link className="text-link" href="/events?kind=school&period=all">{t('portfolio.school.records')} <InlineArrow/></Link><Link className="text-link" href="/tour-stops">{t('portfolio.school.calendar')} <InlineArrow/></Link></>}/>
    <ShowcaseShelf factoryCopy originalLabel id="campus-work" label="02 · Campus Rave" title={t('portfolio.campus.title')} description={t('portfolio.campus.summary')} items={campus}/>
    <ShowcaseShelf factoryCopy id="campaign-work" label={t('portfolio.campaign.label')} title={t('portfolio.campaign.title')} description={t('portfolio.campaign.summary')} items={campaigns} footer={<Link className="text-link" href="/work-with-us">{t('portfolio.campaign.all')} <InlineArrow/></Link>}/>
    <ShowcaseShelf factoryCopy id="live-work" label={t('portfolio.live.label')} title={t('portfolio.live.title')} description={t('portfolio.live.summary')} items={live} footer={<Link className="text-link" href="/book?type=public">{t('planEvent')} <InlineArrow/></Link>}/>
    <ShowcaseShelf factoryCopy originalTitle id="media-work" label={t('portfolio.broadcast.label')} title="Urban News." description={t('portfolio.broadcast.summary')} items={broadcast} footer={<><Link className="text-link" href="/gallery/urban-news">{t('portfolio.broadcast.photos')} <InlineArrow/></Link><Link className="text-link" href="/press">{t('pressEnquiries')} <InlineArrow/></Link></>}/>
    <section className={'wrap '+styles.callout}><h2>{t('portfolio.callout')}</h2><Link className="button" href="/book">{t('requestQuote')} <InlineArrow/></Link></section>
  </div>;
}
