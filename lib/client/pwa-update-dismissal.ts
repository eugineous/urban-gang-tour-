const STORAGE_KEY = 'ugt-update-dismissed-v1';
let dismissedRelease:string|null = null;

/** Stores only a public release identifier in this tab, never form or account data. */
export function dismissUpdate(release:string|null) {
  if (!release) return;
  dismissedRelease = release;
  try {sessionStorage.setItem(STORAGE_KEY, release);} catch {/* Current-page dismissal still works when storage is denied. */}
}

export function updateWasDismissed(release:string|null) {
  if (!release) return false;
  try {if (sessionStorage.getItem(STORAGE_KEY) === release) return true;} catch {/* Fall back to this document's memory. */}
  return dismissedRelease === release;
}
