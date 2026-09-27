import Link from 'next/link';
import type { ReactNode } from 'react';

export function NewsPoster({
  href,
  title,
  children,
  className = '',
}: {
  href: string;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`ugt-news-poster ${className}`.trim()}>
      <span className="ugt-news-poster__tape" aria-hidden="true" />
      <h3 className="ugt-news-poster__title">{title}</h3>
      {children ? <div className="ugt-news-poster__body">{children}</div> : null}
    </Link>
  );
}