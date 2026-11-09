'use client';
import {ArrowUpRight} from '@phosphor-icons/react';
import {defineCatalogue} from '@/lib/i18n/messages';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {homepagePosterEvents} from '@/ui/lib/home-discovery';
import type {OwnedEvent} from '@/ui/lib/owned-event-presentation';
import {MobileBookingVideo} from './MobileBookingVideo';
import {HostArtwork} from './HostArtwork';
import {MobileEventPoster} from './MobileEventPoster';
import {ambientMessages} from '@/ui/i18n/catalogues/ambient';
import styles from './MobileAppHero.module.css';
const copy=defineCatalogue({
 en:{school:'School Shows',campus:'Campus Concerts',hosting:'Live Hosting',role:'TV & event hosts',events:'Find your next event',book:'Book us',explore:'Explore events',recent:'Recent event · archive',upcoming:'Upcoming event',available:'Events & tickets',video:'See us in action',watch:'Play video',failed:'The video could not load.',retry:'Try video again',videos:'More videos',advertise:'List your event'},
 sw:{school:'Maonyesho ya shule',campus:'Tamasha za vyuo',hosting:'Uendeshaji wa hafla',role:'Watangazaji wa TV na hafla',events:'Tafuta tukio lako',book:'Weka nafasi',explore:'Gundua matukio',recent:'Tukio la hivi karibuni · kumbukumbu',upcoming:'Tukio lijalo',available:'Matukio na tiketi',video:'Tuone jukwaani',watch:'Cheza video',failed:'Video haikuweza kupakiwa.',retry:'Jaribu video tena',videos:'Video zaidi',advertise:'Tangaza tukio lako'},
 fr:{school:'Spectacles scolaires',campus:'Concerts étudiants',hosting:'Animation en direct',role:'Présentateurs TV et événements',events:'Votre prochain événement',book:'Nous réserver',explore:'Voir les événements',recent:'Événement récent · archives',upcoming:'Événement à venir',available:'Événements et billets',video:'Nous voir en action',watch:'Lire la vidéo',failed:'La vidéo n’a pas pu être chargée.',retry:'Réessayer la vidéo',videos:'Plus de vidéos',advertise:'Proposer un événement'},
 'zh-Hans':{school:'学校演出',campus:'大学音乐会',hosting:'现场主持',role:'电视与活动主持人',events:'发现下一场活动',book:'预约我们',explore:'探索活动',recent:'近期活动 · 存档',upcoming:'即将举行的活动',available:'活动与门票',video:'看看我们的现场表现',watch:'播放视频',failed:'视频无法加载。',retry:'重试视频',videos:'更多视频',advertise:'发布您的活动'},
 ru:{school:'Школьные шоу',campus:'Концерты в вузах',hosting:'Ведение мероприятий',role:'Ведущие ТВ и мероприятий',events:'Найдите своё событие',book:'Заказать нас',explore:'Все события',recent:'Недавнее событие · архив',upcoming:'Предстоящее событие',available:'События и билеты',video:'Посмотрите нас в деле',watch:'Смотреть видео',failed:'Не удалось загрузить видео.',retry:'Повторить загрузку',videos:'Другие видео',advertise:'Разместить событие'},
 es:{school:'Espectáculos escolares',campus:'Conciertos universitarios',hosting:'Presentación en directo',role:'Presentadores de TV y eventos',events:'Tu próximo evento',book:'Reservarnos',explore:'Explorar eventos',recent:'Evento reciente · archivo',upcoming:'Próximo evento',available:'Eventos y entradas',video:'Míranos en acción',watch:'Reproducir vídeo',failed:'No se pudo cargar el vídeo.',retry:'Reintentar vídeo',videos:'Más vídeos',advertise:'Publicar tu evento'},
});
export function MobileAppHero({events=[],now=0,current=true}:{events?:OwnedEvent[];now?:number;current?:boolean}={}){
 const t=useMessages(copy),motion=useMessages(ambientMessages),items=homepagePosterEvents(events,now,current);
 return <section className={styles.hero} data-mobile-app-hero aria-label="Urban Gang Tour">
  <div className={styles.stage}>
   <h1 data-home-reveal><span>URBAN</span><span>GANG</span><span>TOUR</span></h1>
   <HostArtwork hero/>
   <ul className={styles.intro} data-mobile-services data-home-reveal>{(['school','campus','hosting'] as const).map(key=><li key={key}>{t(key)}</li>)}</ul>
  </div>
  <div className={styles.cards} data-home-reveal>
   <a href="/book" className={styles.hostCard} data-mobile-host-card>
    <span className={styles.cardImage}><HostArtwork/></span>
    <div className={styles.cardCopy}><strong lang="en-KE">Eugine &amp; Lucy</strong><span>{t('role')}</span></div>
    <span className={styles.cardAction}>{t('book')}<ArrowUpRight size={21} aria-hidden="true"/></span>
   </a>
   <MobileEventPoster key={items.map(item=>String(item.event.id)).join('|')} items={items} labels={{title:t('events'),recent:t('recent'),upcoming:t('upcoming'),available:t('available'),explore:t('explore'),pause:motion('pauseEvents'),resume:motion('resumeEvents')}}/>
  </div>
  <MobileBookingVideo labels={{title:t('video'),play:t('watch'),failed:t('failed'),retry:t('retry'),videos:t('videos'),book:t('book'),advertise:t('advertise')}}/>
 </section>;
}
