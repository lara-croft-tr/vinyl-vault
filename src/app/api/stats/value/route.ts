import { NextResponse } from 'next/server';
import { getMarketplaceStats } from '@/lib/discogs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const releaseId = searchParams.get('releaseId');
  
  if (!releaseId) {
    return NextResponse.json({ error: 'releaseId required' }, { status: 400 });
  }
  
  try {
    const stats = await getMarketplaceStats(parseInt(releaseId, 10));
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
