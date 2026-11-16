'use client';
import {ArrowUpRight,Microphone,ChatCircleText} from '@phosphor-icons/react';
import {defineCatalogue} from '@/lib/i18n/messages';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import styles from './ContactEntry.module.css';
const copy=defineCatalogue({en:{title:'Contact',intro:'How can we help?',book:'Book Us',contact:'Send an enquiry'},sw:{title:'Wasiliana',intro:'Tukusaidieje?',book:'Tualike',contact:'Tuma swali'},fr:{title:'Contact',intro:'Comment vous aider ?',book:'Réservez-nous',contact:'Envoyer une demande'},'zh-Hans':{title:'联系',intro:'我们能如何帮助您？',book:'预约我们',contact:'发送咨询'},ru:{title:'Связаться',intro:'Чем мы можем помочь?',book:'Пригласить нас',contact:'Отправить запрос'},es:{title:'Contacto',intro:'¿Cómo podemos ayudarte?',book:'Contrátanos',contact:'Enviar una consulta'}});
export function ContactEntry(){const t=useMessages(copy);return <section className={styles.entry} data-contact-entry><h1>{t('title')}</h1><div><a href="/book"><Microphone size={24} aria-hidden="true"/><span>{t('book')}</span><ArrowUpRight size={20} aria-hidden="true"/></a><a href="/contact-us"><ChatCircleText size={24} aria-hidden="true"/><span>{t('contact')}</span><ArrowUpRight size={20} aria-hidden="true"/></a></div></section>}
