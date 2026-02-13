import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = process.env.DISCOGS_TOKEN;

  if (!token) {
    return NextResponse.json({ type: 'band' }, { status: 200 });
  }

  try {
    const res = await fetch(`https://api.discogs.com/artists/${id}`, {
      headers: {
        'Authorization': `Discogs token=${token}`,
        'User-Agent': 'VinylVault/1.0',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ type: 'band' });
    }

    const data = await res.json();

    // If artist has members array (non-empty) → band
    if (data.members && data.members.length > 0) {
      return NextResponse.json({ type: 'band' });
    }

    // If artist has realname or groups array → person
    if (data.realname || (data.groups && data.groups.length > 0)) {
      return NextResponse.json({ type: 'person', realname: data.realname });
    }

    // Default to band
    return NextResponse.json({ type: 'band' });
  } catch {
    return NextResponse.json({ type: 'band' });
  }
}
