import Link from 'next/link';
import { GhostButton, MoneyButton, PathCard } from '@/app/_components/ugt';

export function WorkWithUsPage() {
  return <main className="ugt-collab-page" data-ugt-motion="quiet"><section className="ugt-collab-page__hero"><div className="ugt-page-frame"><p className="ugt-kicker ugt-kicker--yellow">Collaboration door</p><h1>Build a louder<br />tomorrow.</h1><p>For organisations, creative teams and media looking for a real conversation with the culture.</p><MoneyButton href="/contact-us">Work with us</MoneyButton></div></section><section className="ugt-collab-page__paths"><div className="ugt-page-frame"><div className="ugt-collab-page__grid"><PathCard href="/contact-us" number="01" tone="yellow" title="Start a conversation." copy="Share the kind of collaboration you want to explore." label="Contact UGT" /><PathCard href="/press" number="02" tone="cyan" title="Tell the story." copy="Find the media basics and press contact route." label="Press room" /><PathCard href="/book" number="03" tone="ink" title="Bring the tour." copy="For institutions planning a school or campus stop." label="Book the tour" /></div></div></section></main>;
}
