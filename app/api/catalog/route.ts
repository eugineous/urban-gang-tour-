import { NextResponse } from "next/server";
import { getMerchCatalog, getTicketEvents } from "@/lib/catalog-store";

// Public, read-only - the storefront (Shop/Events pages) fetches this to
// display current names/prices. Order pricing is still re-derived
// server-side in /api/orders, this is display-only.
//
// force-dynamic: without this, Next statically optimizes a GET handler with
// no request-derived input and bakes today's Redis snapshot in at build
// time - every future admin price edit would silently keep serving the
// build-time prices until the next deploy.
export const dynamic = "force-dynamic";

export async function GET() {
  const [merch, events] = await Promise.all([getMerchCatalog(), getTicketEvents()]);
  return NextResponse.json({ merch, events });
}
