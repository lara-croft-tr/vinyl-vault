import { NextResponse } from 'next/server';
import { getMarketplaceStats, searchMarketplace } from '@/lib/discogs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const releaseId = parseInt(searchParams.get('releaseId') || '0');
  const country = searchParams.get('country') || 'US';
  
  if (!releaseId) {
    return NextResponse.json({ error: 'Release ID required' }, { status: 400 });
  }
  
  try {
    const [stats, listings] = await Promise.all([
      getMarketplaceStats(releaseId),
      searchMarketplace(releaseId, country),
    ]);
    
    return NextResponse.json({ stats, listings });
  } catch (error) {
    console.error('Marketplace error:', error);
    return NextResponse.json({ error: 'Marketplace search failed' }, { status: 500 });
  }
}
