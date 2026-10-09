/* One release lifecycle for public pages, commerce and installed browsers. */
(() => {
  if (window.__ugtReleaseStarted || !('serviceWorker' in navigator)) return;
  window.__ugtReleaseStarted = true;
  const release = 'single-interface-20261009-v2';
  const hadController = Boolean(navigator.serviceWorker.controller);
  // A replaced old controller needs one reload to discard its in-memory runtime.
  // Do not reload while a visitor is entering a form or payment details.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || /\/(checkout|admin|organizer|account)(\/|$)/.test(location.pathname)) return;
    if (document.querySelector('form') || document.activeElement?.matches('input,textarea,select')) return;
    try {
      if (sessionStorage.getItem('ugt-release-reloaded') === release) return;
      sessionStorage.setItem('ugt-release-reloaded', release);
      location.reload();
    } catch (_) { /* A manual refresh still obtains the current release. */ }
  });
  navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'})
    .then(registration => {
      const update = () => registration.update().catch(() => {});
      update();
      window.addEventListener('pageshow', update);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
    }).catch(() => {});
})();
