import { NextResponse } from 'next/server';
import { getRelease } from '@/lib/discogs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const release = await getRelease(parseInt(id, 10));
    return NextResponse.json(release);
  } catch (error) {
    console.error('Failed to fetch release:', error);
    return NextResponse.json({ error: 'Failed to fetch release' }, { status: 500 });
  }
}
