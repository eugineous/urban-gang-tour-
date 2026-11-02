/* One release lifecycle for public pages, commerce and installed browsers. */
(() => {
  if (window.__ugtReleaseStarted || !('serviceWorker' in navigator)) return;
  window.__ugtReleaseStarted = true;
  // Ask the worker, not this possibly stale page script. A visitor can keep
  // this document open across multiple deployments.
  const identity = worker => {
    if (!worker || typeof worker.postMessage !== 'function' || typeof MessageChannel === 'undefined') return Promise.resolve(null);
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const finish = value => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(value); };
      const timer = setTimeout(() => finish(null), 1500);
      channel.port1.onmessage = event => {
        const value = event.data?.release;
        finish(typeof value === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(value) ? value : null);
      };
      try { worker.postMessage({type:'GET_RELEASE'}, [channel.port2]); }
      catch { finish(null); }
    });
  };
  let hadController = Boolean(navigator.serviceWorker.controller);
  // A new controller must never discard a form, checkout or another tab's work.
  // The React notice offers an explicit refresh after the visitor is ready.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) {
      const controller = navigator.serviceWorker.controller;
      void identity(controller).then(release => {
        if (navigator.serviceWorker.controller === controller) window.dispatchEvent(new CustomEvent('ugt-release-activated', {detail:{release}}));
      });
    }
    hadController = true;
  });
  navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'})
    .then(registration => {
      const announce = () => {
        const waiting = registration.waiting;
        if (navigator.serviceWorker.controller && waiting) void identity(waiting).then(release => {
          if (registration.waiting === waiting) window.dispatchEvent(new CustomEvent('ugt-release-ready', {detail:{release}}));
        });
      };
      announce();
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (installing) installing.addEventListener('statechange', () => { if (installing.state === 'installed') announce(); });
      });
      const update = () => registration.update().catch(() => {});
      update();
      window.addEventListener('pageshow', update);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
    }).catch(() => {});
})();
