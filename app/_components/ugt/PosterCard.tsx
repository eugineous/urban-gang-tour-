import type { ReactNode } from 'react';

export function PosterCard({
  children,
  className = '',
  as: Tag = 'article',
}: {
  children: ReactNode;
  className?: string;
  as?: 'article' | 'div' | 'li';
}) {
  return <Tag className={`ugt-poster-card ${className}`.trim()}>{children}</Tag>;
}