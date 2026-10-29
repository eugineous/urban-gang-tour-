/* One release lifecycle for public pages, commerce and installed browsers. */
(() => {
  if (window.__ugtReleaseStarted || !('serviceWorker' in navigator)) return;
  window.__ugtReleaseStarted = true;
  const release = 'app-operations-20261028-v2';
  let hadController = Boolean(navigator.serviceWorker.controller);
  // A new controller must never discard a form, checkout or another tab's work.
  // The React notice offers an explicit refresh after the visitor is ready.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) window.dispatchEvent(new CustomEvent('ugt-release-activated', {detail:{release}}));
    hadController = true;
  });
  navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'})
    .then(registration => {
      const announce = () => { if (navigator.serviceWorker.controller && registration.waiting) window.dispatchEvent(new CustomEvent('ugt-release-ready', {detail:{release}})); };
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
