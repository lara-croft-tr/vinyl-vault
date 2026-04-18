import { getCollectionAll } from '@/lib/discogs';
import { StatsView } from '@/components/StatsView';
import { BarChart3 } from 'lucide-react';

export const revalidate = 300;

export default async function StatsPage() {
  const { items } = await getCollectionAll(100, 20);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Collection Stats</h1>
        <p className="text-zinc-500">
          Analytics and insights about your vinyl collection
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <BarChart3 className="w-16 h-16 mb-4 opacity-50" />
          <p>No records to analyze yet</p>
        </div>
      ) : (
        <StatsView items={items} />
      )}
    </div>
  );
}
