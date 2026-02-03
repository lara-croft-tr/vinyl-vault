import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/discogs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('perPage') || '50');
  
  try {
    const data = await getCollection(page, perPage);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Collection fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 });
  }
}
