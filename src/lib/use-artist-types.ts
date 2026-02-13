'use client';

import { useState, useEffect } from 'react';

const CACHE_KEY = 'vinyl-vault-artist-types';

function loadCache(): Record<number, 'person' | 'band'> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(data: Record<number, 'person' | 'band'>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export function useArtistTypes(artistIds: { id: number; name: string }[]) {
  const [artistTypes, setArtistTypes] = useState<Record<number, 'person' | 'band'>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (artistIds.length === 0) return;

    const cached = loadCache();
    const uncached = artistIds.filter(a => !(a.id in cached));

    // Set cached values immediately
    if (Object.keys(cached).length > 0) {
      setArtistTypes(cached);
    }

    if (uncached.length === 0) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      const results = { ...cached };

      for (const artist of uncached) {
        if (cancelled) break;
        try {
          const res = await fetch(`/api/artist-type/${artist.id}`);
          const data = await res.json();
          results[artist.id] = data.type || 'band';
        } catch {
          results[artist.id] = 'band';
        }
        // Rate limit: ~1 second between requests
        if (!cancelled) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!cancelled) {
        saveCache(results);
        setArtistTypes(results);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(artistIds.map(a => a.id).sort())]);

  return { artistTypes, loading };
}
