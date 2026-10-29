import 'server-only';

import { amountsMatch, canProviderConfirmPayment, type OrderStatus } from './payment-status';
import { PESAPAL_TRACKING_ID, readPesapalConfig, type PesapalEnvironment } from './pesapal-config';

/** Must come from a durable server record, never from callback/browser fields. */
export type PesapalPaymentBinding = {
  orderId: string;
  merchantReference: string;
  orderTrackingId: string;
  amountKes: number;
  currency: 'KES';
  status: OrderStatus;
};

type VerificationFailure =
  | 'not_configured' | 'invalid_notification' | 'unbound_notification' | 'invalid_binding'
  | 'not_recoverable' | 'authentication_failed' | 'provider_unavailable'
  | 'binding_mismatch' | 'provider_uncertain';

export type PesapalVerification =
  | { ok: false; reason: VerificationFailure }
  | {
    ok: true;
    outcome: 'completed' | 'failed' | 'reversed';
    evidence: {
      orderId: string;
      merchantReference: string;
      orderTrackingId: string;
      amountKes: number;
      currency: 'KES';
      confirmationCode?: string;
    };
  };

const MERCHANT_REFERENCE = /^[A-Za-z0-9_.:-]{1,50}$/;
const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };
const TOKEN_MAX_AGE_MS = 5 * 60_000;
const TOKEN_EXPIRY_MARGIN_MS = 30_000;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function successfulResponse(value: unknown): value is Record<string, unknown> {
  if (!record(value) || (value.status !== '200' && value.status !== 200)) return false;
  // Pesapal documents both null and an object whose error fields are all null.
  return value.error === null || (record(value.error) && Object.keys(value.error).length > 0 &&
    Object.values(value.error).every(field => field === null));
}

function notificationSchema(value: unknown): value is {
  OrderTrackingId: string; OrderMerchantReference: string; OrderNotificationType: string;
} {
  return record(value) && Object.keys(value).length === 3 &&
    typeof value.OrderTrackingId === 'string' && PESAPAL_TRACKING_ID.test(value.OrderTrackingId) &&
    typeof value.OrderMerchantReference === 'string' && MERCHANT_REFERENCE.test(value.OrderMerchantReference) &&
    (value.OrderNotificationType === 'IPNCHANGE' || value.OrderNotificationType === 'CALLBACKURL');
}

/**
 * API3 authentication/status preparation only. No submission, registration,
 * database writes, settlement or fulfillment. Instantiate within a server request;
 * the in-memory token cache is not a durable payment/idempotency mechanism.
 * Protocol sources and activation blockers: docs/payments-provider-handoff.md.
 */
export function createPesapalAdapter(options: {
  env?: PesapalEnvironment;
  fetch?: typeof fetch;
  now?: () => number;
} = {}) {
  const configuration = readPesapalConfig(options.env);
  const transport = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  let token: { value: string; expiresAt: number } | undefined;
  let authenticating: Promise<string> | undefined;

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt > now() + TOKEN_EXPIRY_MARGIN_MS) return token.value;
    if (authenticating) return authenticating;
    if (!configuration.ok) throw new Error('not_configured');
    const { config } = configuration;
    const requestedAt = now();
    const request = (async () => {
      const response = await transport(`${config.apiBase}/Auth/RequestToken`, {
        method: 'POST', headers: JSON_HEADERS, cache: 'no-store', redirect: 'error',
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ consumer_key: config.consumerKey, consumer_secret: config.consumerSecret }),
      });
      if (!response.ok) throw new Error('authentication_failed');
      const data: unknown = await response.json();
      if (!successfulResponse(data) || typeof data.token !== 'string' || !data.token.trim() ||
        /[\r\n\0]/.test(data.token) || typeof data.expiryDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(data.expiryDate)) {
        throw new Error('authentication_failed');
      }
      const expiresAt = Math.min(Date.parse(data.expiryDate), requestedAt + TOKEN_MAX_AGE_MS);
      if (!Number.isFinite(expiresAt) || expiresAt <= now() + TOKEN_EXPIRY_MARGIN_MS) {
        throw new Error('authentication_failed');
      }
      token = { value: data.token, expiresAt };
      return token.value;
    })();
    authenticating = request;
    try {
      return await request;
    } finally {
      if (authenticating === request) authenticating = undefined;
    }
  }

  async function verifyNotification(
    notification: unknown,
    binding: PesapalPaymentBinding | null,
  ): Promise<PesapalVerification> {
    if (!configuration.ok) return { ok: false, reason: 'not_configured' };
    if (!notificationSchema(notification)) return { ok: false, reason: 'invalid_notification' };
    if (!binding || notification.OrderTrackingId !== binding.orderTrackingId ||
      notification.OrderMerchantReference !== binding.merchantReference) {
      return { ok: false, reason: 'unbound_notification' };
    }
    if (typeof binding.orderId !== 'string' || !binding.orderId || binding.orderId.length > 100 ||
      !amountsMatch(binding.amountKes, binding.amountKes) || binding.currency !== 'KES') {
      return { ok: false, reason: 'invalid_binding' };
    }
    if (!canProviderConfirmPayment(binding.status)) return { ok: false, reason: 'not_recoverable' };

    let bearer: string;
    try {
      bearer = await accessToken();
    } catch {
      return { ok: false, reason: 'authentication_failed' };
    }

    try {
      const response = await transport(
        `${configuration.config.apiBase}/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(binding.orderTrackingId)}`,
        {
          method: 'GET', headers: { ...JSON_HEADERS, Authorization: `Bearer ${bearer}` },
          cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
        },
      );
      if (response.status === 401) token = undefined;
      if (!response.ok) return { ok: false, reason: 'provider_unavailable' };
      const data: unknown = await response.json();
      if (!successfulResponse(data)) return { ok: false, reason: 'provider_unavailable' };
      if ((typeof data.amount !== 'number' &&
        (typeof data.amount !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(data.amount))) ||
        !amountsMatch(binding.amountKes, data.amount) || data.currency !== binding.currency ||
        data.merchant_reference !== binding.merchantReference) {
        return { ok: false, reason: 'binding_mismatch' };
      }
      const description = typeof data.payment_status_description === 'string'
        ? data.payment_status_description.toUpperCase() : '';
      const outcome = data.status_code === 1 && description === 'COMPLETED' ? 'completed'
        : data.status_code === 2 && description === 'FAILED' ? 'failed'
          : data.status_code === 3 && description === 'REVERSED' ? 'reversed' : null;
      if (!outcome || (outcome === 'completed' &&
        (typeof data.confirmation_code !== 'string' || !/^[A-Za-z0-9_.:-]{1,100}$/.test(data.confirmation_code)))) {
        return { ok: false, reason: 'provider_uncertain' };
      }
      return {
        ok: true,
        outcome,
        evidence: {
          orderId: binding.orderId, merchantReference: binding.merchantReference,
          orderTrackingId: binding.orderTrackingId, amountKes: binding.amountKes, currency: binding.currency,
          ...(outcome === 'completed' ? { confirmationCode: data.confirmation_code as string } : {}),
        },
      };
    } catch {
      // Do not return raw provider errors, tokens, payment accounts or customer data.
      return { ok: false, reason: 'provider_unavailable' };
    }
  }

  return { verifyNotification };
}
