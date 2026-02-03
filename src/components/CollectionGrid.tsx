'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CollectionItem, formatCondition } from '@/lib/discogs';
import { Calendar, Tag, Disc3 } from 'lucide-react';

interface Props {
  items: CollectionItem[];
}

export function CollectionGrid({ items }: Props) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'added' | 'artist' | 'title' | 'year'>('added');

  const filtered = items
    .filter((item) => {
      const q = search.toLowerCase();
      const info = item.basic_information;
      return (
        info.title.toLowerCase().includes(q) ||
        info.artists.some((a) => a.name.toLowerCase().includes(q)) ||
        info.labels.some((l) => l.name.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const infoA = a.basic_information;
      const infoB = b.basic_information;
      switch (sortBy) {
        case 'artist':
          return infoA.artists[0]?.name.localeCompare(infoB.artists[0]?.name || '');
        case 'title':
          return infoA.title.localeCompare(infoB.title);
        case 'year':
          return (infoB.year || 0) - (infoA.year || 0);
        default:
          return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
      }
    });

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search your collection..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
        >
          <option value="added">Recently Added</option>
          <option value="artist">Artist A-Z</option>
          <option value="title">Title A-Z</option>
          <option value="year">Year (Newest)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map((item) => (
          <RecordCard key={item.instance_id} item={item} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          No records match your search
        </div>
      )}
    </div>
  );
}

function RecordCard({ item }: { item: CollectionItem }) {
  const info = item.basic_information;
  const artist = info.artists[0]?.name || 'Unknown Artist';
  const format = info.formats[0];
  const formatDesc = format
    ? `${format.text ? format.text + ' ' : ''}${format.descriptions?.join(', ') || format.name}`
    : 'Vinyl';
  
  const mediaCondition = item.notes?.find((n) => n.field_id === 1)?.value;
  const sleeveCondition = item.notes?.find((n) => n.field_id === 2)?.value;

  return (
    <div className="group bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
      <div className="aspect-square relative bg-zinc-800">
        {info.cover_image ? (
          <Image
            src={info.cover_image}
            alt={info.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Disc3 className="w-16 h-16 text-zinc-700" />
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate" title={info.title}>
          {info.title}
        </h3>
        <p className="text-zinc-400 text-sm truncate" title={artist}>
          {artist}
        </p>
        
        <div className="mt-3 flex flex-wrap gap-2">
          {info.year && (
            <span className="inline-flex items-center gap-1 text-xs bg-zinc-800 px-2 py-1 rounded">
              <Calendar className="w-3 h-3" />
              {info.year}
            </span>
          )}
          {mediaCondition && (
            <span className="inline-flex items-center gap-1 text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
              {formatCondition(mediaCondition)}
            </span>
          )}
        </div>
        
        <p className="text-xs text-zinc-500 mt-2 truncate" title={formatDesc}>
          {formatDesc}
        </p>
      </div>
    </div>
  );
}
