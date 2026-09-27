import type { ReactNode } from 'react';

export function NightStage({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`ugt-night-stage ${className}`.trim()}>{children}</div>;
}