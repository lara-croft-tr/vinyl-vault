// Discogs API client

const DISCOGS_BASE = 'https://api.discogs.com';
const TOKEN = process.env.DISCOGS_TOKEN;
const USERNAME = process.env.DISCOGS_USERNAME;

const headers = {
  'Authorization': `Discogs token=${TOKEN}`,
  'User-Agent': 'VinylVault/1.0',
};

export interface Artist {
  name: string;
  id: number;
}

export interface Format {
  name: string;
  qty: string;
  text?: string;
  descriptions: string[];
}

export interface Label {
  name: string;
  catno: string;
  id: number;
}

export interface BasicInfo {
  id: number;
  master_id: number;
  title: string;
  year: number;
  thumb: string;
  cover_image: string;
  artists: Artist[];
  formats: Format[];
  labels: Label[];
  genres: string[];
  styles: string[];
}

export interface CollectionItem {
  id: number;
  instance_id: number;
  date_added: string;
  rating: number;
  basic_information: BasicInfo;
  notes: { field_id: number; value: string }[];
}

export interface WantsItem {
  id: number;
  rating: number;
  date_added: string;
  basic_information: BasicInfo;
  notes?: string;
}

export interface MarketplaceListing {
  id: number;
  status: string;
  price: { value: number; currency: string };
  condition: string;
  sleeve_condition: string;
  ships_from: string;
  seller: { username: string; rating: number };
  release: { id: number; description: string; thumbnail: string };
}

export interface PriceStats {
  lowest_price: { value: number; currency: string };
  num_for_sale: number;
}

export async function getCollection(page = 1, perPage = 50): Promise<{
  items: CollectionItem[];
  pagination: { pages: number; items: number };
}> {
  const res = await fetch(
    `${DISCOGS_BASE}/users/${USERNAME}/collection/folders/0/releases?page=${page}&per_page=${perPage}&sort=added&sort_order=desc`,
    { headers, next: { revalidate: 300, tags: ['collection'] } }
  );
  const data = await res.json();
  return {
    items: data.releases || [],
    pagination: data.pagination,
  };
}

/**
 * Fetch entire collection in one call. First page reveals pagination.pages,
 * remaining pages are fetched in parallel. Cached 5 min via tag 'collection'.
 */
export async function getCollectionAll(perPage = 100, maxPages = 20): Promise<{
  items: CollectionItem[];
  totalItems: number;
}> {
  const first = await getCollection(1, perPage);
  const totalItems = first.pagination.items;
  const pages = Math.min(first.pagination.pages, maxPages);

  if (pages <= 1) {
    return { items: first.items, totalItems };
  }

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => getCollection(i + 2, perPage)),
  );

  const items = [
    ...first.items,
    ...rest.flatMap((p) => p.items),
  ];
  return { items, totalItems };
}

export async function getWants(): Promise<WantsItem[]> {
  const res = await fetch(
    `${DISCOGS_BASE}/users/${USERNAME}/wants?per_page=100`,
    { headers, next: { revalidate: 300, tags: ['wants'] } }
  );
  const data = await res.json();
  return data.wants || [];
}

