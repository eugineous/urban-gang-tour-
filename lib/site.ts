// Central site + SEO config. One source of truth for URLs, metadata, and nav.
export const SITE = {
  name: 'Urban Gang Tour',
  domain: 'https://urbangangtour.co.ke',
  slogan: 'From Potential to Purpose',
  defaultOg: 'https://urbangangtour.co.ke/assets/poster.png',
  locale: 'en-KE',
  themeColor: '#E6218C',
  email: 'admin@urbangangtour.co.ke',
} as const;

export type RouteDef = {
  path: string;        // URL path, e.g. "/shop"
  page: string;        // v25 dc-runtime page key this route renders
  nav?: string;        // label if shown in main nav (omit to hide)
  title: string;       // <title> — unique per page
  description: string; // meta description — unique per page
  og?: string;         // Open Graph image (defaults to SITE.defaultOg)
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: number;
};

// Every distinct, crawlable URL. Order here drives the sitemap.
export const ROUTES: RouteDef[] = [
  {
    path: '/', page: 'home', nav: 'Home',
    title: 'Urban Gang Tour — Where the Culture Gets Made',
    description:
      "Kenya's youth talent search, mentorship, and awards concert tour. Live, and on the national screen via Urban News on PPP TV Kenya. From Potential to Purpose.",
    changefreq: 'weekly', priority: 1.0,
  },
  {
    path: '/about', page: 'about', nav: 'About',
    title: 'About the Urban Gang Tour — Our Story & Mission',
    description:
      'How the Urban Gang Tour showcases, mentors and awards young Kenyan talent — travelling the full production to schools and campuses and broadcasting every stop nationally.',
    changefreq: 'monthly', priority: 0.8,
  },
  {
    path: '/the-gang', page: 'gang', nav: 'The Gang',
    title: 'The Gang — Hosts, DJs, Crew & Talent Team',
    description:
      'Meet the Urban Gang: hosts Eugine Micah and Lucy Ogunde, resident DJs, stage managers, videographers, models and facilitators who bring the tour to life.',
    changefreq: 'monthly', priority: 0.7,
  },
  {
    path: '/experience', page: 'exp', nav: 'The Tour',
    title: 'The Tour Experience — Run of Show, Pods & Talent Stage',
    description:
      'Inside an Urban Gang Tour day: morning mentorship pods, tree planting, talent competitions, awards and crowning, and hype sets — built to broadcast standard.',
    changefreq: 'monthly', priority: 0.8,
  },
  {
    path: '/events', page: 'events', nav: 'Tickets',
    title: 'Events & Tickets — Upcoming Urban Gang Tour Stops',
    description:
      'Upcoming Urban Gang Tour stops and ticketed events across Kenya. See dates, venues and secure your place at the next school, campus or mega event.',
    changefreq: 'daily', priority: 0.9,
  },
  {
    path: '/shop', page: 'shop', nav: 'Shop',
    title: 'Shop — Urban Gang Merch',
    description:
      'Official Urban Gang Merch: heavyweight tees, crewnecks, headwear and accessories in signature magenta. What you wear says you were there when it happened.',
    changefreq: 'weekly', priority: 0.9,
  },
  {
    path: '/gallery', page: 'gallery', nav: 'Gallery',
    title: 'Gallery — Urban Gang Tour in Pictures',
    description:
      'Photo galleries from Urban Gang Tour stops across Kenyan schools and campuses — talent showcases, runways, crownings and festival colour, by school.',
    changefreq: 'weekly', priority: 0.7,
  },
  {
    path: '/urban-news', page: 'news', nav: 'News',
    title: 'Urban News with Eugine Micah & Lucy Ogunde — PPP TV Kenya',
    description:
      'Urban News, hosted by Eugine Micah and Lucy Ogunde: recaps, features and the national broadcast of every Urban Gang Tour stop on PPP TV Kenya.',
    changefreq: 'daily', priority: 0.8,
  },
  {
    path: '/blog', page: 'news',
    title: 'Blog — Urban Gang Tour Stories & Recaps',
    description:
      'Longform recaps and student stories from the Urban Gang Tour — school by school, stage by stage. Read the loudest school days of the term.',
    changefreq: 'daily', priority: 0.7,
  },
  {
    path: '/partners', page: 'partners', nav: 'Partners',
    title: 'Partners & Sponsors — Get Your Brand in the Moment',
    description:
      'Partner with the Urban Gang Tour. Brands, institutions, campuses and schools put their name inside the culture the whole country is watching.',
    changefreq: 'monthly', priority: 0.7,
  },
  {
    path: '/work-with-us', page: 'work',
    title: 'Work With Us — Brands, Institutions, Campuses & Schools',
    description:
      'Put your brand, institution, campus or school inside the Urban Gang Tour. Sponsorships, activations, campus raves and school bookings across Kenya.',
    changefreq: 'monthly', priority: 0.7,
  },
  {
    path: '/book', page: 'contact', nav: 'Book the Tour',
    title: 'Book the Tour — Bring Urban Gang to Your School or Campus',
    description:
      'Book the Urban Gang Tour for your school, campus, county or brand activation. Tell us your date and audience and we bring the full broadcast-ready production to you.',
    changefreq: 'monthly', priority: 0.9,
  },
  {
    path: '/contact-us', page: 'contact',
    title: 'Contact Us — Urban Gang Tour',
    description:
      'Get in touch with the Urban Gang Tour team for bookings, sponsorship, media and crew enquiries. Based in Nairobi, touring across Kenya.',
    changefreq: 'monthly', priority: 0.6,
  },
  {
    path: '/account', page: 'legal',
    title: 'My Account — Urban Gang Tour',
    description: 'Log in or create your Urban Gang account to pitch stories, track orders and stay close to the tour.',
    changefreq: 'monthly', priority: 0.4,
  },
  {
    path: '/privacy-policy', page: 'legal',
    title: 'Privacy Policy — Urban Gang Tour',
    description: 'How Urban Gang Tour collects, uses and protects your personal data under the Kenya Data Protection Act 2019.',
    changefreq: 'monthly', priority: 0.3,
  },
  {
    path: '/terms', page: 'legal',
    title: 'Terms of Service — Urban Gang Tour',
    description: 'The terms that govern use of urbangangtour.co.ke, bookings, accounts, tickets and merch orders.',
    changefreq: 'monthly', priority: 0.3,
  },
  {
    path: '/refund-policy', page: 'legal',
    title: 'Refund & Delivery Policy — Urban Gang Tour',
    description: 'Refunds, exchanges and delivery timelines for Urban Gang merch and tickets.',
    changefreq: 'monthly', priority: 0.3,
  },
  {
    path: '/ticket-terms', page: 'legal',
    title: 'Ticket Terms — Urban Gang Tour',
    description: 'Entry conditions, age guidance and refund rules for Urban Gang Tour events.',
    changefreq: 'monthly', priority: 0.3,
  },
  {
    path: '/admin', page: 'admin',
    title: 'Admin — Urban Gang Control Room',
    description: 'Urban Gang Tour admin control room.',
    changefreq: 'monthly', priority: 0.1,
  },
];

// Nav links shown in the header (real <a href>), in order.
export const NAV = ROUTES.filter((r) => r.nav).map((r) => ({ href: r.path, label: r.nav! }));

export function routeByPath(path: string): RouteDef | undefined {
  return ROUTES.find((r) => r.path === path);
}
