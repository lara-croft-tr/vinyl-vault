import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = process.env.DISCOGS_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.discogs.com/masters/${id}`, {
      headers: {
        Authorization: `Discogs token=${token}`,
        'User-Agent': 'VinylVault/1.0',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ year: null });
    }

    const data = await res.json();
    return NextResponse.json({ year: data.year || null });
  } catch {
    return NextResponse.json({ year: null });
  }
}
