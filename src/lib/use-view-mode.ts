'use client';

import { useEffect, useState } from 'react';

export type ViewMode = 'grid' | 'list';

/**
 * Persisted view-mode preference. Keyed per-screen so Collection and Wants
 * remember independent choices.
 *
 * Usage:
 *   const [viewMode, setViewMode] = useViewMode('collection', 'grid');
 */
export function useViewMode(key: string, initial: ViewMode = 'grid'): [ViewMode, (v: ViewMode) => void] {
  const storageKey = `vinyl-vault:view-mode:${key}`;
  const [viewMode, setViewMode] = useState<ViewMode>(initial);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === 'grid' || stored === 'list') {
        setViewMode(stored);
      }
    } catch {
      /* ignore storage errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (v: ViewMode) => {
    setViewMode(v);
    try {
      window.localStorage.setItem(storageKey, v);
    } catch {
      /* ignore */
    }
  };

  return [viewMode, update];
}
