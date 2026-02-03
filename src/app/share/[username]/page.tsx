import { PublicCollectionView } from '@/components/PublicCollectionView';
import { Disc3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getPublicCollection(username: string, page = 1, perPage = 100) {
  // Public Discogs API - no auth needed for public collections
  const res = await fetch(
    `https://api.discogs.com/users/${username}/collection/folders/0/releases?page=${page}&per_page=${perPage}&sort=added&sort_order=desc`,
    {
      headers: { 'User-Agent': 'VinylVault/1.0' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    }
  );
  
  if (!res.ok) {
    return { items: [], pagination: { pages: 0, items: 0 }, error: true };
  }
  
  const data = await res.json();
  return {
    items: data.releases || [],
    pagination: data.pagination || { pages: 0, items: 0 },
    error: false,
  };
}

export default async function PublicSharePage({ params }: PageProps) {
  const { username } = await params;
  
  // Fetch all pages (up to 500 records for public view)
  const allItems = [];
  let page = 1;
  let hasMore = true;
  let totalItems = 0;
  let error = false;
  
  while (hasMore && page <= 5) {
    const result = await getPublicCollection(username, page, 100);
    if (result.error) {
      error = true;
      break;
    }
    allItems.push(...result.items);
    totalItems = result.pagination.items;
    hasMore = page < result.pagination.pages;
    page++;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Disc3 className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
          <h1 className="text-2xl font-bold mb-2">Collection Not Found</h1>
          <p className="text-zinc-500">
            Either this user doesn't exist or their collection is private.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center gap-4 mb-8">
          <Disc3 className="w-12 h-12 text-purple-500" />
          <div>
            <h1 className="text-3xl font-bold">{username}'s Vinyl Collection</h1>
            <p className="text-zinc-500">{totalItems} records • Powered by VinylVault</p>
          </div>
        </div>

        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <Disc3 className="w-16 h-16 mb-4 opacity-50" />
            <p>No records in this collection yet</p>
          </div>
        ) : (
          <PublicCollectionView items={allItems} username={username} />
        )}
        
        <footer className="mt-12 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
          <p>
            View your own collection at{' '}
            <a href="/" className="text-purple-400 hover:text-purple-300">VinylVault</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
