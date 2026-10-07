import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AccountApp from '@/app/account/AccountApp';

it('holds account entry behind session checking instead of flashing a login form on refresh', () => {
  const html = renderToStaticMarkup(createElement(AccountApp));
  expect(html).toContain('role="status"');
  expect(html).not.toContain('type="password"');
});
