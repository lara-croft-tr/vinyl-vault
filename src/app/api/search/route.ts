import { NextResponse } from 'next/server';
import { searchReleases } from '@/lib/discogs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  if (!query) {
    return NextResponse.json({ results: [] });
  }
  
  try {
    const results = await searchReleases(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
