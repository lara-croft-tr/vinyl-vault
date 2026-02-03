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
  
  const searchQuery = encodeURIComponent(`${cleanArtist} ${cleanTitle} lyrics`);
  const fallback = {
    lyrics: null,
    searchUrl: `https://www.google.com/search?q=${searchQuery}`,
    geniusUrl: `https://genius.com/search?q=${searchQuery}`,
  };
  
  try {
    // Try lyrics.ovh with 5 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
      { 
        signal: controller.signal,
        cache: 'force-cache',
      }
    );
    
    clearTimeout(timeoutId);
    
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
    return NextResponse.json(fallback);
    
  } catch (error) {
    console.error('Lyrics fetch error:', error);
    return NextResponse.json(fallback);
  }
}
