'use client';
import { useEffect, useState } from 'react';

type Defaults = Record<string, string>;
type Allowed = Record<string, readonly string[]>;

export function readUrlFilters(params: URLSearchParams, defaults: Defaults, allowed: Allowed = {}) {
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const raw = params.get(key);
    const value = raw === null ? fallback : raw.slice(0, 200);
    return [key, allowed[key] && !allowed[key].includes(value) ? fallback : value];
  }));
}

// Typing replaces the current history entry; explicit filter choices create
// one navigable entry. Popstate restores the controls from the URL.
export function useUrlFilters(defaults: Defaults, allowed: Allowed = {}) {
  const [values, setValues] = useState(defaults);
  const signature = JSON.stringify([defaults, allowed]);
  useEffect(() => {
    const [initial, valid] = JSON.parse(signature) as [Defaults, Allowed];
    const read = () => {
      const url = new URL(location.href);
      const next = readUrlFilters(url.searchParams, initial, valid);
      for (const [key, fallback] of Object.entries(initial)) {
        if (next[key] === fallback || !next[key]) url.searchParams.delete(key);
        else url.searchParams.set(key, next[key]);
      }
      if (url.href !== location.href) history.replaceState(history.state, '', url);
      setValues(next);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [signature]);
  const update = (patch: Defaults, replace = false) => {
    const url = new URL(location.href);
    const next = readUrlFilters(new URLSearchParams({ ...values, ...patch }), defaults, allowed);
    for (const [key, fallback] of Object.entries(defaults)) {
      if (next[key] === fallback || !next[key]) url.searchParams.delete(key);
      else url.searchParams.set(key, next[key]);
    }
    if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState'](history.state, '', url);
    setValues(next);
  };
  return [values, update] as const;
}
