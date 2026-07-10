'use client';

import { useEffect } from 'react';
import SLUGS from '@/app/_lib/slugs.json';

// Progressive enhancement: after the SSR shell paints (great for crawlers +
// first paint), boot v25's real dc-runtime into #v25-host, booted to THIS
// route's page. That restores every interactive behaviour — hero video
// autoplay, in-page tab bars, cart, ticket flow, forms, admin — while each URL
// still ships full server-rendered HTML for SEO. Once the live app has
// rendered, the static shell is hidden.
export function V25App({ page }: { page: string }) {
  useEffect(() => {
    const w = window as any;
    w.__UGT_PAGE = page;
    // Card checkout bridge: the v25 template's "Pay with Card" button calls
    // this with the same {id, qty} cart lines the M-Pesa order flow sends.
    // The server re-prices everything from lib/server/catalog.ts and answers
    // with a hosted checkout URL. Paystack first (KES, Kenyan settlement),
    // Stripe as the fallback rail when Paystack is not configured.
    w.__UGT_CARD_PAY = async (items: { id: string; qty: number }[], email?: string) => {
      try {
        const body: { items: { id: string; qty: number }[]; email?: string } = { items };
        if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) body.email = email;
        const payload = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
        let r = await fetch('/api/paystack/checkout', payload);
        if (r.status === 503 || r.status === 502) r = await fetch('/api/stripe/checkout', payload);
        const d = await r.json().catch(() => ({}));
        if (d && d.url) location.href = d.url;
        else alert('Card payments are not available right now');
      } catch {
        alert('Card payments are not available right now');
      }
    };
    // Serve React from our own origin (fast, deterministic — no unpkg latency).
    // support.js reads window.__resources[cdnUrl] and uses the local path instead.
    w.__resources = {
      'https://unpkg.com/react@18.3.1/umd/react.production.min.js': '/vendor/react.production.min.js',
      'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js': '/vendor/react-dom.production.min.js',
      ...(w.__resources || {}),
    };

    const host = document.getElementById('v25-host');
    if (!host || host.getAttribute('data-booted') === '1') return;
    host.setAttribute('data-booted', '1');

    let poll: ReturnType<typeof setInterval> | undefined;
    let done = false;
    let attempts = 0;

    const dropVeil = () => {
      // hide only - removing the node raced React hydration (error 418)
      const veil = document.getElementById('boot-veil');
      if (veil) veil.classList.add('gone');
    };

    const reveal = () => {
      if (done) return;
      const root = document.getElementById('dc-root');
      if (root && root.childElementCount > 0) {
        done = true;
        host.style.position = 'static';
        host.style.height = 'auto';
        const shell = document.getElementById('ssr-shell');
        if (shell) shell.style.display = 'none';
        dropVeil();
        if (poll) clearInterval(poll);
      }
    };
    // slow-connection fallback: never hold the veil longer than 7s — the SSR
    // shell underneath is real content and the app keeps booting behind it
    const veilCap = setTimeout(dropVeil, 7000);

    const attempt = () => {
      attempts += 1;
      // the layout preloads this, so it resolves from cache almost instantly
      fetch('/v25-template.html', { cache: 'force-cache' })
        .then((r) => r.text())
        .then((html) => {
          host.innerHTML = html; // injects <x-dc> + <script data-dc-script>
          const s = document.createElement('script');
          s.src = '/support.js';
          s.async = false;
          document.body.appendChild(s); // support.js auto-boots on load
          if (poll) clearInterval(poll);
          poll = setInterval(reveal, 100);
        })
        .catch(() => {
          if (attempts < 3) setTimeout(attempt, 1500);
          else dropVeil(); // enhancement failed — show the SSR shell
        });
    };

    attempt();
    // Instant in-app navigation. Once the runtime is booted it exposes
    // window.__UGT_GO (patched go() in the template). Internal links then
    // switch pages in-app — no full reload, no re-boot — which is what makes
    // taps feel instant on mobile. Crawlers still see real <a href> URLs.
    const PATH_TO_PAGE: Record<string, string> = {
      '/': 'home', '/about': 'about', '/the-gang': 'gang', '/experience': 'exp',
      '/shop': 'shop', '/urban-news': 'news', '/gallery': 'gallery',
      '/partners': 'partners', '/events': 'events', '/book': 'contact',
      '/contact-us': 'contact',
    };
    const onLinkClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.origin !== location.origin) return;
      const w2 = window as any;
      const p = a.pathname.replace(/\/+$/, '') || '/';
      if (p === '/work-with-us' && typeof w2.__UGT_GO_WORK === 'function') {
        e.preventDefault();
        w2.__UGT_GO_WORK('brands');
      } else if (PATH_TO_PAGE[p] && typeof w2.__UGT_GO === 'function') {
        e.preventDefault();
        w2.__UGT_GO(PATH_TO_PAGE[p]);
      } else {
        return;
      }
      // notify chrome UI (tab bar / menu sheet) even when the URL didn't change
      window.dispatchEvent(new Event('ugt:nav'));
    };
    document.addEventListener('click', onLinkClick);
    // browser back/forward: switch in-app when possible, else full reload
    const onPop = () => {
      const w2 = window as any;
      const p = location.pathname.replace(/\/+$/, '') || '/';
      if (p === '/work-with-us' && typeof w2.__UGT_GO_WORK === 'function') w2.__UGT_GO_WORK('brands');
      else if (PATH_TO_PAGE[p] && typeof w2.__UGT_GO === 'function') w2.__UGT_GO(PATH_TO_PAGE[p]);
      else window.location.reload();
    };
    window.addEventListener('popstate', onPop);
    // news/blog cards: any rendered <article id="<slug>"> opens its full story
    const onCardClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('article[id]') as HTMLElement | null;
      if (el && (SLUGS as string[]).includes(el.id)) {
        window.location.href = '/blog/' + el.id;
      }
    };
    document.addEventListener('click', onCardClick);
    // safety: if the runtime hasn't rendered in 6s, re-attempt the boot once
    const watchdog = setTimeout(() => {
      if (!done && attempts < 3) { host.innerHTML = ''; attempt(); }
    }, 6000);
    const hardStop = setTimeout(() => poll && clearInterval(poll), 25000);

    return () => {
      if (poll) clearInterval(poll);
      clearTimeout(watchdog);
      clearTimeout(hardStop);
      clearTimeout(veilCap);
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('click', onLinkClick);
      document.removeEventListener('click', onCardClick);
    };
  }, [page]);

  return null;
}
