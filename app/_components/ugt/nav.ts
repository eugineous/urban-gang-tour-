export type NavLink = { href: string; label: string };

export const VOICE = {
  emotional: 'Where the culture gets made.',
  institutional: 'From Potential to Purpose',
} as const;

export const PUBLIC_HEADER_NAV: NavLink[] = [
  { href: '/events', label: 'Events' },
  { href: '/experience', label: 'The Tour' },
  { href: '/blog', label: 'Urban News' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/shop', label: 'Shop' },
];

export const PUBLIC_HEADER_CTA: NavLink = { href: '/book', label: 'Book the tour' };

export const BOTTOM_TABS: Array<NavLink & { icon: string; cta?: boolean }> = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/events', label: 'Tickets', icon: 'ticket' },
  { href: '/book', label: 'Book', icon: 'book', cta: true },
  { href: '/shop', label: 'Shop', icon: 'bag' },
  { href: '/gallery', label: 'Gallery', icon: 'gallery' },
];

export const MENU_EXTRAS: NavLink[] = [
  { href: '/book', label: 'Book the tour' },
  { href: '/about', label: 'About' },
  { href: '/the-gang', label: 'The Gang' },
  { href: '/work-with-us', label: 'Work With Us' },
  { href: '/partners', label: 'Partners' },
  { href: '/press', label: 'Press' },
  { href: '/contact-us', label: 'Contact' },
  { href: '/faq', label: 'FAQ' },
  { href: '/account', label: 'Account' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/ticket-terms', label: 'Ticket Terms' },
];

export const FOOTER_LINKS: NavLink[] = [
  { href: '/book', label: 'Bring UGT to your school' },
  { href: '/work-with-us', label: 'Work With Us' },
  { href: '/press', label: 'Press' },
  { href: '/contact-us', label: 'Contact' },
  { href: '/privacy-policy', label: 'Privacy' },
];