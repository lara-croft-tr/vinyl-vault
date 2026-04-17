import { getWants } from '@/lib/discogs';
import { WantsView } from '@/components/WantsView';
import { Heart } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WantsPage() {
  const wants = await getWants();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Wants</h1>
        <p className="text-zinc-500">
          {wants.length} records you're hunting for
        </p>
      </div>

      {wants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Heart className="w-16 h-16 mb-4 opacity-50" />
          <p className="mb-4">You have no wants yet</p>
          <p className="text-sm">
            Search for records and add them to your wants to track prices
          </p>
        </div>
      ) : (
        <WantsView items={wants} />
      )}
    </div>
  );
}
