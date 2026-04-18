import { getCollectionAll } from '@/lib/discogs';
import { CollectionGrid } from '@/components/CollectionGrid';
import { Disc3 } from 'lucide-react';

// Page-level ISR: cached for 5 minutes, re-rendered on demand after expiry.
// Mutations (add/remove) call revalidateTag('collection') to flush immediately.
export const revalidate = 300;

export default async function CollectionPage() {
  const { items, totalItems } = await getCollectionAll(100, 20);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Collection</h1>
        <p className="text-zinc-500">
          {totalItems} records in your vinyl vault
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
