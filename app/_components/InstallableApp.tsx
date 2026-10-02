'use client';

import { useEffect } from 'react';

export function InstallableApp() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
