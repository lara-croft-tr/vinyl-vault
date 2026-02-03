import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');
  const title = searchParams.get('title');
  
  if (!artist || !title) {
    return NextResponse.json({ error: 'artist and title required' }, { status: 400 });
  }
  
  // Clean up the title - remove things like "(feat. ...)" or "[Remaster]"
  const cleanTitle = title
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/\s*\[.*?\]\s*/g, '')
    .trim();
  
  const cleanArtist = artist
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim();
  
  try {
    // Try lyrics.ovh first
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );
    
    if (res.ok) {
      const data = await res.json();
      if (data.lyrics) {
        return NextResponse.json({ 
          lyrics: data.lyrics,
          source: 'lyrics.ovh',
        });
      }
    }
    
    // Not found - return search URL as fallback
    const searchQuery = encodeURIComponent(`${cleanArtist} ${cleanTitle} lyrics`);
    return NextResponse.json({ 
      lyrics: null,
      searchUrl: `https://www.google.com/search?q=${searchQuery}`,
      geniusUrl: `https://genius.com/search?q=${searchQuery}`,
    });
    
  } catch (error) {
    console.error('Lyrics fetch error:', error);
    const searchQuery = encodeURIComponent(`${artist} ${title} lyrics`);
    return NextResponse.json({ 
      lyrics: null,
      searchUrl: `https://www.google.com/search?q=${searchQuery}`,
    });
  }
}
