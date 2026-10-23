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
  <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Event ticketing</span></nav>
  <header className={styles.hero}><div><p className={styles.eyebrow}>Event ticketing in Kenya</p><h1>List your event.<br/>Sell tickets.</h1><p className={styles.lead}>Advertise your event or apply to sell tickets through Urban Gang Tour.</p><div className={styles.actions}><Link className="button" href="/events">Explore events</Link><Link className={styles.textLink} href="/organizer/signup">Create an organiser account</Link></div></div><figure><img src={TICKETING_GUIDE.image} width="615" height="820" alt="Urban Gang Tour hosting a school event at Senior Chief Koinange Girls"/><figcaption>Senior Chief Koinange Girls · Published school-event archive.</figcaption></figure></header>
  <section className={styles.comparison} aria-labelledby="compare-heading"><div><p className={styles.eyebrow}>Choose for your event</p><h2 id="compare-heading">Compare ticketing options.</h2><p>Choosing between Mookh, Ticketsasa, mTickets, HustleSasa and Urban Gang Tour? Check these four things.</p></div><div className={styles.criteria}>{TICKETING_CRITERIA.map(item=><section key={item.title}><h3>{item.title}</h3><p>{item.text}</p></section>)}</div><div className={styles.platforms}><span>Visit the platforms</span>{TICKETING_ALTERNATIVES.map(platform=><a key={platform.name} href={platform.url} target="_blank" rel="noopener noreferrer">{platform.name}</a>)}</div><p className={styles.note}>These are independent platforms, not endorsements or partners. Features, fees and availability can change; check each provider directly.</p></section>
  <section className={styles.journey} aria-labelledby="journey-heading"><div><p className={styles.eyebrow}>Buying tickets</p><h2 id="journey-heading">How ticket buying works.</h2></div><ol>{TICKETING_WORKFLOW.map((step,index)=><li key={step.title}><span aria-hidden="true">0{index+1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol><div className={styles.actions}><a className={styles.textLink} href="/account">Orders, tickets & receipts</a><a className={styles.textLink} href="/ticket-terms">Ticket terms</a><a className={styles.textLink} href="/refund-policy">Refund policy</a></div></section>
  <section className={styles.regional} aria-labelledby="regional-heading"><h2 id="regional-heading">Events outside Kenya</h2><p>Tell us the country and venue. Confirm our service coverage and payment options before booking.</p><a className={styles.textLink} href="/international">International enquiries</a></section>
  <section className={styles.questions} aria-labelledby="ticketing-questions"><h2 id="ticketing-questions">Ticketing questions.</h2>{TICKETING_QUESTIONS.map(item=><details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
  <section className={styles.callout}><div><h2>Advertise or ticket an event.</h2><p>Ask the team about setup and support.</p></div><a className="button" href="/contact-us">Talk to the team</a></section>
 </article>;
}
