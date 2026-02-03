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

export interface WantlistItem {
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
    { headers, next: { revalidate: 60 } }
  );
  const data = await res.json();
  return {
    items: data.releases || [],
    pagination: data.pagination,
  };
}

export async function getWantlist(): Promise<WantlistItem[]> {
  const res = await fetch(
    `${DISCOGS_BASE}/users/${USERNAME}/wants?per_page=100`,
    { headers, next: { revalidate: 60 } }
  );
  const data = await res.json();
  return data.wants || [];
}

export async function addToWantlist(releaseId: number): Promise<void> {
  await fetch(`${DISCOGS_BASE}/users/${USERNAME}/wants/${releaseId}`, {
    method: 'PUT',
    headers,
  });
}

export async function removeFromWantlist(releaseId: number): Promise<void> {
  await fetch(`${DISCOGS_BASE}/users/${USERNAME}/wants/${releaseId}`, {
    method: 'DELETE',
    headers,
  });
}

export async function addToCollection(releaseId: number, folderId = 1): Promise<{ instance_id: number }> {
  const res = await fetch(
    `${DISCOGS_BASE}/users/${USERNAME}/collection/folders/${folderId}/releases/${releaseId}`,
    {
      method: 'POST',
      headers,
    }
  );
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

export async function searchReleases(query: string, type = 'release'): Promise<BasicInfo[]> {
  const res = await fetch(
    `${DISCOGS_BASE}/database/search?q=${encodeURIComponent(query)}&type=${type}&format=Vinyl&per_page=20`,
    { headers }
  );
  const data = await res.json();
  return data.results || [];
}

export async function getRelease(id: number): Promise<any> {
  const res = await fetch(`${DISCOGS_BASE}/releases/${id}`, { headers });
  return res.json();
}

export async function getMarketplaceStats(releaseId: number): Promise<PriceStats> {
  const res = await fetch(
    `${DISCOGS_BASE}/marketplace/stats/${releaseId}?curr_abbr=USD`,
    { headers }
  );
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

export async function getMasterRelease(masterId: number): Promise<any> {
  const res = await fetch(`${DISCOGS_BASE}/masters/${masterId}`, { headers });
  return res.json();
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
