// Central site + SEO config. One source of truth for URLs, metadata, and nav.
export const SITE = {
  name: 'Urban Gang Tour',
  domain: 'https://urbangangtour.co.ke',
  slogan: 'From Potential to Purpose',
  // Served through the edge resizer: the raw poster.png is 9.3MB, which is far
  // over WhatsApp's and Facebook's preview limits - link previews were being
  // dropped silently. 1200x630 is the standard OG size.
  defaultOg: 'https://urbangangtour.co.ke/cdn-cgi/image/width=1200,quality=80,format=auto/assets/poster.png',
  locale: 'en-KE',
  themeColor: '#E6218C',
  email: 'admin@urbangangtour.co.ke',
} as const;

export type RouteDef = {
  path: string;        // URL path, e.g. "/shop"
  page: string;        // page identifier used by route metadata
  nav?: string;        // label if shown in main nav (omit to hide)
  title: string;       // <title> — unique per page
  description: string; // meta description — unique per page
  og?: string;         // Open Graph image (defaults to SITE.defaultOg)
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: number;
};

// Every distinct, crawlable URL. Order here drives the sitemap.
export const ROUTES: RouteDef[] = [
  {path:'/international',page:'international',title:'International Enquiries — Events & Buying From Abroad',description:'Plan an event in Kenya from abroad. Contact Urban Gang Tour about collaboration, KES pricing, payment options and delivery before buying.',changefreq:'monthly',priority:0.6},
  {path:'/accessibility',page:'accessibility',title:'Accessibility & Focus View — Urban Gang Tour',description:'Choose a calmer visit with focus view. Learn about keyboard navigation, motion controls, languages and how to report an accessibility problem.',changefreq:'monthly',priority:0.5},
  { path: '/author/eugine-micah', page: 'eugine', title: 'Eugine Micah — Presenter & Urban Gang Tour Co-Founder', description: 'Explore Eugine Micah’s documented presenting, live hosting and Urban Gang Tour work, with archive links and booking enquiries.', changefreq: 'monthly', priority: 0.7 },
  { path: '/author/lucy-ogunde', page: 'lucy', title: 'Lucy Ogunde — Presenter & Urban Gang Tour Co-Founder', description: 'Explore Lucy Ogunde’s documented presenting, live hosting and Urban Gang Tour work, with archive links and booking enquiries.', changefreq: 'monthly', priority: 0.7 },
  { path: '/tour-stops', page: 'stops', nav: 'Tour Stops', title: 'Tour Stops — Upcoming Visits & Tour History', description: 'Explore published Urban Gang Tour school and campus stops, upcoming dates and tour history across Kenya.', changefreq: 'daily', priority: 0.8 },
  {
    path: '/', page: 'home', nav: 'Home',
    title: 'Urban Gang Tour — School & Campus Events, Hosting & Production',
    description:
      'School and campus events, live hosting and production in Kenya. Explore our work, find an event or book Urban Gang Tour.',
    changefreq: 'weekly', priority: 1.0,
  },
  {
    path: '/about', page: 'about', nav: 'About',
    title: 'About the Urban Gang Tour — Our Story & Mission',
    description:
      'Meet co-founders Eugine Micah and Lucy Ogunde and discover Urban Gang Tour’s school, campus, live hosting and production work in Kenya.',
    changefreq: 'monthly', priority: 0.8,
  },
  {
    path: '/the-gang', page: 'gang', nav: 'The Gang',
    title: 'The Gang — Meet the Founders',
    description:
      'Meet Urban Gang Tour founders Eugine Micah and Lucy Ogunde.',
    changefreq: 'monthly', priority: 0.7,
  },
  {
    path: '/experience', page: 'exp', nav: 'Services',
    title: 'Services — School & Campus Events, Hosting & Production',
    description:
      'Plan a school or campus event, book live hosts or discuss event production with Urban Gang Tour. Programmes and costs are agreed for your event.',
    changefreq: 'monthly', priority: 0.8,
  },
  {
    path: '/events', page: 'events', nav: 'Events',
    title: 'Events & Tickets — Upcoming Urban Gang Tour & Partner Events',
    description:
      'Explore published Urban Gang Tour and partner events in Kenya. Check dates, venues, organisers and ticket sellers, or browse past event records.',
    changefreq: 'daily', priority: 0.9,
  },
  {
    path: '/shop', page: 'shop', nav: 'Shop',
    title: 'Shop — Urban Gang Merch',
    description:
      'Browse Urban Gang Tour merchandise in one shop. Check available sizes, colours, prices in KES and delivery or collection options before checkout.',
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
    // /urban-news retired 2026-07-21: redirects to /blog (see next.config.mjs)
    // now that /blog is the real, dynamic Urban News page. Kept out of ROUTES
    // (and therefore the sitemap) since a redirecting URL shouldn't be listed
    // as its own canonical.
    path: '/blog', page: 'news', nav: 'News',
    title: 'Urban News — Events, Tour Updates & Stories',
    description:
      'Read published Urban Gang Tour news, school and campus event updates, and stories from our work in Kenya.',
    changefreq: 'daily', priority: 0.8,
  },
  {
    // Preserve the indexed URL without inventing current partnership status.
    path: '/partners', page: 'partners', nav: 'Partners',
    title: 'Partners — Collaborate With Urban Gang Tour',
    description:
      'Explore collaboration opportunities with Urban Gang Tour for schools, campuses, institutions and brands. Discuss an event or campaign with the team.',
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
      'Request Urban Gang Tour for your school, campus or brand event. Share your date, location and audience; the team confirms availability, services and costs.',
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
    path: '/press', page: 'legal',
    title: 'Press & Media Kit — Urban Gang Tour',
    description:
      'Official Urban Gang Tour press notes, founder bios, media contacts and approved facts for journalists, schools, sponsors and partners.',
    changefreq: 'monthly', priority: 0.5,
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
    path: '/faq', page: 'legal',
    title: 'FAQ — Urban Gang Tour',
    description: 'Frequently asked questions about Urban Gang Tour events, tickets, merch, and more.',
    changefreq: 'monthly', priority: 0.6,
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
