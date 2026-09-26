import type { ReactNode } from 'react';

export function LegalCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`ugt-legal-card ${className}`.trim()}>{children}</div>;
}