import Link from 'next/link';
import { GhostButton, PosterCard, StickerChip } from '@/app/_components/ugt';

export function PartnersPage() {
  return <main className="ugt-partners-page" data-ugt-motion="quiet"><section className="ugt-partners-page__hero"><div className="ugt-page-frame"><p className="ugt-kicker">Work in the culture</p><h1>Make the next<br />move together.</h1><p>Urban Gang Tour is open to purposeful collaborations. Start with the work, not a logo wall.</p></div></section><section className="ugt-partners-page__body"><div className="ugt-page-frame"><PosterCard><StickerChip tone="yellow">The starting point</StickerChip><h2>A useful conversation.</h2><p>For collaboration, institutional work or media context, use the route that fits your question. We do not publish unverified relationship claims here.</p><div><GhostButton href="/work-with-us">Work with us</GhostButton><GhostButton href="/press">Press room</GhostButton></div></PosterCard></div></section></main>;
}
