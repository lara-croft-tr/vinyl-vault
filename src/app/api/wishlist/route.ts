import { NextResponse } from 'next/server';
import { getWishlist, addToWishlist, removeFromWishlist } from '@/lib/discogs';

export async function GET() {
  try {
    const data = await getWishlist();
    return NextResponse.json({ wants: data });
  } catch (error) {
    console.error('Wishlist fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { releaseId } = await request.json();
    await addToWishlist(releaseId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { releaseId } = await request.json();
    await removeFromWishlist(releaseId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
  }
}
