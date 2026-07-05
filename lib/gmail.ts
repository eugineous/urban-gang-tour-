import type { Order } from "@/lib/orders";

const NOTIFY_EMAIL = "euginemicah@gmail.com";

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error("Gmail token refresh failed", await res.text());
    return null;
  }
  const data = await res.json();
  return data.access_token as string;
}

function encodeEmail(params: { to: string; subject: string; html: string }): string {
  const raw = [
    `From: Urban Gang Tour <${NOTIFY_EMAIL}>`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    params.html,
  ].join("\r\n");
  return Buffer.from(raw).toString("base64url");
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    console.warn("Gmail not authorized yet (GOOGLE_GMAIL_REFRESH_TOKEN missing) - skipping email:", subject);
    return;
  }
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encodeEmail({ to, subject, html }) }),
  });
  if (!res.ok) console.error("Gmail send failed", await res.text());
}

function money(kes: number) {
  return `KES ${kes.toLocaleString("en-KE")}`;
}

function itemsHtml(order: Order) {
  return order.items
    .map((it) => `<li>${it.qty} x ${it.name}${it.variant ? ` (${it.variant})` : ""} - ${money(it.unitPriceKes * it.qty)}</li>`)
    .join("");
}

export async function sendOrderConfirmation(order: Order): Promise<void> {
  if (!order.buyerEmail) return;
  const kindLabel = order.kind === "ticket" ? "Ticket" : "Order";
  await send(
    order.buyerEmail,
    `Urban Gang Tour - ${kindLabel} Confirmed (${order.mpesaReceiptNumber})`,
    `<h2>You're confirmed!</h2>
     <p>Receipt: <b>${order.mpesaReceiptNumber}</b></p>
     <ul>${itemsHtml(order)}</ul>
     <p><b>Total paid: ${money(order.totalKes)}</b></p>
     <p>From Potential to Purpose - Urban Gang Tour</p>`
  );
}

export async function sendSaleNotification(order: Order): Promise<void> {
  await send(
    NOTIFY_EMAIL,
    `New ${order.kind} sale - ${money(order.totalKes)}`,
    `<h2>New paid order</h2>
     <p>Phone: ${order.phone}</p>
     <ul>${itemsHtml(order)}</ul>
     <p><b>Total: ${money(order.totalKes)}</b></p>
     <p>M-Pesa receipt: ${order.mpesaReceiptNumber}</p>
     <p>Order ID: ${order.id}</p>`
  );
}
