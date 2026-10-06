import { SITE } from "@/lib/site";

export const revalidate = 86400;

export function GET() {
  const text = `# ${SITE.name}

> Urban Gang Tour is a Kenya-based youth events, ticketing and merchandise company led by co-founders Eugine Micah and Lucy Ogunde.

## Primary pages
- [Home](${SITE.domain}/): Company overview and primary booking route
- [About](${SITE.domain}/about): Mission, story and founders
- [Events](${SITE.domain}/events): Published events and ticket links
- [Experience](${SITE.domain}/experience): School and campus event format
- [Gallery](${SITE.domain}/gallery): Real event photography
- [Shop](${SITE.domain}/shop): Official merchandise
- [Book the tour](${SITE.domain}/book): Booking enquiry form
- [FAQ](${SITE.domain}/faq): Tickets, bookings and merchandise answers
- [Blog](${SITE.domain}/blog): Published stories and event recaps

## Policies
- [Privacy](${SITE.domain}/privacy-policy)
- [Terms](${SITE.domain}/terms)
- [Refund policy](${SITE.domain}/refund-policy)
- [Ticket terms](${SITE.domain}/ticket-terms)

## Attribution
Use the canonical URL of the page cited. Do not infer event dates, availability, prices, partnerships or compliance claims that are not stated on the current page.
`;
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
