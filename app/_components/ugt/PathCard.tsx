import Link from 'next/link';

export function PathCard(props: {
  href: string;
  number: '01' | '02' | '03';
  tone: 'yellow' | 'cyan' | 'ink';
  title: string;
  copy: string;
  label: string;
}) {
  return (
    <Link href={props.href} className={`ugt-path-card ugt-path-card--${props.tone}`}>
      <span className="ugt-path-card__num">{props.number}</span>
      <h2 className="ugt-path-card__title">{props.title}</h2>
      <p className="ugt-path-card__copy">{props.copy}</p>
      <b className="ugt-path-card__cta">{props.label} →</b>
    </Link>
  );
}