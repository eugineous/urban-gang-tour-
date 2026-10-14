'use client';
import {useEffect, useRef, useState} from 'react';
import Link from './DocumentLink';
import {InlineArrow} from './InlineArrow';
import {asset, MediaImage} from './MediaLibrary';
import {useCalmMotion} from './ExperienceRails';
import timeline from '../data/tour-timeline.json';
import {nextTourEvent, tourEventAction, type PublicTourEvent} from '../lib/home-tour';
import styles from './HomeTourStory.module.css';

const marks: Record<string, string> = {koinange: 'M184', loreto: 'M182', gituamba: 'M183', lari: 'M181'};
const dateLabel = (date: string) => new Intl.DateTimeFormat('en-KE', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi'}).format(new Date(date + 'T12:00:00+03:00'));

export function HomeTourStory({events}: {events: PublicTourEvent[]}) {
  const motion = useCalmMotion();
  const rail = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const stops = timeline.entries.filter(stop => stop.status === 'completed' && stop.image && marks[stop.id]);
  useEffect(() => {setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer)}, []);
  useEffect(() => {
    const root = rail.current;
    if (!root) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(Number((visible.target as HTMLElement).dataset.index));
    }, {root, threshold: [.45, .75]});
    root.querySelectorAll('li').forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  const next = now === null ? undefined : nextTourEvent(events, now);
  const action = next ? tourEventAction(next) : undefined;
  function move(direction: number) {
    const root = rail.current;
    if (!root) return;
    const index = Math.max(0, Math.min(stops.length - 1, active + direction));
    const item = root.children[index] as HTMLElement;
    root.scrollTo({left: item.offsetLeft - (root.children[0] as HTMLElement).offsetLeft, behavior: motion ? 'smooth' : 'auto'});
    setActive(index);
  }
  return <section className={styles.story} aria-labelledby="home-tour-heading" id="on-the-road">
    <div className={`wrap ${styles.next}`}>
      <div className={styles.nextLabel}><span className={styles.signal} aria-hidden="true"/><p className="eyebrow">Next stop</p></div>
      <div className={styles.nextCopy}>
        <h2>{next ? next.name : 'Bring us to your school.'}</h2>
        {next ? <p><time dateTime={next.eventDate!}>{dateLabel(next.eventDate!)}</time>{next.city && <> · {next.city}</>}</p> : <p>New dates coming soon.</p>}
        {action && <small>{action.note}</small>}
      </div>
      <Link className="button" href={action?.href || '/book'}>{action?.label || 'Book Urban Gang Tour'}<InlineArrow/></Link>
    </div>
    <div className={`wrap ${styles.heading}`}>
      <div><p className="eyebrow">From potential to purpose</p><h2 id="home-tour-heading">Tour stops.</h2></div>
      <div><Link href="/tour-stops">All tour stops <InlineArrow/></Link></div>
    </div>
    <ol className={styles.rail} ref={rail} aria-label="Recorded school tour stops">
      {stops.map((stop, index) => <li key={stop.id} data-index={index} className={styles.stop}>
        <Link href={'/gallery/school-' + stop.id} className={styles.stopLink}>
          <div className={styles.stopTop}><span>{String(index + 1).padStart(2, '0')}</span><span>School tour</span><InlineArrow/></div>
          <div className={styles.stopPhoto}><img src={stop.image!} alt={`Urban Gang Tour at ${stop.name}`} loading="lazy" decoding="async" width="615" height="820"/><div className={styles.mark}><MediaImage id={marks[stop.id]} alt={`${asset(marks[stop.id]).title} logo`}/></div></div>
          <div className={styles.stopCopy}><small>{stop.venue}</small><h3>{stop.name}</h3><span>View photos <InlineArrow/></span></div>
        </Link>
      </li>)}
    </ol>
    <div className={`wrap ${styles.controls}`}>
      <p>Swipe to explore <span aria-hidden="true">→</span></p>
      <div className={styles.progress} aria-hidden="true">{stops.map((stop,index) => <span key={stop.id} data-active={index === active}/>)}</div>
      <div><button type="button" disabled={active === 0} onClick={() => move(-1)} aria-label="Previous tour stop">←</button><button type="button" disabled={active === stops.length-1} onClick={() => move(1)} aria-label="Next tour stop">→</button></div>
    </div>
  </section>;
}
