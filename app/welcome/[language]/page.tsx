import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {SITE} from '@/lib/site';
import {WELCOME_LANGUAGES,isWelcomeLanguage,welcomeAlternates} from '@/lib/welcome-languages';

// Reject unsupported URLs before a streamed layout can commit HTTP 200.
export const dynamicParams=false;
export function generateStaticParams(){return Object.keys(WELCOME_LANGUAGES).map(language=>({language}));}
export async function generateMetadata({params}:{params:Promise<{language:string}>}):Promise<Metadata>{
 const {language}=await params;if(!isWelcomeLanguage(language))notFound();
 const copy=WELCOME_LANGUAGES[language],url=`${SITE.domain}/welcome/${language}`;
 return {title:`${copy.title} — ${copy.name}`,description:copy.description,
  alternates:{canonical:url,languages:welcomeAlternates},
  openGraph:{type:'website',title:copy.title,description:copy.description,url,locale:copy.locale,images:[SITE.defaultOg]},
  twitter:{card:'summary_large_image',title:copy.title,description:copy.description,images:[SITE.defaultOg]}};
}
export default async function Welcome({params}:{params:Promise<{language:string}>}){
 const {language}=await params;if(!isWelcomeLanguage(language))notFound();
 const c=WELCOME_LANGUAGES[language];
 return <article className="international-page wrap" lang={language}>
  <nav className="language-options" aria-label={c.choose}>{Object.entries(WELCOME_LANGUAGES).map(([code,item])=><a key={code} href={`/welcome/${code}`} lang={code} hrefLang={code} aria-current={language===code?'page':undefined}>{item.name}</a>)}</nav>
  <header><p className="eyebrow" lang="en">Urban Gang Tour · Kenya</p><h1>{c.title}</h1><p className="international-lead">{c.intro}</p><p className="language-scope">{c.scope}</p></header>
  <div className="international-grid"><section><h2>{c.services}</h2><p>{c.servicesCopy}</p><a className="button" href="/book">{c.services}</a></section><section><h2>{c.work}</h2><p>{c.workCopy}</p><a className="button secondary" href="/portfolio">{c.work}</a></section><section><h2>{c.shop}</h2><p>{c.shopCopy}</p><div className="international-actions"><a href="/events">{c.events}</a><a href="/shop">{c.merch}</a></div></section></div>
  <section className="international-note"><h2>{c.buying}</h2><p>{c.buyingCopy}</p><div className="international-actions"><a href="/contact-us">{c.contact}</a><a href="/international">{c.details}</a><a href="/accessibility">{c.access}</a></div></section>
 </article>;
}
