import Link from 'next/link';
import { MoneyButton, PosterCard, StickerChip } from '@/app/_components/ugt';

const founders = [{ name: 'Eugine Micah', href: '/author/eugine-micah', role: 'Co-founder · Creative direction' }, { name: 'Lucy Ogunde', href: '/author/lucy-ogunde', role: 'Co-founder · Culture and community' }];

export function TheGangPage() {
  return <main className="ugt-gang-page" data-ugt-motion="quiet"><section className="ugt-gang-page__hero"><div className="ugt-page-frame"><p className="ugt-kicker ugt-kicker--yellow">The Gang</p><h1>The people<br />behind the noise.</h1><p>Two public faces. One growing platform for Kenyan youth culture, opportunity and expression.</p></div></section><section className="ugt-gang-page__founders"><div className="ugt-page-frame"><div className="ugt-section-heading"><div><p className="ugt-kicker">Public faces</p><h2>Meet the founders.</h2></div><StickerChip tone="magenta">UGT</StickerChip></div><div className="ugt-gang-page__grid">{founders.map((founder, index) => <PosterCard key={founder.name}><span>0{index + 1}</span><h3>{founder.name}</h3><p>{founder.role}</p><Link href={founder.href}>Read profile →</Link></PosterCard>)}</div><div className="ugt-gang-page__end"><p>Different people. Same city. A brighter tomorrow.</p><MoneyButton href="/work-with-us">Work with us</MoneyButton></div></div></section></main>;
}
