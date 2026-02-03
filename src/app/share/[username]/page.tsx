import { PublicCollectionView } from '@/components/PublicCollectionView';
import { Disc3 } from 'lucide-react';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getAuthenticatedCollection(baseUrl: string, page = 1, perPage = 100) {
  // Use our authenticated API proxy
  const res = await fetch(
    `${baseUrl}/api/share/collection?page=${page}&perPage=${perPage}`,
    { cache: 'no-store' }
  );
  
  if (!res.ok) {
    return { items: [], pagination: { pages: 0, items: 0 }, username: '', error: true };
  }
  
  const data = await res.json();
  return {
    items: data.items || [],
    pagination: data.pagination || { pages: 0, items: 0 },
    username: data.username || '',
    error: false,
  };
}

export default async function PublicSharePage({ params }: PageProps) {
  const { username } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;
  
  // Fetch all pages (up to 500 records)
  const allItems = [];
  let page = 1;
  let hasMore = true;
  let totalItems = 0;
  let error = false;
  let actualUsername = username;
  
  while (hasMore && page <= 5) {
    const result = await getAuthenticatedCollection(baseUrl, page, 100);
    if (result.error) {
      error = true;
      break;
    }
    allItems.push(...result.items);
    totalItems = result.pagination.items;
    actualUsername = result.username || username;
    hasMore = page < result.pagination.pages;
    page++;
  }

  if (error || allItems.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Disc3 className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
          <h1 className="text-2xl font-bold mb-2">Collection Not Available</h1>
          <p className="text-zinc-500">
            Unable to load this collection. Please try again later.
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
            <h1 className="text-3xl font-bold">{actualUsername}'s Vinyl Collection</h1>
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
