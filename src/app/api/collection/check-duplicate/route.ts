import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/discogs';

export async function POST(request: Request) {
  try {
    const { artist, title } = await request.json();
    
    if (!artist || !title) {
      return NextResponse.json({ error: 'artist and title required' }, { status: 400 });
    }

    // Normalize for comparison
    const normalizeStr = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const targetArtist = normalizeStr(artist);
    const targetTitle = normalizeStr(title);

    // Fetch all collection pages to check
    let page = 1;
    let hasMore = true;
    const duplicates: { id: number; title: string; artist: string; year: number; format: string }[] = [];

    while (hasMore) {
      const { items, pagination } = await getCollection(page, 100);
      
      for (const item of items) {
        const info = item.basic_information;
        const itemArtist = normalizeStr(info.artists?.[0]?.name || '');
        const itemTitle = normalizeStr(info.title || '');
        
        // Check if artist and title match
        if (itemArtist === targetArtist && itemTitle === targetTitle) {
          duplicates.push({
            id: info.id,
            title: info.title,
            artist: info.artists?.[0]?.name || 'Unknown',
            year: info.year,
            format: info.formats?.[0]?.name || 'Unknown',
          });
        }
      }

      hasMore = page < pagination.pages;
      page++;
      
      // Safety limit - don't check more than 10 pages (1000 records)
      if (page > 10) break;
    }

    return NextResponse.json({ 
      hasDuplicate: duplicates.length > 0,
      duplicates 
    });
  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 });
  }
}
