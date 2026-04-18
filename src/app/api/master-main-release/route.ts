import { NextResponse } from 'next/server';
import { getMasterRelease } from '@/lib/discogs';

/**
 * Resolve a Discogs master id to its main release id.
 * Used by the search page so the release-detail modal can open the
 * canonical pressing when a master search result is clicked.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get('id');
  const masterId = idParam ? parseInt(idParam, 10) : NaN;

  if (!Number.isFinite(masterId) || masterId <= 0) {
    return NextResponse.json({ error: 'valid id required' }, { status: 400 });
  }

  try {
    const master = await getMasterRelease(masterId);
    return NextResponse.json({ main_release: master.main_release, title: master.title, year: master.year });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve master';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
