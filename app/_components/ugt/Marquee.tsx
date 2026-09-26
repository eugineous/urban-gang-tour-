import type { ReactNode } from 'react';

export function Marquee({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ugt-marquee ${className}`.trim()} aria-hidden="true">
      <div className="ugt-marquee__track">
        <span>{children}</span>
        <span>{children}</span>
      </div>
    </div>
  );
}