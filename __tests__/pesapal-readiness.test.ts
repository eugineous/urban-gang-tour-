import { describe, expect, it, vi } from 'vitest';
import { pesapalReadiness } from '@/lib/server/pesapal-config';

vi.mock('server-only', () => ({}));

const configured = {
  PESAPAL_ENV: 'sandbox',
  PESAPAL_CONSUMER_KEY: 'fixture-consumer-key',
  PESAPAL_CONSUMER_SECRET: 'fixture-consumer-secret',
  PESAPAL_NOTIFICATION_ID: '84740ab4-3cd9-47da-8a4f-dd1db53494b5',
  PESAPAL_CALLBACK_URL: 'https://merchant.example.invalid/payment-return',
  PESAPAL_IPN_URL: 'https://merchant.example.invalid/payment-notification',
};

describe('Pesapal configuration readiness', () => {
  it('reports missing configuration without enabling checkout or disclosing values', () => {
    const result = pesapalReadiness({});
    expect(result.configurationReady).toBe(false);
    expect(result.checkoutEnabled).toBe(false);
    expect(result.configurationIssues).toEqual([
      { variable: 'PESAPAL_ENV', reason: 'missing' },
      { variable: 'PESAPAL_CONSUMER_KEY', reason: 'missing' },
      { variable: 'PESAPAL_CONSUMER_SECRET', reason: 'missing' },
      { variable: 'PESAPAL_NOTIFICATION_ID', reason: 'missing' },
      { variable: 'PESAPAL_CALLBACK_URL', reason: 'missing' },
      { variable: 'PESAPAL_IPN_URL', reason: 'missing' },
    ]);
  });

  it('keeps a fully configured provider unavailable until durable integration is implemented', () => {
    const result = pesapalReadiness(configured);
    expect(result).toMatchObject({ configurationReady: true, checkoutEnabled: false, configurationIssues: [] });
    expect(result.integrationBlockers).toEqual([
      'durable_payment_binding_not_integrated',
      'checkout_and_notification_routes_not_integrated',
      'reconciliation_not_integrated',
    ]);
    expect(JSON.stringify(result)).not.toContain('fixture-consumer');
  });

  it.each([
    ['PESAPAL_ENV', 'live'],
    ['PESAPAL_CONSUMER_KEY', '   '],
    ['PESAPAL_CONSUMER_SECRET', 'secret\nwith-newline'],
    ['PESAPAL_NOTIFICATION_ID', 'not-a-registered-guid'],
    ['PESAPAL_CALLBACK_URL', 'http://merchant.example.invalid/return'],
    ['PESAPAL_IPN_URL', 'https://user:password@merchant.example.invalid/ipn'],
    ['PESAPAL_IPN_URL', 'https://merchant.example.invalid/ipn#fragment'],
  ])('rejects invalid %s while exposing only the variable name', (variable, value) => {
    const result = pesapalReadiness({ ...configured, [variable]: value });
    expect(result.configurationReady).toBe(false);
    expect(result.checkoutEnabled).toBe(false);
    expect(result.configurationIssues.map(issue => issue.variable)).toEqual([variable]);
    expect(JSON.stringify(result)).not.toContain(value);
  });
});
