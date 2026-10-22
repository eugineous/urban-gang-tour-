/** Optional entrance motion. The server content is never hidden or gated by JS. */
export function enhanceHomeMotion(root: HTMLElement) {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Set<Animation>();
  const seen = new WeakSet<Element>();
  const allowed = () => !reduced.matches && !document.hidden &&
    document.documentElement.dataset.focusView !== 'true' &&
    !(navigator as Navigator & {connection?: {saveData?: boolean}}).connection?.saveData;
  const cancel = () => { for (const animation of active) animation.cancel(); active.clear(); };
  const preferences = () => { if (!allowed()) cancel(); };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || seen.has(entry.target)) continue;
      seen.add(entry.target);
      observer.unobserve(entry.target);
      const element = entry.target as HTMLElement;
      if (!allowed() || typeof element.animate !== 'function') continue;
      const animation = element.animate([
        {opacity: 0, transform: 'translateY(16px)'},
        {opacity: 1, transform: 'translateY(0)'},
      ], {duration: 460, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'none'});
      active.add(animation);
      animation.addEventListener('finish', () => active.delete(animation), {once: true});
    }
  }, {threshold: .08, rootMargin: '0px 0px -24px 0px'});
  root.querySelectorAll('[data-home-reveal],.section-title,.home-experiences>.project-card,.portfolio-highlights .collection-card,.institution-strip').forEach(element => observer.observe(element));
  reduced.addEventListener('change', preferences);
  window.addEventListener('ugt-focus-view', preferences);
  document.addEventListener('visibilitychange', preferences);
  return () => {
    observer.disconnect(); cancel();
    reduced.removeEventListener('change', preferences);
    window.removeEventListener('ugt-focus-view', preferences);
    document.removeEventListener('visibilitychange', preferences);
  };
}
