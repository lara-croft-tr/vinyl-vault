import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/discogs';

// Authenticated proxy for sharing - returns read-only collection data
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = parseInt(searchParams.get('perPage') || '100', 10);
  
  try {
    const { items, pagination } = await getCollection(page, perPage);
    
    // Strip any sensitive data, return only what's needed for display
    const safeItems = items.map(item => ({
      instance_id: item.instance_id,
      date_added: item.date_added,
      basic_information: {
        id: item.basic_information.id,
        title: item.basic_information.title,
        year: item.basic_information.year,
        thumb: item.basic_information.thumb,
        cover_image: item.basic_information.cover_image,
        artists: item.basic_information.artists,
        formats: item.basic_information.formats,
        labels: item.basic_information.labels,
        genres: item.basic_information.genres,
        styles: item.basic_information.styles,
      },
    }));
    
    return NextResponse.json({ 
      items: safeItems, 
      pagination,
      username: process.env.DISCOGS_USERNAME,
    });
  } catch (error) {
    console.error('Share collection error:', error);
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 });
  }
}
