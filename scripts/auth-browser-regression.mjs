import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:3100';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const user = { id: 'test-user', name: 'Browser Tester', email: 'tester@example.invalid', phone: '0712345678' };
const organizer = { id: 'test-organizer', businessName: 'Test Organizer', email: 'tester@example.invalid' };
async function scenario(name, run) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Every API request is intercepted. These tests never send credentials or writes to a backend.
  await context.route('**/api/**', route => route.fulfill({ json: { ok: true, rows: [], events: [], products: [], photos: [] } }));
  try {
    await run(page, context);
    assert.deepEqual(errors, [], `${name}: no uncaught browser errors`);
    console.log(`PASS mobile390 ${name}`);
  } finally { await context.close(); }
}

try {
  await scenario('admin session failure, retry, role visibility and logout preservation', async (page, context) => {
    let probeFails = true;
    let logoutFails = true;
    await context.route('**/api/admin/me', route => route.fulfill({ status: probeFails ? 503 : 200, json: probeFails ? { error: 'unavailable' } : { ok: true, scope: 'super_admin', perms: [] } }));
    await context.route('**/api/admin/login', route => route.fulfill({ status: logoutFails ? 503 : 200, json: logoutFails ? { error: 'unavailable' } : { ok: true } }));
    await page.goto(`${base}/admin`);
    await page.getByRole('alert').filter({ hasText: 'Could not check your session' }).waitFor();
    assert.equal(await page.locator('.cr-shell').count(), 0);
    probeFails = false;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.locator('.cr-shell').waitFor();
    await page.locator('.cr-logout').click();
    await page.getByText('Could not sign out. Please try again.', { exact: true }).waitFor();
    assert.equal(await page.locator('.cr-shell').isVisible(), true);
    logoutFails = false;
    await page.locator('.cr-logout').click();
    await page.getByRole('button', { name: 'Sign in to Control Room', exact: true }).waitFor();
  });

  await scenario('organizer login and reset transport failure, retry and input retention', async (page, context) => {
    for (const [kind, path, button] of [['login', '/organizer/login', 'Log in'], ['reset', '/organizer/reset?token=browser-test', 'Set new password']]) {
      let fails = true;
      await context.route(`**/api/organizer/${kind}`, route => fails ? route.abort('failed') : route.fulfill({ json: { ok: true } }));
      await context.route('**/api/organizer/me', route => route.fulfill({ json: { ok: true, organizer } }));
      await page.goto(base + path);
      if (kind === 'login') await page.getByLabel('Email', { exact: true }).fill('tester@example.invalid');
      const password = page.locator('input[type="password"]');
      await password.fill('browser-test-password');
      await page.getByRole('button', { name: button, exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Connection failed' }).waitFor();
      assert.equal(await password.inputValue(), 'browser-test-password');
      assert.equal(await page.getByRole('button', { name: button, exact: true }).isEnabled(), true);
      fails = false;
      await page.getByRole('button', { name: button, exact: true }).click();
      if (kind === 'login') await page.waitForURL('**/organizer/dashboard');
      else await page.getByText('Password updated', { exact: false }).waitFor();
    }
  });

  await scenario('organizer logout service failure preserves session and permits retry', async (page, context) => {
    let fails = true;
    await context.route('**/api/organizer/me', route => route.fulfill({ json: { ok: true, organizer } }));
    await context.route('**/api/organizer/logout', route => route.fulfill({ status: fails ? 503 : 200, json: fails ? { error: 'unavailable' } : { ok: true } }));
    await page.goto(`${base}/organizer/dashboard`);
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Could not sign out' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Test Organizer' }).isVisible(), true);
    fails = false;
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.waitForURL('**/organizer/login');
  });

  await scenario('account session failure, login transport recovery and logout preservation', async (page, context) => {
    let probeFails = true;
    let loginFails = true;
    let logoutFails = true;
    await context.route('**/api/auth', route => {
      const { action } = route.request().postDataJSON();
      if (action === 'me') return route.fulfill({ status: probeFails ? 503 : 200, json: probeFails ? { error: 'unavailable' } : { ok: true, user: null } });
      if (action === 'login') return loginFails ? route.abort('failed') : route.fulfill({ json: { ok: true, user } });
      if (action === 'logout') return route.fulfill({ status: logoutFails ? 503 : 200, json: logoutFails ? { error: 'unavailable' } : { ok: true } });
      return route.fulfill({ status: 400, json: { error: 'unexpected_test_action' } });
    });
    await page.goto(`${base}/account`);
    await page.getByRole('alert').filter({ hasText: 'could not check your account' }).waitFor();
    probeFails = false;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill('tester@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill('browser-test-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Check your connection and try again. Your details have been kept.' }).waitFor();
    assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), 'browser-test-password');
    assert.equal(await page.getByRole('button', { name: 'Sign in', exact: true }).isEnabled(), true);
    loginFails = false;
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('heading', { name: 'KARIBU, BROWSER TESTER' }).waitFor();
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'We could not complete that request. Please try again.' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'KARIBU, BROWSER TESTER' }).isVisible(), true);
    logoutFails = false;
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  });
} finally { await browser.close(); }
