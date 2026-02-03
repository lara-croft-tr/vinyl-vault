import { NextResponse } from 'next/server';
import { removeFromCollection } from '@/lib/discogs';

export async function POST(request: Request) {
  try {
    const { folderId, releaseId, instanceId } = await request.json();
    
    if (!releaseId || !instanceId) {
      return NextResponse.json({ error: 'releaseId and instanceId required' }, { status: 400 });
    }
    
    await removeFromCollection(folderId || 1, releaseId, instanceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove from collection:', error);
    return NextResponse.json({ error: 'Failed to remove from collection' }, { status: 500 });
  }
}
