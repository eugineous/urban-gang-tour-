'use client';
import {ArrowUpRight,Microphone,ChatCircleText} from '@phosphor-icons/react';
import {defineCatalogue} from '@/lib/i18n/messages';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import styles from './ContactEntry.module.css';
const copy=defineCatalogue({en:{title:'Contact',intro:'How can we help?',book:'Book Eugine & Lucy',contact:'Just contact us'},sw:{title:'Wasiliana',intro:'Tukusaidieje?',book:'Weka nafasi ya Eugine na Lucy',contact:'Wasiliana nasi'},fr:{title:'Contact',intro:'Comment vous aider ?',book:'Réserver Eugine et Lucy',contact:'Nous contacter'},'zh-Hans':{title:'联系',intro:'我们能如何帮助您？',book:'预约 Eugine 和 Lucy',contact:'联系我们'},ru:{title:'Связаться',intro:'Чем мы можем помочь?',book:'Пригласить Eugine и Lucy',contact:'Связаться с нами'},es:{title:'Contacto',intro:'¿Cómo podemos ayudarte?',book:'Reservar a Eugine y Lucy',contact:'Contactarnos'}});
export function ContactEntry(){const t=useMessages(copy);return <section className={styles.entry} data-contact-entry><h1>{t('title')}</h1><div><a href="/book"><Microphone size={24} aria-hidden="true"/><span>{t('book')}</span><ArrowUpRight size={20} aria-hidden="true"/></a><a href="/contact-us"><ChatCircleText size={24} aria-hidden="true"/><span>{t('contact')}</span><ArrowUpRight size={20} aria-hidden="true"/></a></div></section>}
