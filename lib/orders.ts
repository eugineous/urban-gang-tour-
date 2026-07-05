import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";

let redis: Redis | null = null;
function db(): Redis {
  if (!redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error(
        "Storage isn't connected yet - add an Upstash Redis database from the Vercel Storage tab."
      );
    }
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export type OrderKind = "ticket" | "merch";
export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

export interface OrderItem {
  key: string;
  name: string;
  qty: number;
  unitPriceKes: number;
  variant?: string;
}

export interface Order {
  id: string;
  kind: OrderKind;
  items: OrderItem[];
  totalKes: number;
  phone: string;
  buyerName?: string;
  buyerEmail?: string;
  status: OrderStatus;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  mpesaReceiptNumber?: string;
  createdAt: number;
  updatedAt: number;
}

const ORDER_KEY = (id: string) => `order:${id}`;
const ORDERS_INDEX = "orders:by-time"; // sorted set, score = createdAt
const CHECKOUT_INDEX = (checkoutRequestId: string) => `order:by-checkout:${checkoutRequestId}`;

export async function createOrder(input: {
  kind: OrderKind;
  items: OrderItem[];
  phone: string;
  buyerName?: string;
  buyerEmail?: string;
}): Promise<Order> {
  const now = Date.now();
  const totalKes = input.items.reduce((sum, it) => sum + it.unitPriceKes * it.qty, 0);
  const order: Order = {
    id: randomUUID(),
    kind: input.kind,
    items: input.items,
    totalKes,
    phone: input.phone,
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  const client = db();
  await client.set(ORDER_KEY(order.id), order);
  await client.zadd(ORDERS_INDEX, { score: now, member: order.id });
  return order;
}

export async function attachCheckoutRequest(orderId: string, ids: { checkoutRequestId: string; merchantRequestId: string }) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found");
  order.checkoutRequestId = ids.checkoutRequestId;
  order.merchantRequestId = ids.merchantRequestId;
  order.updatedAt = Date.now();
  const client = db();
  await client.set(ORDER_KEY(orderId), order);
  await client.set(CHECKOUT_INDEX(ids.checkoutRequestId), orderId, { ex: 60 * 60 * 2 });
  return order;
}

export async function getOrder(id: string): Promise<Order | null> {
  return (await db().get<Order>(ORDER_KEY(id))) ?? null;
}

export async function getOrderByCheckoutRequestId(checkoutRequestId: string): Promise<Order | null> {
  const id = await db().get<string>(CHECKOUT_INDEX(checkoutRequestId));
  if (!id) return null;
  return getOrder(id);
}

export async function markOrderPaid(id: string, mpesaReceiptNumber: string): Promise<Order | null> {
  const order = await getOrder(id);
  if (!order) return null;
  order.status = "paid";
  order.mpesaReceiptNumber = mpesaReceiptNumber;
  order.updatedAt = Date.now();
  await db().set(ORDER_KEY(id), order);
  return order;
}

export async function markOrderFailed(id: string, reason: string): Promise<Order | null> {
  const order = await getOrder(id);
  if (!order) return null;
  order.status = "failed";
  order.updatedAt = Date.now();
  await db().set(ORDER_KEY(id), order);
  return order;
}

export async function listOrders(limit = 200): Promise<Order[]> {
  const ids = await db().zrange<string[]>(ORDERS_INDEX, 0, limit - 1, { rev: true });
  if (!ids.length) return [];
  const orders = await Promise.all(ids.map((id) => getOrder(id)));
  return orders.filter((o): o is Order => o !== null);
}
