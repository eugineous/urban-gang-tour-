'use client';

import { useEffect } from 'react';

export function InstallableApp() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch(() => {});
    }
  }, []);
  return null;
}
