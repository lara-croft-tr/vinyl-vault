import { NextResponse } from 'next/server';
import { addToCollection } from '@/lib/discogs';

export async function POST(request: Request) {
  try {
    const { releaseId } = await request.json();
    
    if (!releaseId) {
      return NextResponse.json({ error: 'releaseId required' }, { status: 400 });
    }
    
    const result = await addToCollection(releaseId);
    return NextResponse.json({ success: true, instance_id: result.instance_id });
  } catch (error) {
    console.error('Failed to add to collection:', error);
    return NextResponse.json({ error: 'Failed to add to collection' }, { status: 500 });
  }
}