export async function addToWants(releaseId: number): Promise<void> {
  const res = await fetch(`${DISCOGS_BASE}/users/${USERNAME}/wants/${releaseId}`, {
    method: 'PUT',
    headers,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Discogs add-to-wants failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

export async function removeFromWants(releaseId: number): Promise<void> {
  const res = await fetch(`${DISCOGS_BASE}/users/${USERNAME}/wants/${releaseId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Discogs remove-from-wants failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

export async function addToCollection(releaseId: number, folderId = 1): Promise<{ instance_id: number }> {
  const res = await fetch(
    `${DISCOGS_BASE}/users/${USERNAME}/collection/folders/${folderId}/releases/${releaseId}`,
    {
      method: 'POST',
      headers,
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Discogs add-to-collection failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function removeFromCollection(folderId: number, releaseId: number, instanceId: number): Promise<void> {
  await fetch(
    `${DISCOGS_BASE}/users/${USERNAME}/collection/folders/${folderId}/releases/${releaseId}/instances/${instanceId}`,
    {
      method: 'DELETE',
      headers,
    }
  );
}

export async function searchReleases(
  query: string,
  options: { type?: 'release' | 'master'; genre?: string; decade?: string; year?: string; page?: number; perPage?: number } = {},
): Promise<{ results: BasicInfo[]; pagination: { page: number; pages: number; items: number; perPage: number } }> {
  const { type = 'release', genre, decade, year, page = 1, perPage = 30 } = options;

  // NOTE: 'format' filter is only respected on release search. Discogs
  // master search ignores format, so omit it there.
  const params = new URLSearchParams({
    q: query,
    type,
    per_page: String(perPage),
    page: String(page),
  });
  if (type === 'release') params.append('format', 'Vinyl');

  if (genre) {
    params.append('genre', genre);
  }

  if (year) {
    params.append('year', year);
  } else if (decade) {
    const startYear = parseInt(decade.replace('s', ''), 10);
    if (!isNaN(startYear)) {
      params.append('year', `${startYear}-${startYear + 9}`);
    }
  }

  const res = await fetch(
    `${DISCOGS_BASE}/database/search?${params.toString()}`,
    { headers },
  );
  const data = await res.json();
  return {
    results: data.results || [],
    pagination: {
      page: data.pagination?.page ?? page,
      pages: data.pagination?.pages ?? 1,
      items: data.pagination?.items ?? (data.results?.length ?? 0),
      perPage: data.pagination?.per_page ?? perPage,
    },
  };
}

export async function getRelease(id: number): Promise<any> {
  const res = await fetch(`${DISCOGS_BASE}/releases/${id}`, { headers });
  return res.json();
}

export async function getMasterRelease(masterId: number): Promise<{ main_release: number; title: string; year: number; artists: Artist[] }> {
  const res = await fetch(`${DISCOGS_BASE}/masters/${masterId}`, {
    headers,
    next: { revalidate: 60 * 60 * 24 * 30 },  // master metadata is very stable
  });
  if (!res.ok) {
    throw new Error(`Discogs master ${masterId} lookup failed (${res.status})`);
  }
  const data = await res.json();
  if (!data.main_release) {
    throw new Error(`Discogs master ${masterId} has no main_release`);
  }
  return {
    main_release: data.main_release,
    title: data.title,
    year: data.year,
    artists: data.artists || [],
  };
}

export async function getMarketplaceStats(releaseId: number): Promise<PriceStats> {
  const res = await fetch(
    `${DISCOGS_BASE}/marketplace/stats/${releaseId}?curr_abbr=USD`,
    { headers, next: { revalidate: 60 * 60 * 24, tags: [`marketplace:${releaseId}`] } },
  );
  return res.json();
}

/**
 * Discogs price_suggestions returns condition-graded median prices.
 * Keys are standard Goldmine grades: Mint, Near Mint, VG+, VG, G+, G, F, P.
 * Much more accurate for valuation than the global lowest_price.
 */
export type PriceSuggestion = { currency: string; value: number };
export type PriceSuggestions = Partial<Record<
  'Mint (M)' | 'Near Mint (NM or M-)' | 'Very Good Plus (VG+)' | 'Very Good (VG)' |
  'Good Plus (G+)' | 'Good (G)' | 'Fair (F)' | 'Poor (P)',
  PriceSuggestion
>>;

export async function getPriceSuggestions(releaseId: number): Promise<PriceSuggestions> {
  const res = await fetch(
    `${DISCOGS_BASE}/marketplace/price_suggestions/${releaseId}`,
    { headers, next: { revalidate: 60 * 60 * 24 * 7, tags: [`suggestions:${releaseId}`] } },
  );
  if (!res.ok) return {};
  return res.json();
}

export async function searchMarketplace(releaseId: number, country = 'US'): Promise<MarketplaceListing[]> {
  const res = await fetch(
    `${DISCOGS_BASE}/marketplace/listings?release_id=${releaseId}&ships_from=${country}&status=For+Sale&per_page=50`,
    { headers }
  );
  const data = await res.json();
  return data.listings || [];
}

export function formatCondition(condition: string): string {
  const map: Record<string, string> = {
    'Mint (M)': 'M',
    'Near Mint (NM or M-)': 'NM',
    'Very Good Plus (VG+)': 'VG+',
    'Very Good (VG)': 'VG',
    'Good Plus (G+)': 'G+',
    'Good (G)': 'G',
    'Fair (F)': 'F',
    'Poor (P)': 'P',
  };
  return map[condition] || condition;
}
