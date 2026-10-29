import 'server-only';

export type PesapalEnvironment = Readonly<Record<string, string | undefined>>;

const VARIABLES = [
  'PESAPAL_ENV',
  'PESAPAL_CONSUMER_KEY',
  'PESAPAL_CONSUMER_SECRET',
  'PESAPAL_NOTIFICATION_ID',
  'PESAPAL_CALLBACK_URL',
  'PESAPAL_IPN_URL',
] as const;

type ConfigurationIssue = {
  variable: (typeof VARIABLES)[number];
  reason: 'missing' | 'invalid';
};

export type PesapalConfig = {
  environment: 'sandbox' | 'production';
  apiBase: string;
  consumerKey: string;
  consumerSecret: string;
  notificationId: string;
  callbackUrl: string;
  ipnUrl: string;
};

export const PESAPAL_TRACKING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCallbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
}

/** Private configuration only. Never serialize the successful result to clients or logs. */
export function readPesapalConfig(env: PesapalEnvironment = process.env):
  | { ok: true; config: PesapalConfig }
  | { ok: false; issues: ConfigurationIssue[] } {
  const issues: ConfigurationIssue[] = [];
  for (const variable of VARIABLES) {
    const value = env[variable];
    if (!value?.trim()) {
      issues.push({ variable, reason: 'missing' });
    } else if (value !== value.trim() || /[\r\n\0]/.test(value) ||
      (variable === 'PESAPAL_ENV' && value !== 'sandbox' && value !== 'production') ||
      (variable === 'PESAPAL_NOTIFICATION_ID' && !PESAPAL_TRACKING_ID.test(value)) ||
      ((variable === 'PESAPAL_CALLBACK_URL' || variable === 'PESAPAL_IPN_URL') && !isCallbackUrl(value))) {
      issues.push({ variable, reason: 'invalid' });
    }
  }
  if (issues.length) return { ok: false, issues };
  const environment = env.PESAPAL_ENV as PesapalConfig['environment'];
  return {
    ok: true,
    config: {
      environment,
      apiBase: environment === 'production'
        ? 'https://pay.pesapal.com/v3/api'
        : 'https://cybqa.pesapal.com/pesapalv3/api',
      consumerKey: env.PESAPAL_CONSUMER_KEY!,
      consumerSecret: env.PESAPAL_CONSUMER_SECRET!,
      notificationId: env.PESAPAL_NOTIFICATION_ID!,
      callbackUrl: env.PESAPAL_CALLBACK_URL!,
      ipnUrl: env.PESAPAL_IPN_URL!,
    },
  };
}

/** Syntax/presence checks only: this does not contact Pesapal or validate credentials. */
export function pesapalReadiness(env: PesapalEnvironment = process.env) {
  const configuration = readPesapalConfig(env);
  return {
    configurationReady: configuration.ok,
    checkoutEnabled: false as const,
    configurationIssues: configuration.ok ? [] : configuration.issues,
    integrationBlockers: [
      'durable_payment_binding_not_integrated',
      'checkout_and_notification_routes_not_integrated',
      'reconciliation_not_integrated',
    ] as const,
  };
}
