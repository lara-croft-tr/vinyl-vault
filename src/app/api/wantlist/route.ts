import { NextResponse } from 'next/server';
import { getWantlist, addToWantlist, removeFromWantlist } from '@/lib/discogs';

export async function GET() {
  try {
    const data = await getWantlist();
    return NextResponse.json({ wants: data });
  } catch (error) {
    console.error('Wantlist fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch wantlist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { releaseId } = await request.json();
    await addToWantlist(releaseId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add to wantlist error:', error);
    return NextResponse.json({ error: 'Failed to add to wantlist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { releaseId } = await request.json();
    await removeFromWantlist(releaseId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove from wantlist error:', error);
    return NextResponse.json({ error: 'Failed to remove from wantlist' }, { status: 500 });
  }
}
