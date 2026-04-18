import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { addToCollection, getMasterRelease } from '@/lib/discogs';

export async function POST(request: Request) {
  try {
    const { releaseId, masterId } = await request.json();

    let effectiveReleaseId: number | undefined = releaseId;
    if (!effectiveReleaseId && masterId) {
      const master = await getMasterRelease(masterId);
      effectiveReleaseId = master.main_release;
    }

    if (!effectiveReleaseId) {
      return NextResponse.json({ error: 'releaseId or masterId required' }, { status: 400 });
    }

    const result = await addToCollection(effectiveReleaseId);
    revalidateTag('collection', 'max');
    return NextResponse.json({ success: true, instance_id: result.instance_id, releaseId: effectiveReleaseId });
  } catch (error) {
    console.error('Failed to add to collection:', error);
    const message = error instanceof Error ? error.message : 'Failed to add to collection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
