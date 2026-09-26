import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  href?: string;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function GhostButton({ children, href, className = '', ...rest }: Props) {
  const cls = `ugt-ghost-btn ${className}`.trim();
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}