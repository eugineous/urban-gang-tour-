
'use client';
import { useEffect } from 'react';
export function InstallableApp() {
  useEffect(() => {
    if (document.querySelector('script[data-ugt-release]')) return;
    const script = document.createElement('script');
    script.src = '/release-client.js';
    script.dataset.ugtRelease = 'true';
    document.head.appendChild(script);
  }, []);
  return null;
}
