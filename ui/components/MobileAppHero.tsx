'use client';
import {ArrowUpRight} from '@phosphor-icons/react';
import {defineCatalogue} from '@/lib/i18n/messages';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import styles from './MobileAppHero.module.css';
const copy=defineCatalogue({
 en:{intro:'School shows.\nCampus concerts.\nLive hosting.',hosts:'Meet your hosts',events:'Find your next event',book:'Book the team',explore:'Explore events'},
 sw:{intro:'Maonyesho ya shule. Tamasha za vyuo. Uendeshaji wa hafla.',hosts:'Kutana na waandaji',events:'Tafuta tukio lako',book:'Weka nafasi',explore:'Gundua matukio'},
 fr:{intro:'Spectacles scolaires. Concerts étudiants. Animation.',hosts:'Vos animateurs',events:'Votre prochain événement',book:'Réserver l’équipe',explore:'Voir les événements'},
 'zh-Hans':{intro:'校园演出。大学音乐会。现场主持。',hosts:'认识主持人',events:'发现下一场活动',book:'预约团队',explore:'探索活动'},
 ru:{intro:'Школьные шоу. Студенческие концерты. Ведущие.',hosts:'Наши ведущие',events:'Найдите своё событие',book:'Заказать команду',explore:'Все события'},
 es:{intro:'Espectáculos escolares. Conciertos universitarios. Presentación.',hosts:'Tus presentadores',events:'Tu próximo evento',book:'Reservar al equipo',explore:'Explorar eventos'},
});
export function MobileAppHero(){const t=useMessages(copy);return <section className={styles.hero} data-mobile-app-hero aria-label="Urban Gang Tour">
 <div className={styles.stage}>
  <h1><span>URBAN</span><span>GANG<span className={styles.dot}>.</span></span><span>TOUR</span></h1>
  <picture className={styles.portrait}><source media="(max-width:767px), (max-device-width:600px) and (pointer:coarse)" srcSet="/assets/mobile/eugine-editorial.webp"/><img src="/icon-48.png" width="850" height="1136" alt="Illustrated portrait of Eugine Micah, based on an Urban Gang Tour photograph" fetchPriority="high"/></picture>
  <p className={styles.intro}>{t('intro')}</p>
 </div>
 <div className={styles.cards}>
  <a href="/book" className={styles.hostCard}><picture className={styles.cardImage}><source media="(max-width:767px), (max-device-width:600px) and (pointer:coarse)" srcSet="/assets/mobile/eugine-editorial.webp"/><img src="/icon-48.png" width="850" height="1136" alt=""/></picture><strong>{t('hosts')}</strong><span className={styles.cardAction}>{t('book')}<ArrowUpRight size={21} aria-hidden="true"/></span></a>
  <a href="/events" className={styles.eventCard}><span className={styles.cardImage}><img src="/media-library/a4499d970f6ef310.webp" alt="" loading="lazy"/></span><strong>{t('events')}</strong><span className={styles.cardAction}>{t('explore')}<ArrowUpRight size={21} aria-hidden="true"/></span></a>
 </div>
 </section>}
