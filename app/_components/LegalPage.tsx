'use client';
import {OriginalContent} from '@/ui/i18n/OriginalContent';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {helpMessages} from '@/ui/i18n/catalogues/help';
export function LegalPage({title,updated,sections}:{title:string;updated:string;sections:{h:string;p:string[]}[]}){
 const t=useMessages(helpMessages);
 return <article className="current-reading wrap"><p className="eyebrow">{t("copy.your_rights_and_responsibilities")}</p><h1 lang="en-KE">{title}</h1><p className="muted">{t("copy.updated")} <span lang="en-KE">{updated}</span> <span lang="en-KE">· Urban Gang Tour, Nairobi</span></p><nav className="current-actions" aria-label={t("copy.related_policies")}><a href="/privacy-policy">{t("copy.privacy")}</a><a href="/cookie-policy">{t("copy.cookies")}</a><a href="/terms">{t("copy.terms_2")}</a><a href="/refund-policy">{t("copy.refunds")}</a><a href="/contact-us">{t("copy.ask_a_question")}</a></nav><OriginalContent disclose>{sections.map((s,i)=><section key={i}><h2>{s.h}</h2>{s.p.map((t,j)=><p key={j}>{t}</p>)}</section>)}</OriginalContent><a className="button" href="/">{t("copy.back_to_urban_gang_tour")}</a></article>
}
