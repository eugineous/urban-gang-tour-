/** Public, explicitly credited work; never an Urban Gang ticket inventory. */
export type PartnerDetails = {
  organizer: string;
  client: string;
  role: string;
  admission: 'external' | 'free' | 'invitation' | 'unconfirmed';
  ticketUrl: string;
  institutions: string[];
  posters: {url: string; caption: string}[];
  newsSlug: string;
};

export const EMPTY_PARTNER: PartnerDetails = {organizer:'',client:'',role:'',admission:'external',ticketUrl:'',institutions:[],posters:[],newsSlug:''};
const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// Links are rendered, never fetched server-side. Still reject credentials,
// local hosts, private IP literals and our own checkout as a partner seller.
export function externalTicketUrl(value: string): string | null {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase().replace(/\.$/,'');
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') ||
      !host.includes('.') || host.endsWith('.local') || host.endsWith('.internal') ||
      host === 'localhost' || host.endsWith('.localhost') || host.includes(':') ||
      /^(0|10|127|169\.254|192\.168)\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^\d+\./.test(host) || host === 'urbangangtour.co.ke' || host.endsWith('.urbangangtour.co.ke') ||
      host.endsWith('.chatgpt.site')) return null;
    return u.href;
  } catch { return null; }
}

export function posterUrl(value: string): boolean {
  // Same-origin uploads or public HTTPS artwork; no scripts/data URLs.
  return /^\/(?!\/)[^\s\\]*$/.test(value) || externalTicketUrl(value) !== null;
}

export function parsePartnerDetails(value: unknown): PartnerDetails | null {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return null; } }
  if (!plain(value) || Object.keys(value).some(k => !Object.keys(EMPTY_PARTNER).includes(k))) return null;
  const v = value;
  for (const [key, limit] of [['organizer',300],['client',200],['role',1200],['ticketUrl',800],['newsSlug',100]] as const) {
    if (typeof v[key] !== 'string' || v[key].length > limit) return null;
  }
  if (!['external','free','invitation','unconfirmed'].includes(String(v.admission)) ||
    !Array.isArray(v.institutions) || v.institutions.length > 12 ||
    v.institutions.some(i => typeof i !== 'string' || !i.trim() || i.length > 200) ||
    !Array.isArray(v.posters) || v.posters.length > 8 ||
    v.posters.some(p => !plain(p) || Object.keys(p).some(k=>!['url','caption'].includes(k)) ||
      typeof p.url !== 'string' || p.url.length > 800 || !posterUrl(p.url) ||
      typeof p.caption !== 'string' || !p.caption.trim() || p.caption.length > 300)) return null;
  if (v.ticketUrl && !externalTicketUrl(v.ticketUrl as string)) return null;
  if (v.newsSlug && !/^[a-z0-9-]{1,100}$/.test(v.newsSlug as string)) return null;
  return {
    organizer:(v.organizer as string).trim(),client:(v.client as string).trim(),role:(v.role as string).trim(),
    admission:v.admission as PartnerDetails['admission'],ticketUrl:(v.ticketUrl as string).trim(),
    institutions:(v.institutions as string[]).map(s=>s.trim()),
    posters:(v.posters as PartnerDetails['posters']).map(p=>({url:p.url,caption:p.caption.trim()})),
    newsSlug:(v.newsSlug as string).trim(),
  };
}

export function partnerPublicationError(details: PartnerDetails | null, row: {status: unknown; image?: unknown; eventDate?: unknown; venue?: unknown}): string | null {
  if (!details) return 'invalid_partner_details';
  if (!['published','ongoing','completed','sales_paused','sold_out','postponed','rescheduled'].includes(String(row.status))) return null;
  if (!details.organizer || !details.client || !details.role || !row.venue ||
    typeof row.image !== 'string' || row.image.length>400 || !posterUrl(row.image) || !row.image ||
    (row.status !== 'postponed' && !row.eventDate)) return 'partner_details_required';
  if (details.admission === 'external' && ['published','ongoing','rescheduled'].includes(String(row.status)) && !details.ticketUrl) return 'partner_ticket_url_required';
  return null;
}

export function partnerAdmission(details: PartnerDetails) {
  return details.admission === 'free' ? 'Free admission' : details.admission === 'invitation' ? 'By invitation' : details.admission === 'unconfirmed' ? 'Entry details to be confirmed' : 'Tickets via organiser';
}

export function partnerTicketAction(details: PartnerDetails, status: string, date: string | null, now: number) {
  const active = ['published','ongoing','rescheduled'].includes(status) && !!date && Date.parse(date+'T23:59:59+03:00') >= now;
  return active && details.admission === 'external' ? externalTicketUrl(details.ticketUrl) : null;
}
