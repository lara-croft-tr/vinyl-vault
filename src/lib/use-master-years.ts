'use client';

import { useState, useEffect, useRef } from 'react';

interface MasterYearItem {
  masterId: number;
}

export function useMasterYears(items: MasterYearItem[]) {
  const [masterYears, setMasterYears] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current || items.length === 0) return;
    fetchedRef.current = true;

    const fetchYears = async () => {
      // Load from cache
      const cacheKey = 'vinyl-vault-master-years';
      const cached: Record<number, number> = JSON.parse(localStorage.getItem(cacheKey) || '{}');

      // Find uncached master IDs (skip 0 = no master)
      const uniqueIds = [...new Set(items.map(i => i.masterId).filter(id => id > 0))];
      const uncached = uniqueIds.filter(id => cached[id] === undefined);

      // Apply cached immediately
      if (Object.keys(cached).length > 0) {
        setMasterYears(cached);
      }

      if (uncached.length === 0) return;

      setLoading(true);

      for (const id of uncached) {
        try {
          const res = await fetch(`/api/master-year/${id}`);
          const data = await res.json();
          if (data.year) {
            cached[id] = data.year;
            setMasterYears({ ...cached });
          } else {
            cached[id] = 0; // Mark as "no year" so we don't re-fetch
          }
        } catch {
          // Skip failures
        }
        // Rate limit
        await new Promise(r => setTimeout(r, 1000));
      }

      localStorage.setItem(cacheKey, JSON.stringify(cached));
      setLoading(false);
    };

    fetchYears();
  }, [items]);

  return { masterYears, loading };
}
