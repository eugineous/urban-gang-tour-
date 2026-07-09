'use client';

import { useEffect } from 'react';

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

    const reveal = () => {
      if (done) return;
      const root = document.getElementById('dc-root');
      if (root && root.childElementCount > 0) {
        done = true;
        host.style.position = 'static';
        host.style.height = 'auto';
        const shell = document.getElementById('ssr-shell');
        if (shell) shell.style.display = 'none';
        if (poll) clearInterval(poll);
      }
    };

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
        });
    };

    attempt();
    // safety: if the runtime hasn't rendered in 6s, re-attempt the boot once
    const watchdog = setTimeout(() => {
      if (!done && attempts < 3) { host.innerHTML = ''; attempt(); }
    }, 6000);
    const hardStop = setTimeout(() => poll && clearInterval(poll), 25000);

    return () => {
      if (poll) clearInterval(poll);
      clearTimeout(watchdog);
      clearTimeout(hardStop);
    };
  }, [page]);

  return null;
}
