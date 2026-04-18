import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  getMarketplaceStats,
  getPriceSuggestions,
  type PriceStats,
  type PriceSuggestions,
} from '@/lib/discogs';

/**
 * Per-release valuation (USD). Derivation priority:
 *  - `mid`:  Near Mint suggested price  -> VG+ -> VG -> lowest_price * 1.3
 *  - `low`:  VG+ suggested price        -> VG   -> lowest_price
 *  - `high`: Mint suggested price       -> NM * 1.2 -> lowest_price * 1.8
 */
export type ReleaseValue = {
  releaseId: number;
  low: number | null;
  mid: number | null;
  high: number | null;
  source: 'suggestions' | 'marketplace' | 'none';
  numForSale: number;
};

const CACHE_TTL_HIT = 60 * 60 * 24 * 7;   // 7 days
const CACHE_TTL_MISS = 60 * 60 * 6;       // 6 hours
const CONCURRENCY = 6;

const kvAvailable = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function cacheGet(key: string): Promise<ReleaseValue | null> {
  if (!kvAvailable) return null;
  try {
    return (await kv.get<ReleaseValue>(key)) ?? null;
  } catch {
    return null;
  }
}

async function cacheSet(key: string, value: ReleaseValue, ttl: number) {
  if (!kvAvailable) return;
  try {
    await kv.set(key, value, { ex: ttl });
  } catch {
    /* swallow */
  }
}

function pickPrice(s: PriceSuggestions | undefined, grade: keyof PriceSuggestions): number | null {
  const v = s?.[grade]?.value;
  return typeof v === 'number' ? v : null;
}

function computeValue(
  releaseId: number,
  suggestions: PriceSuggestions | null,
  stats: PriceStats | null,
): ReleaseValue {
  const numForSale = stats?.num_for_sale ?? 0;
  const lowestPrice = stats?.lowest_price?.value ?? null;

  if (suggestions && Object.keys(suggestions).length > 0) {
    const mint = pickPrice(suggestions, 'Mint (M)');
    const nearMint = pickPrice(suggestions, 'Near Mint (NM or M-)');
    const vgPlus = pickPrice(suggestions, 'Very Good Plus (VG+)');
    const vg = pickPrice(suggestions, 'Very Good (VG)');

    const mid = nearMint ?? vgPlus ?? vg ?? (lowestPrice ? lowestPrice * 1.3 : null);
    const low = vgPlus ?? vg ?? lowestPrice ?? (mid ? mid * 0.7 : null);
    const high = mint ?? (nearMint ? nearMint * 1.2 : (lowestPrice ? lowestPrice * 1.8 : null));

    return { releaseId, low, mid, high, source: 'suggestions', numForSale };
  }

  if (lowestPrice !== null) {
    return {
      releaseId,
      low: lowestPrice,
      mid: lowestPrice * 1.3,
      high: lowestPrice * 1.8,
      source: 'marketplace',
      numForSale,
    };
  }

  return { releaseId, low: null, mid: null, high: null, source: 'none', numForSale };
}

async function fetchOne(releaseId: number): Promise<ReleaseValue> {
  const key = `value:v2:${releaseId}`;
  const cached = await cacheGet(key);
  if (cached) return cached;

  const [suggestions, stats] = await Promise.all([
    getPriceSuggestions(releaseId).catch(() => null),
    getMarketplaceStats(releaseId).catch(() => null),
  ]);

  const value = computeValue(releaseId, suggestions, stats);
  await cacheSet(key, value, value.source === 'none' ? CACHE_TTL_MISS : CACHE_TTL_HIT);
  return value;
}

async function batchFetch(ids: number[]): Promise<ReleaseValue[]> {
  const results: ReleaseValue[] = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const resolved = await Promise.all(batch.map(fetchOne));
    results.push(...resolved);
  }
  return results;
}

/**
 * GET /api/stats/value?releaseId=NNN           (single, backwards-compat)
 * GET /api/stats/value?ids=111,222,333         (batch)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  const releaseIdParam = searchParams.get('releaseId');

  if (idsParam) {
    const ids = idsParam
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'no valid ids' }, { status: 400 });
    }
    const values = await batchFetch(ids);
    return NextResponse.json({ values });
  }

  if (!releaseIdParam) {
    return NextResponse.json({ error: 'releaseId or ids required' }, { status: 400 });
  }

  const releaseId = parseInt(releaseIdParam, 10);
  if (!Number.isFinite(releaseId) || releaseId <= 0) {
    return NextResponse.json({ error: 'invalid releaseId' }, { status: 400 });
  }

  const value = await fetchOne(releaseId);
  return NextResponse.json({
    ...value,
    // back-compat shape for existing StatsView loop
    lowest_price: value.low !== null ? { value: value.low, currency: 'USD' } : undefined,
    num_for_sale: value.numForSale,
  });
}
