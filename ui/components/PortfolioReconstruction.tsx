'use client';

import {useState} from 'react';
import {InlineArrow} from './InlineArrow';
import Link from './DocumentLink';
import {asset, collections, media} from './MediaLibrary';
import {ShowcaseShelf, type ShowcaseItem} from './ShowcaseShelf';
import {completedSchoolWork} from '../lib/portfolio-events';
import {ownedEventPresentation, publicOwnedEvents, type OwnedEvent} from '../lib/owned-event-presentation';
import {normalizePosterUrl, posterUrl, publicPartnerDetails} from '../../lib/partner-events';
import styles from './ShowcaseShelf.module.css';

const text=(value:unknown) => typeof value==='string' ? value.trim() : '';

function collectionItem(slug:string):ShowcaseItem[] {
  const collection=collections.find(item => item.slug===slug);
  if (!collection) return [];
  const photographs=media.filter(item => item.collection===slug && item.kind==='photograph').length;
  return [{id:'collection-'+slug,title:collection.title,href:'/gallery/'+slug,label:collection.category+' · Archive collection',description:collection.description,mediaId:collection.coverId,action:'View '+photographs+' photos'}];
}

function filmItem(id:string):ShowcaseItem[] {
  const film=asset(id);
  if (!film || film.kind!=='video' || film.adult || !film.poster) return [];
  const seconds=Math.round(film.duration || 0);
  const filmDuration=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  return [{id:'film-'+id,title:film.title,href:film.src,label:'Film archive',mediaId:id,imageAlt:film.title+' · Film poster',action:'Open film',filmDuration}];
}

function eventItem(event:OwnedEvent, now:number):ShowcaseItem {
  const view=ownedEventPresentation(event, now);
  const image=normalizePosterUrl(text(event.image));
  const partner=event.kind==='partner' ? publicPartnerDetails(event.partnerDetails) : null;
  const venue=[text(event.venue),text(event.city)].filter((value,index,values) => value && values.indexOf(value)===index).join(', ');
  const description=[partner?.role,partner?.institutions.join(' · '),partner?.client?'For '+partner.client:'',venue].filter(Boolean).join(' · ');
  return {id:'event-'+String(event.id || event.slug),title:text(event.name),href:view.href,label:view.label+' · '+view.dateLabel,description,image:posterUrl(image)?image:undefined,imageAlt:'Event image: '+text(event.name),action:'View work record'};
}

export function PortfolioPage({events=[], initialNow}:{events?:OwnedEvent[];initialNow?:number}) {
  const [now]=useState(() => initialNow ?? Date.now());
  const schools=completedSchoolWork(events, now).map(event => eventItem(event, now));
  const completedLive=publicOwnedEvents(events, now).filter(event => event.kind!=='school' && event.status==='completed' && /^[a-z0-9-]{1,80}$/.test(text(event.slug))).map(event => eventItem(event, now));
  const campus=['machakos-campus','uon-mr-miss-2022','tibs-campus','kips-campus-rave'].flatMap(collectionItem);
  const campaigns=[...['M210','M213','M215','M214','M216','M219','M220'].flatMap(filmItem),...['tecno-uon','infinix-kicc'].flatMap(collectionItem)];
  const live=[...completedLive,...collectionItem('nairobi-choirs'),...['M092','M093','M112','M113','M114'].flatMap(filmItem)];
  const broadcast:ShowcaseItem[]=media.filter(item => item.collection==='urban-news' && item.kind==='photograph').map((photo,index) => ({id:'photo-'+photo.id,title:'Urban News · Photo '+String(index+1).padStart(2,'0'),href:photo.src,label:'Broadcast archive · Eugine & Lucy',mediaId:photo.id,imageAlt:photo.title+' '+String(index+1),action:'Open archive photo'}));

  return <div className={styles.portfolio}>
    <section className={'wrap '+styles.intro}><div><p className="eyebrow">Selected work</p><h1>Our work.</h1></div><div className={styles.introAside}><p>Published Urban Gang Tour event records, alongside the founders’ earlier stage and media archive. Browse each shelf from left to right; Next starts again after the last item.</p><Link className="button" href="/book">Discuss your event <InlineArrow/></Link></div></section>
    <nav className={'wrap '+styles.navigation} aria-label="Portfolio sections">{[['Schools','school-work'],['Campus Rave','campus-work'],['Campaigns','campaign-work'],['Live events','live-work'],['Broadcast','media-work']].map(([label,id]) => <Link key={id} href={'#'+id}>{label}</Link>)}</nav>
    <ShowcaseShelf id="school-work" label="01 · Urban Gang Tour" title="Completed school events." description="Published records of completed school stops. Planning visits and upcoming dates stay in the school calendar." items={schools} emptyMessage="Completed school records will appear here when published." footer={<><Link className="text-link" href="/events?kind=school&period=all">School event records <InlineArrow/></Link><Link className="text-link" href="/tour-stops">School calendar <InlineArrow/></Link></>}/>
    <ShowcaseShelf id="campus-work" label="02 · Campus Rave" title="Campus energy." description="Stage, crowd and campus collections from the founders’ archive." items={campus}/>
    <ShowcaseShelf id="campaign-work" label="03 · Campaigns" title="On camera." description="Institutional films and brand activation collections. Select a film poster to open the original video." items={campaigns} footer={<Link className="text-link" href="/work-with-us">All campaign films <InlineArrow/></Link>}/>
    <ShowcaseShelf id="live-work" label="04 · Live events" title="Music. Culture. Connection." description="Completed public event records, alongside live music photos and films from the archive." items={live} footer={<Link className="text-link" href="/book?type=public">Plan an event <InlineArrow/></Link>}/>
    <ShowcaseShelf id="media-work" label="05 · Broadcast" title="Urban News." description="Eugine & Lucy at PPP TV Kenya, from the hosts’ broadcast photo archive." items={broadcast} footer={<><Link className="text-link" href="/gallery/urban-news">View studio photos <InlineArrow/></Link><Link className="text-link" href="/press">Press enquiries <InlineArrow/></Link></>}/>
    <section className={'wrap '+styles.callout}><h2>Let’s make your next moment.</h2><Link className="button" href="/book">Book the tour <InlineArrow/></Link></section>
  </div>;
}
