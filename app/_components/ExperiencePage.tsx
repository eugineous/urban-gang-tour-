import Link from 'next/link';
import { Marquee, MoneyButton, PosterCard, StickerChip } from '@/app/_components/ugt';

const chapters = [
  ['01', 'Arrive loud', 'A day designed to turn a familiar space into a live cultural room.'],
  ['02', 'Make room', 'Music, conversation and creative expression share the same stage.'],
  ['03', 'Leave a signal', 'The point is not a stop on a map. It is what people carry forward.'],
];

export function ExperiencePage() {
  return (
    <main className="ugt-tour-page" data-ugt-motion="loud">
      <section className="ugt-tour-hero">
        <div className="ugt-tour-hero__road" aria-hidden="true"><span /><span /><span /></div>
        <div className="ugt-page-frame ugt-tour-hero__content">
          <p className="ugt-kicker ugt-kicker--yellow">The Urban Gang Tour</p>
          <h1>The tour<br />moves.</h1>
          <p className="ugt-tour-hero__lede">One day. One institution. A moving room for the culture being made right now.</p>
          <div className="ugt-tour-hero__actions"><MoneyButton href="/book">Bring UGT to your school</MoneyButton><Link href="/events" className="ugt-ghost-btn">See live events</Link></div>
          <p className="ugt-tour-hero__note">Different towns. Same energy.</p>
        </div>
      </section>
      <Marquee>Music · People · Ideas · On the move · Where the culture gets made</Marquee>
      <section className="ugt-tour-chapters">
        <div className="ugt-page-frame">
          <div className="ugt-section-heading"><div><p className="ugt-kicker">The day takes shape</p><h2>A route, not a routine.</h2></div><StickerChip tone="cyan">Campus / School / Culture</StickerChip></div>
          <ol className="ugt-tour-chapters__grid">{chapters.map(([number, title, copy]) => <li key={number}><PosterCard><span>{number}</span><h3>{title}</h3><p>{copy}</p></PosterCard></li>)}</ol>
        </div>
      </section>
      <section className="ugt-tour-closer"><div className="ugt-page-frame"><p className="ugt-kicker ugt-kicker--yellow">Your next stop</p><h2>Tell us where<br />the culture should land.</h2><p>Start with an institutional booking request. The team reviews every detail before confirming anything in writing.</p><MoneyButton href="/book">Book the tour</MoneyButton></div></section>
    </main>
  );
}
