import type { ReactNode } from 'react';

export function StickerChip({
  children,
  tone = 'yellow',
  tilt = true,
}: {
  children: ReactNode;
  tone?: 'yellow' | 'cyan' | 'ink' | 'magenta' | 'cream';
  tilt?: boolean;
}) {
  return (
    <span className={`ugt-sticker ugt-sticker--${tone}${tilt ? ' ugt-sticker--tilt' : ''}`}>
      {children}
    </span>
  );
}