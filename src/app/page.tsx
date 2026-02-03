import { getCollection } from '@/lib/discogs';
import { CollectionGrid } from '@/components/CollectionGrid';
import { Disc3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CollectionPage() {
  const { items, pagination } = await getCollection(1, 100);

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
        <CollectionGrid items={items} />
      )}
    </div>
  );
}
