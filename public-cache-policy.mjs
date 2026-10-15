const publicPages = new Set([
  '/', '/about', '/experience', '/tour-stops', '/portfolio', '/clients', '/partners',
  '/gallery', '/work-with-us', '/press', '/faq', '/privacy-policy', '/cookie-policy',
  '/terms', '/refund-policy', '/ticket-terms', '/author/eugine-micah', '/author/lucy-ogunde',
  '/shop/lookbook',
]);

// Defence in depth for JSON/PDF responses as well as private HTML. A browser
// must not retain account or transaction responses after a shared-device logout.
export function mustNotStoreResponse(request, response) {
  const path = new URL(request.url).pathname;
  return request.method !== 'GET' && request.method !== 'HEAD' ||
    /^\/(?:admin|account|organizer|checkout|cart|pay|receipt|receipts|tickets|t|verify)(?:\/|$)/.test(path) ||
    /^\/api\/(?:admin|account|auth|organizer|orders|bookings|checkout|marketplace\/checkout|receipts|tickets|internal)(?:\/|$)/.test(path) ||
    request.headers.has('Authorization') ||
    /(?:^|;\s*)ugt_(?:admin|user|organizer|org)=/.test(request.headers.get('cookie') || '') ||
    response.headers.has('Set-Cookie');
}

// Never cache customer, sale, authentication, payment or RSC responses. The
// allowlist contains only public content, and authenticated requests bypass it.
export function canCachePublicPage(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  return request.method === 'GET' && publicPages.has(path) && !url.search &&
    request.headers.get('RSC') !== '1' && !request.headers.has('Authorization') &&
    !/(?:^|;\s*)ugt_(?:admin|user|organizer|org)=/.test(request.headers.get('cookie') || '') &&
    !/no-cache|no-store/.test(request.headers.get('cache-control') || '');
}
