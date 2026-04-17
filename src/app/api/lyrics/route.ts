import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const CACHE_HIT_TTL = 60 * 60 * 24 * 30;   // 30 days for successful lookups
const CACHE_MISS_TTL = 60 * 60 * 24 * 3;   // 3 days for negatives (retry sooner)
const SOURCE_TIMEOUT_MS = 3500;

type LyricsResult = {
  lyrics: string | null;
  source?: string;
  syncedLyrics?: string | null;
  searchUrl: string;
  geniusUrl: string;
};

/**
 * Normalize title before hitting lyrics APIs.
 * - strip "(...)" and "[...]" segments
 * - strip trailing " - Remastered 2019" / " - 2016 Remix" / " - Live at ..." style suffixes
 * - strip "feat. X" / "ft. X" not in parens
 * - strip leading "NN. " track-number prefix
 * - collapse whitespace
 */
function normalizeTitle(title: string): string {
  return title
    .replace(/^\s*\d{1,3}\.\s+/, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*\[[^\]]*\]\s*/g, ' ')
    .replace(/\s+[-–—]\s+(remaster(ed)?|remix|live( at)?|acoustic|mono|stereo|deluxe|anniversary|radio edit|single version|album version|extended( version)?|bonus track)[^-]*$/i, '')
    .replace(/\s+(feat\.|ft\.)\s+[^()-]+$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArtist(artist: string): string {
  return artist
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*,\s+the\s*$/i, '')
    .replace(/\s+(feat\.|ft\.)\s+.+$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAlbum(album: string | null): string | null {
  if (!album) return null;
  return album
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*\[[^\]]*\]\s*/g, ' ')
    .replace(/\s+(deluxe|remaster(ed)?|anniversary|expanded)[^-]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cacheKey(artist: string, title: string, album: string | null): string {
  return `lyrics:v1:${artist.toLowerCase()}|${title.toLowerCase()}|${(album || '').toLowerCase()}`;
}

async function fetchLrclib(artist: string, title: string, album: string | null): Promise<Partial<LyricsResult> | null> {
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
  });
  if (album) params.set('album_name', album);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VinylVault/1.0 (https://vinyl-vault-iota.vercel.app)' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.plainLyrics || data?.syncedLyrics) {
      return {
        lyrics: data.plainLyrics || null,
        syncedLyrics: data.syncedLyrics || null,
        source: 'lrclib',
      };
    }
  } catch (err) {
    clearTimeout(timer);
    console.warn('[lyrics] lrclib failed:', err instanceof Error ? err.message : err);
  }
  return null;
}

async function fetchLyricsOvh(artist: string, title: string): Promise<Partial<LyricsResult> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
      { signal: controller.signal, cache: 'force-cache' },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.lyrics) {
      return { lyrics: data.lyrics, source: 'lyrics.ovh' };
    }
  } catch (err) {
    clearTimeout(timer);
    console.warn('[lyrics] lyrics.ovh failed:', err instanceof Error ? err.message : err);
  }
  return null;
}

const kvAvailable = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function cacheGet(key: string): Promise<LyricsResult | null> {
  if (!kvAvailable) return null;
  try {
    return (await kv.get<LyricsResult>(key)) ?? null;
  } catch (err) {
    console.warn('[lyrics] kv get failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function cacheSet(key: string, value: LyricsResult, ttl: number) {
  if (!kvAvailable) return;
  try {
    await kv.set(key, value, { ex: ttl });
  } catch (err) {
    console.warn('[lyrics] kv set failed:', err instanceof Error ? err.message : err);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artistRaw = searchParams.get('artist');
  const titleRaw = searchParams.get('title');
  const albumRaw = searchParams.get('album');

  if (!artistRaw || !titleRaw) {
    return NextResponse.json({ error: 'artist and title required' }, { status: 400 });
  }

  const artist = normalizeArtist(artistRaw);
  const title = normalizeTitle(titleRaw);
  const album = normalizeAlbum(albumRaw);

  const searchQuery = encodeURIComponent(`${artist} ${title} lyrics`);
  const fallback: LyricsResult = {
    lyrics: null,
    searchUrl: `https://www.google.com/search?q=${searchQuery}`,
    geniusUrl: `https://genius.com/search?q=${searchQuery}`,
  };

  // 1. cache
  const key = cacheKey(artist, title, album);
  const cached = await cacheGet(key);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  // 2. race the sources; lrclib preferred (better coverage + synced lyrics)
  const [lrclibResult, lyricsOvhResult] = await Promise.all([
    fetchLrclib(artist, title, album),
    fetchLyricsOvh(artist, title),
  ]);

  const source = lrclibResult ?? lyricsOvhResult;

  if (source?.lyrics || source?.syncedLyrics) {
    const result: LyricsResult = { ...fallback, ...source };
    await cacheSet(key, result, CACHE_HIT_TTL);
    return NextResponse.json(result);
  }

  // 3. miss - cache negative for a short period so we don't hammer sources
  await cacheSet(key, fallback, CACHE_MISS_TTL);
  return NextResponse.json(fallback);
}
