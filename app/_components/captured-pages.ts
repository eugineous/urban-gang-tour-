import aboutHtml from '@/app/_rendered/about.html?rendered-page';
import contactHtml from '@/app/_rendered/contact.html?rendered-page';
import eventsHtml from '@/app/_rendered/events.html?rendered-page';
import experienceHtml from '@/app/_rendered/exp.html?rendered-page';
import galleryHtml from '@/app/_rendered/gallery.html?rendered-page';
import gangHtml from '@/app/_rendered/gang.html?rendered-page';
import homeHtml from '@/app/_rendered/home.html?rendered-page';
import newsHtml from '@/app/_rendered/news.html?rendered-page';
import partnersHtml from '@/app/_rendered/partners.html?rendered-page';
import shopHtml from '@/app/_rendered/shop.html?rendered-page';
import workHtml from '@/app/_rendered/work.html?rendered-page';

// Webpack's asset/source module type turns each build-time import into a string
// inside the server bundle. This keeps the captured v25 shells available in a
// Cloudflare Worker, where there is no deployed application filesystem.
const CAPTURED_PAGES: Readonly<Record<string, string>> = {
  about: aboutHtml,
  contact: contactHtml,
  events: eventsHtml,
  exp: experienceHtml,
  gallery: galleryHtml,
  gang: gangHtml,
  home: homeHtml,
  news: newsHtml,
  partners: partnersHtml,
  shop: shopHtml,
  work: workHtml,
};

export function getRawCapturedPage(page: string): string | null {
  return CAPTURED_PAGES[page] ?? null;
}
