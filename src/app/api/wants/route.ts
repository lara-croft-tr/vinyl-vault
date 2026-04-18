import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getWants, addToWants, removeFromWants, getMasterRelease } from '@/lib/discogs';

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
    const { releaseId, masterId } = await request.json();
    let effective: number | undefined = releaseId;
    if (!effective && masterId) {
      const master = await getMasterRelease(masterId);
      effective = master.main_release;
    }
    if (!effective) {
      return NextResponse.json({ error: 'releaseId or masterId required' }, { status: 400 });
    }
    await addToWants(effective);
    revalidateTag('wants', 'max');
    return NextResponse.json({ success: true, releaseId: effective });
  } catch (error) {
    console.error('Add to wants error:', error);
    const message = error instanceof Error ? error.message : 'Failed to add to wants';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { releaseId } = await request.json();
    await removeFromWants(releaseId);
    revalidateTag('wants', 'max');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove from wants error:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove from wants';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
