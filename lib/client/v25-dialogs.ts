// Add keyboard and focus behavior to V25's existing modal markup without
// replacing its visual layout or its checkout state machine.
export function installV25Dialogs(host: HTMLElement): () => void {
  let active: HTMLElement | null = null;
  let returnFocus: HTMLElement | null = null;
  const originalOverflow = document.body.style.overflow;
  const items = () => active ? Array.from(active.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')).filter(el => el.getClientRects().length) : [];
  const sync = () => {
    const dialogs = Array.from(host.querySelectorAll<HTMLElement>('[data-v25-dialog]')).filter(el => el.getClientRects().length);
    const next = dialogs.sort((a, b) => Number(getComputedStyle(b).zIndex) - Number(getComputedStyle(a).zIndex))[0] || null;
    if (next === active) return;
    if (!active && next) returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    active = next;
    document.body.style.overflow = active ? 'hidden' : originalOverflow;
    if (active) {
      active.tabIndex = -1;
      (active.querySelector<HTMLElement>('[data-dialog-close]') || items()[0] || active).focus({ preventScroll: true });
    } else if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  };
  const onKey = (event: KeyboardEvent) => {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      active.querySelector<HTMLElement>('[data-dialog-close]')?.click();
    } else if (event.key === 'Tab') {
      const targets = items();
      const first = targets[0], last = targets[targets.length - 1];
      if (!first) { event.preventDefault(); active.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !active.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !active.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
  };
  const observer = new MutationObserver(sync);
  observer.observe(host, { childList: true, subtree: true });
  document.addEventListener('keydown', onKey);
  sync();
  return () => { observer.disconnect(); document.removeEventListener('keydown', onKey); document.body.style.overflow = originalOverflow; };
}
