'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { WantlistItem } from '@/lib/discogs';
import { Disc3, ShoppingBag, Trash2, ExternalLink } from 'lucide-react';

interface Props {
  items: WantlistItem[];
}

const GENRES = [
  'All Genres',
  'Rock',
  'Electronic',
  'Pop',
  'Jazz',
  'Funk / Soul',
  'Classical',
  'Hip Hop',
  'Reggae',
  'Latin',
  'Blues',
  'Folk, World, & Country',
  'Stage & Screen',
];

const DECADES = [
  'All Decades',
  '2020s',
  '2010s',
  '2000s',
  '1990s',
  '1980s',
  '1970s',
  '1960s',
  '1950s',
];

export function WantlistView({ items: initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [removing, setRemoving] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All Genres');
  const [decade, setDecade] = useState('All Decades');
  const [sortBy, setSortBy] = useState<'added' | 'artist' | 'title' | 'year'>('added');

  const handleRemove = async (releaseId: number) => {
    setRemoving(releaseId);
    try {
      await fetch('/api/wantlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId }),
      });
      setItems(items.filter((i) => i.basic_information.id !== releaseId));
    } catch (error) {
      console.error('Failed to remove:', error);
    }
    setRemoving(null);
  };

  const filtered = items
    .filter((item) => {
      const q = search.toLowerCase();
      const info = item.basic_information;
      
      // Text search
      const matchesSearch = !q || 
        info.title.toLowerCase().includes(q) ||
        info.artists.some((a) => a.name.toLowerCase().includes(q)) ||
        info.labels.some((l) => l.name.toLowerCase().includes(q));
      
      // Genre filter
      const matchesGenre = genre === 'All Genres' || 
        info.genres?.some((g) => g.toLowerCase().includes(genre.toLowerCase()));
      
      // Decade filter
      let matchesDecade = decade === 'All Decades';
      if (!matchesDecade && info.year) {
        const startYear = parseInt(decade.replace('s', ''), 10);
        matchesDecade = info.year >= startYear && info.year < startYear + 10;
      }
      
      return matchesSearch && matchesGenre && matchesDecade;
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
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search wantlist..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
        />
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
        >
          {GENRES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={decade}
          onChange={(e) => setDecade(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
        >
          {DECADES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
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

      <div className="space-y-4">
        {filtered.map((item) => {
          const info = item.basic_information;
          const artist = info.artists[0]?.name || 'Unknown Artist';
          const isRemoving = removing === info.id;

          return (
            <div
              key={item.id}
              className={`flex gap-4 bg-zinc-900 rounded-lg border border-zinc-800 p-4 transition-opacity ${
                isRemoving ? 'opacity-50' : ''
              }`}
            >
              <div className="w-24 h-24 relative rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                {info.cover_image ? (
                  <Image
                    src={info.cover_image}
                    alt={info.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Disc3 className="w-8 h-8 text-zinc-700" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{info.title}</h3>
                <p className="text-zinc-400 text-sm truncate">{artist}</p>
                {info.year && (
                  <p className="text-zinc-500 text-xs mt-1">{info.year}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {info.formats?.[0] && (
                    <span className="text-xs bg-zinc-800 px-2 py-1 rounded">
                      {info.formats[0].descriptions?.join(', ') || info.formats[0].name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  href={`/marketplace?releaseId=${info.id}`}
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Find Copies
                </Link>
                <a
                  href={`https://www.discogs.com/release/${info.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Discogs
                </a>
                <button
                  onClick={() => handleRemove(info.id)}
                  disabled={isRemoving}
                  className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No records match your filters
          </div>
        )}
      </div>
    </div>
  );
}
