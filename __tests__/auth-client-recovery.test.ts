import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({ values: [] as any[], index: 0, effects: [] as (() => any)[] }));
vi.mock('react', async (original) => ({ ...await original<any>(),
  useState: (initial: any) => { const i = hooks.index++; if (!(i in hooks.values)) hooks.values[i] = initial; return [hooks.values[i], (v: any) => { hooks.values[i] = v; }]; },
  useCallback: (fn: any) => fn,
  useEffect: (fn: () => any) => { hooks.effects.push(fn); },
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('token=test') }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
import AdminApp from '../app/admin/AdminApp';
import LoginForm from '../app/organizer/login/LoginForm';
import ResetForm from '../app/organizer/reset/ResetForm';
import Dashboard from '../app/organizer/dashboard/Dashboard';

function render(fn: () => any) { hooks.index = 0; hooks.effects = []; return fn(); }
function find(node: any, match: (n: any) => boolean): any {
  if (!node || typeof node !== 'object') return;
  if (match(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, match); if (found) return found; }
}
beforeEach(() => { hooks.values = []; hooks.index = 0; hooks.effects = []; vi.useFakeTimers(); vi.stubGlobal('window', { location: { href: '' } }); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it.each(['503', 'offline', 'malformed'])('keeps the admin shell closed and offers retry when its auth probe is %s', async (failure) => {
  vi.stubGlobal('fetch', async () => {
    if (failure === 'offline') throw new Error('offline');
    return new Response(failure === 'malformed' ? '{}' : JSON.stringify({ error: 'unavailable' }), { status: failure === '503' ? 503 : 200 });
  });
  render(() => AdminApp({ googleClientId: '' }));
  await hooks.effects[0]();
  for (let i = 0; i < 15; i++) await Promise.resolve();
  const tree = render(() => AdminApp({ googleClientId: '' }));
  expect(find(tree, n => n.type === 'button' && n.props.children === 'Try again')).toBeTruthy();
  expect(hooks.values[0]).not.toBe(true);
  vi.stubGlobal('fetch', async (path: string) => new Response(JSON.stringify(path.endsWith('/me') ? { ok: true, scope: 'super_admin', perms: [] } : { rows: [] })));
  await find(tree, n => n.type === 'button').props.onClick();
  expect(hooks.values[0]).toBe(true);
});

it('retains the admin session when logout is rejected', async () => {
  hooks.values[0] = true;
  vi.stubGlobal('fetch', async () => new Response('{}', { status: 503 }));
  const tree = render(() => AdminApp({ googleClientId: '' }));
  await tree.props.onLogout();
  expect(hooks.values[0]).toBe(true);
  vi.stubGlobal('fetch', async () => new Response('{"ok":true}'));
  await tree.props.onLogout();
  expect(hooks.values[0]).toBe(false);
});

it.each([['login', LoginForm], ['reset', ResetForm]] as const)('unlocks organizer %s after a network failure and preserves entered text', async (_name, Form) => {
  vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
  let tree = render(Form);
  const input = find(tree, n => n.type === 'input' && n.props.type === 'password');
  input.props.onChange({ target: { value: 'eightletters' } });
  tree = render(Form);
  await find(tree, n => n.type === 'button').props.onClick();
  tree = render(Form);
  expect(find(tree, n => n.type === 'button').props.disabled).toBe(false);
  expect(find(tree, n => n.type === 'input' && n.props.type === 'password').props.value).toBe('eightletters');
  expect(hooks.values.some(v => typeof v === 'string' && /connection|network|connect/i.test(v))).toBe(true);
});

it('keeps organizer logout on the dashboard when the server cannot clear its session', async () => {
  hooks.values[0] = { businessName: 'Test organizer' };
  vi.stubGlobal('fetch', async () => new Response('{"error":"unavailable"}', { status: 503 }));
  const tree = render(Dashboard);
  await find(tree, n => n.type === 'button' && n.props.children === 'Log out').props.onClick();
  expect(window.location.href).toBe('');
  expect(JSON.stringify(render(Dashboard))).toContain('Could not sign out');
});
