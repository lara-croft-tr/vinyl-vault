import { NextResponse } from 'next/server';
import { getWants, addToWants, removeFromWants } from '@/lib/discogs';

export async function GET() {
  try {
    const data = await getWants();
    return NextResponse.json({ wants: data });
  } catch (error) {
    console.error('Wants fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch wants' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { releaseId } = await request.json();
    await addToWants(releaseId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add to wants error:', error);
    return NextResponse.json({ error: 'Failed to add to wants' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { releaseId } = await request.json();
    await removeFromWants(releaseId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove from wants error:', error);
    return NextResponse.json({ error: 'Failed to remove from wants' }, { status: 500 });
  }
}
