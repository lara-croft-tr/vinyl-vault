import { NextResponse } from 'next/server';
import { searchReleases } from '@/lib/discogs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || undefined;
  const decade = searchParams.get('decade') || undefined;
  const year = searchParams.get('year') || undefined;
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const type = searchParams.get('type') === 'master' ? 'master' : 'release';

  if (!query) {
    return NextResponse.json({ results: [], pagination: { page: 1, pages: 0, items: 0, perPage: 30 } });
  }

  try {
    const { results, pagination } = await searchReleases(query, { genre, decade, year, page, type });
    return NextResponse.json({ results, pagination });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
