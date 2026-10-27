import {MessageText} from '@/ui/i18n/MessageText';
import {helpMessages} from '@/ui/i18n/catalogues/help';
import type {Metadata} from 'next';
import {SITE} from '@/lib/site';
import {TICKETING_GUIDE,TICKETING_ALTERNATIVES,TICKETING_CRITERIA,TICKETING_WORKFLOW,TICKETING_QUESTIONS,ticketingGuideStructuredData} from '@/lib/ticketing-guide';
import {JsonLd} from '@/app/_components/JsonLd';
import Link from '@/ui/components/DocumentLink';
import styles from './Ticketing.module.css';

const canonical=SITE.domain+TICKETING_GUIDE.path;
export const metadata:Metadata={
 title:TICKETING_GUIDE.title,description:TICKETING_GUIDE.description,
 alternates:{canonical,types:{'application/rss+xml':SITE.domain+'/feed.xml'}},
 openGraph:{type:'website',siteName:SITE.name,title:TICKETING_GUIDE.title,description:TICKETING_GUIDE.description,url:canonical,locale:'en_KE',images:[{url:SITE.domain+TICKETING_GUIDE.image,alt:'Urban Gang Tour at Senior Chief Koinange Girls'}]},
 twitter:{card:'summary_large_image',title:TICKETING_GUIDE.title,description:TICKETING_GUIDE.description,images:[SITE.domain+TICKETING_GUIDE.image]},
};

export default function TicketingPage(){
 return <article className={styles.page}>
  <JsonLd data={ticketingGuideStructuredData()}/>
  <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/"><MessageText catalogue={helpMessages} message="copy.home"/></Link><span aria-hidden="true">/</span><span aria-current="page"><MessageText catalogue={helpMessages} message="copy.event_ticketing"/></span></nav>
  <header className={styles.hero}><div><p className={styles.eyebrow}><MessageText catalogue={helpMessages} message="copy.event_ticketing_in_kenya"/></p><h1><MessageText catalogue={helpMessages} message="copy.list_your_event"/><br/><MessageText catalogue={helpMessages} message="copy.sell_tickets_2"/></h1><p className={styles.lead}><span lang="en-KE">Advertise your event or apply to sell tickets through Urban Gang Tour.</span></p><div className={styles.actions}><Link className="button" href="/events"><MessageText catalogue={helpMessages} message="copy.explore_events"/></Link><Link className={styles.textLink} href="/organizer/signup"><MessageText catalogue={helpMessages} message="copy.create_an_organiser_account"/></Link></div></div><figure><img src={TICKETING_GUIDE.image} width="615" height="820" alt="Urban Gang Tour hosting a school event at Senior Chief Koinange Girls"/><figcaption><span lang="en-KE">Senior Chief Koinange Girls · Published school-event archive.</span></figcaption></figure></header>
  <section className={styles.comparison} aria-labelledby="compare-heading"><div><p className={styles.eyebrow}><MessageText catalogue={helpMessages} message="copy.choose_for_your_event"/></p><h2 id="compare-heading"><MessageText catalogue={helpMessages} message="copy.compare_ticketing_options"/></h2><p><span lang="en-KE">Choosing between Mookh, Ticketsasa, mTickets, HustleSasa and Urban Gang Tour? Check these four things.</span></p></div><div className={styles.criteria} lang="en-KE">{TICKETING_CRITERIA.map(item=><section key={item.title}><h3>{item.title}</h3><p>{item.text}</p></section>)}</div><div className={styles.platforms}><span><MessageText catalogue={helpMessages} message="copy.visit_the_platforms"/></span>{TICKETING_ALTERNATIVES.map(platform=><a key={platform.name} href={platform.url} target="_blank" rel="noopener noreferrer">{platform.name}</a>)}</div><p className={styles.note}><span lang="en-KE">These are independent platforms, not endorsements or partners. Features, fees and availability can change; check each provider directly.</span></p></section>
  <section className={styles.journey} aria-labelledby="journey-heading"><div><p className={styles.eyebrow}><MessageText catalogue={helpMessages} message="copy.buying_tickets"/></p><h2 id="journey-heading"><MessageText catalogue={helpMessages} message="copy.how_ticket_buying_works"/></h2></div><ol lang="en-KE">{TICKETING_WORKFLOW.map((step,index)=><li key={step.title}><span aria-hidden="true">0{index+1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol><div className={styles.actions}><a className={styles.textLink} href="/account"><MessageText catalogue={helpMessages} message="copy.orders_tickets_receipts"/></a><a className={styles.textLink} href="/ticket-terms"><MessageText catalogue={helpMessages} message="copy.ticket_terms"/></a><a className={styles.textLink} href="/refund-policy"><span lang="en-KE">Refund policy</span></a></div></section>
  <section className={styles.regional} aria-labelledby="regional-heading"><h2 id="regional-heading"><MessageText catalogue={helpMessages} message="copy.events_outside_kenya"/></h2><p><span lang="en-KE">Tell us the country and venue. Confirm our service coverage and payment options before booking.</span></p><a className={styles.textLink} href="/international"><MessageText catalogue={helpMessages} message="copy.international_enquiries"/></a></section>
  <section className={styles.questions} aria-labelledby="ticketing-questions"><h2 id="ticketing-questions"><MessageText catalogue={helpMessages} message="copy.ticketing_questions"/></h2>{TICKETING_QUESTIONS.map(item=><details key={item.question} lang="en-KE"><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
  <section className={styles.callout}><div><h2><MessageText catalogue={helpMessages} message="copy.advertise_or_ticket_an_event_2"/></h2><p><MessageText catalogue={helpMessages} message="copy.ask_the_team_about_setup_and_support"/></p></div><a className="button" href="/contact-us"><MessageText catalogue={helpMessages} message="copy.talk_to_the_team"/></a></section>
 </article>;
}
