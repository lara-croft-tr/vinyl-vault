import { getCollection } from '@/lib/discogs';
import { CollectionGrid } from '@/components/CollectionGrid';
import { Disc3, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function CollectionPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const perPage = 50;
  
  const { items, pagination } = await getCollection(page, perPage);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Collection</h1>
        <p className="text-zinc-500">
          {pagination.items} records in your vinyl vault
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Disc3 className="w-16 h-16 mb-4 opacity-50" />
          <p>No records in your collection yet</p>
        </div>
      ) : (
        <>
          <CollectionGrid items={items} />
          
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              {page > 1 ? (
                <Link
                  href={`/?page=${page - 1}`}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </Link>
              ) : (
                <span className="flex items-center gap-2 bg-zinc-900 text-zinc-600 px-4 py-2 rounded-lg cursor-not-allowed">
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </span>
              )}
              
              <span className="text-zinc-400">
                Page {page} of {pagination.pages}
              </span>
              
              {page < pagination.pages ? (
                <Link
                  href={`/?page=${page + 1}`}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </Link>
              ) : (
                <span className="flex items-center gap-2 bg-zinc-900 text-zinc-600 px-4 py-2 rounded-lg cursor-not-allowed">
                  Next
                  <ChevronRight className="w-5 h-5" />
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
