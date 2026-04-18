import { NextResponse } from 'next/server';
import { getCollectionAll } from '@/lib/discogs';

/**
 * Return the set of normalized (artist|title) keys for every item in the
 * collection. Small payload designed to be fetched on the marketplace page
 * so the client can filter out releases already owned.
 *
 * Matches the normalization used by /api/collection/check-duplicate so the
 * two stay consistent (lowercase, strip non-alphanumerics).
 */
export const revalidate = 300;

const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

export async function GET() {
  try {
    const { items } = await getCollectionAll(100, 20);
    const keys = new Set<string>();
    for (const item of items) {
      const info = item.basic_information;
      const artist = info.artists?.[0]?.name || '';
      const title = info.title || '';
      if (artist && title) {
        keys.add(`${normalize(artist)}|${normalize(title)}`);
      }
    }
    return NextResponse.json({ keys: Array.from(keys) });
  } catch (error) {
    console.error('Collection keys error:', error);
    return NextResponse.json({ error: 'Failed to build collection keys' }, { status: 500 });
  }
}
