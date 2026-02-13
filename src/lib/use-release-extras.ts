'use client';

import { useState, useEffect, useRef } from 'react';

export interface ReleaseExtras {
  country?: string;
  lowestPrice?: number;
}

const COUNTRY_FLAGS: Record<string, string> = {
  'US': '🇺🇸',
  'USA': '🇺🇸',
  'UK': '🇬🇧',
  'Europe': '🇪🇺',
  'Germany': '🇩🇪',
  'Japan': '🇯🇵',
  'Canada': '🇨🇦',
  'France': '🇫🇷',
  'Italy': '🇮🇹',
  'Spain': '🇪🇸',
  'Netherlands': '🇳🇱',
  'Australia': '🇦🇺',
  'Brazil': '🇧🇷',
  'Sweden': '🇸🇪',
  'Belgium': '🇧🇪',
  'Austria': '🇦🇹',
  'Switzerland': '🇨🇭',
  'Portugal': '🇵🇹',
  'Denmark': '🇩🇰',
  'Norway': '🇳🇴',
  'Finland': '🇫🇮',
  'Ireland': '🇮🇪',
  'New Zealand': '🇳🇿',
  'Mexico': '🇲🇽',
  'Argentina': '🇦🇷',
  'South Korea': '🇰🇷',
  'Greece': '🇬🇷',
  'Poland': '🇵🇱',
  'Czech Republic': '🇨🇿',
  'South Africa': '🇿🇦',
  'India': '🇮🇳',
  'Russia': '🇷🇺',
  'Turkey': '🇹🇷',
  'Colombia': '🇨🇴',
  'Chile': '🇨🇱',
  'Philippines': '🇵🇭',
  'Indonesia': '🇮🇩',
  'Taiwan': '🇹🇼',
  'Israel': '🇮🇱',
  'Croatia': '🇭🇷',
  'Hungary': '🇭🇺',
  'Romania': '🇷🇴',
  'Yugoslavia': '🇷🇸',
};

export function getCountryFlag(country: string): string {
  return COUNTRY_FLAGS[country] || '🌍';
}

export function getCountryShort(country: string): string {
  const shorts: Record<string, string> = {
    'United States': 'US',
    'United Kingdom': 'UK',
    'Germany': 'DE',
    'Netherlands': 'NL',
    'Australia': 'AU',
    'New Zealand': 'NZ',
    'South Korea': 'KR',
    'South Africa': 'ZA',
    'Czech Republic': 'CZ',
  };
  return shorts[country] || country;
}

const CACHE_KEY = 'vinyl-vault-release-extras';

export function useReleaseExtras(releaseIds: number[]) {
  const [extras, setExtras] = useState<Record<number, ReleaseExtras>>({});
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current || releaseIds.length === 0) return;
    fetchedRef.current = true;

    const fetchExtras = async () => {
      const cached: Record<number, ReleaseExtras> = JSON.parse(
        localStorage.getItem(CACHE_KEY) || '{}'
      );

      const uniqueIds = [...new Set(releaseIds.filter(id => id > 0))];
      const uncached = uniqueIds.filter(id => cached[id] === undefined);

      if (Object.keys(cached).length > 0) {
        setExtras(cached);
      }

      if (uncached.length === 0) return;

      setLoading(true);

      for (const id of uncached) {
        try {
          const res = await fetch(`/api/release/${id}`);
          if (res.ok) {
            const data = await res.json();
            cached[id] = {
              country: data.country || undefined,
              lowestPrice: data.lowest_price ?? undefined,
            };
          } else {
            cached[id] = {};
          }
          setExtras({ ...cached });
        } catch {
          cached[id] = {};
        }
        // Rate limit: 1 request per second
        await new Promise(r => setTimeout(r, 1000));
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      setLoading(false);
    };

    fetchExtras();
  }, [releaseIds]);

  return { extras, loading };
}
