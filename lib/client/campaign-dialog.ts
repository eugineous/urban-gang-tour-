/** Join the shared overlay lifecycle so an offer cannot leave video playing behind it. */
export function openCampaignDialog(dialog: HTMLDialogElement): (() => void) | null {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null;
  const previousOverflow = document.body.style.overflow;
  try { dialog.showModal(); } catch { return null; }
  document.body.style.overflow = 'hidden';
  window.dispatchEvent(new CustomEvent('ugt-overlay-change', { detail: true }));
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    if (dialog.open) dialog.close();
    document.body.style.overflow = previousOverflow;
    window.dispatchEvent(new CustomEvent('ugt-overlay-change', { detail: false }));
  };
}
