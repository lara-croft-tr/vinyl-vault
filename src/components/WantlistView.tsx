'use client';

import { useState } from 'react';
import Image from 'next/image';
import { WantlistItem } from '@/lib/discogs';
import { Calendar, Disc3, ExternalLink, Trash2, Loader2, Plus, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getArtistSortName } from '@/lib/sort-utils';
import { useArtistTypes } from '@/lib/use-artist-types';
import { useMasterYears } from '@/lib/use-master-years';
import { ReleaseDetailModal } from './ReleaseDetailModal';

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
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All Genres');
  const [decade, setDecade] = useState('All Decades');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState<'added' | 'artist' | 'artistDesc' | 'title' | 'year' | 'originalYear'>('artist');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [selectedItem, setSelectedItem] = useState<WantlistItem | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<WantlistItem | null>(null);
  const [adding, setAdding] = useState<number | null>(null);

  // Get unique artist IDs for type detection
  const uniqueArtists = Array.from(
    new Map(items.map(i => {
      const a = i.basic_information.artists[0];
      return [a?.id, { id: a?.id || 0, name: a?.name || '' }];
    })).values()
  ).filter(a => a.id > 0);
  const { artistTypes, loading: artistTypesLoading } = useArtistTypes(uniqueArtists);

  // Get original release years from master releases
  const masterItems = items.map(i => ({ masterId: i.basic_information.master_id || 0 }));
  const { masterYears, loading: masterYearsLoading } = useMasterYears(masterItems);

  // Helper to get original year (master year) or fall back to release year
  const getOriginalYear = (item: WantlistItem): number => {
    const masterId = item.basic_information.master_id;
    if (masterId && masterYears[masterId]) return masterYears[masterId];
    return item.basic_information.year || 0;
  };

  const filtered = items
    .filter((item) => {
      const q = search.toLowerCase();
      const info = item.basic_information;
      
      const matchesSearch = !q || 
        info.title.toLowerCase().includes(q) ||
        info.artists.some((a) => a.name.toLowerCase().includes(q)) ||
        info.labels.some((l) => l.name.toLowerCase().includes(q));
      
      const matchesGenre = genre === 'All Genres' || 
        info.genres?.some((g) => g.toLowerCase().includes(genre.toLowerCase()));
      
      let matchesDecade = decade === 'All Decades';
      if (!matchesDecade && info.year) {
        const startYear = parseInt(decade.replace('s', ''), 10);
        matchesDecade = info.year >= startYear && info.year < startYear + 10;
      }
      
      const matchesYear = !yearFilter || (info.year && info.year.toString() === yearFilter);
      
      return matchesSearch && matchesGenre && matchesDecade && matchesYear;
    })
    .sort((a, b) => {
      const infoA = a.basic_information;
      const infoB = b.basic_information;
      switch (sortBy) {
        case 'artist':
        case 'artistDesc': {
          const nameA = getArtistSortName(infoA.artists[0]?.name || '', artistTypes[infoA.artists[0]?.id] || 'band');
          const nameB = getArtistSortName(infoB.artists[0]?.name || '', artistTypes[infoB.artists[0]?.id] || 'band');
          const nameCompare = sortBy === 'artist' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
          if (nameCompare === 0) {
            return (getOriginalYear(a) || 9999) - (getOriginalYear(b) || 9999);
          }
          return nameCompare;
        }
        case 'title':
          return infoA.title.localeCompare(infoB.title);
        case 'year':
          return (infoB.year || 0) - (infoA.year || 0);
        case 'originalYear':
          return (getOriginalYear(b) || 0) - (getOriginalYear(a) || 0);
        default:
          return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
      }
    });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleRemove = async (item: WantlistItem) => {
    const releaseId = item.basic_information.id;
    setRemoving(releaseId);
    try {
      await fetch('/api/wantlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId }),
      });
      setItems(prev => prev.filter((i) => i.basic_information.id !== releaseId));
      setSelectedItem(null);
      setConfirmRemove(null);
    } catch (error) {
      console.error('Failed to remove:', error);
    }
    setRemoving(null);
  };

  const handleAddToCollection = async (releaseId: number) => {
    setAdding(releaseId);
    try {
      await fetch('/api/collection/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId }),
      });
    } catch (error) {
      console.error('Failed to add to collection:', error);
    }
    setAdding(null);
  };

  return (
    <div>
      {/* Remove Confirmation Modal */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-red-500/20 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">Remove from Wantlist?</h3>
                <p className="text-zinc-400 text-sm">
                  Are you sure you want to remove this record?
                </p>
              </div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-4 mb-4 flex gap-4">
              <div className="w-16 h-16 relative rounded overflow-hidden bg-zinc-700 flex-shrink-0">
                {confirmRemove.basic_information.cover_image ? (
                  <Image
                    src={confirmRemove.basic_information.thumb || confirmRemove.basic_information.cover_image}
                    alt={confirmRemove.basic_information.title}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Disc3 className="w-8 h-8 text-zinc-600" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-white">{confirmRemove.basic_information.title}</p>
                <p className="text-zinc-400 text-sm">
                  {confirmRemove.basic_information.artists?.[0]?.name || 'Unknown Artist'}
                </p>
                <p className="text-zinc-500 text-xs mt-1">
                  {confirmRemove.basic_information.year || 'Unknown year'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(confirmRemove)}
                disabled={removing !== null}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {removing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <ReleaseDetailModal
          releaseId={selectedItem.basic_information.id}
          onClose={() => setSelectedItem(null)}
          basicInfo={{
            title: selectedItem.basic_information.title,
            artist: selectedItem.basic_information.artists[0]?.name || 'Unknown Artist',
            cover_image: selectedItem.basic_information.cover_image,
            year: selectedItem.basic_information.year,
          }}
        />
      )}

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search your wantlist..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="flex-1 min-w-[200px] bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
        />
        <select
          value={genre}
          onChange={(e) => handleFilterChange(setGenre, e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
        >
          {GENRES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={decade}
          onChange={(e) => handleFilterChange(setDecade, e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
        >
          {DECADES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Year (e.g. 1977)"
          value={yearFilter}
          onChange={(e) => { setYearFilter(e.target.value.replace(/\D/g, '').slice(0, 4)); setCurrentPage(1); }}
          className="w-[140px] bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
        >
          <option value="added">Recently Added</option>
          <option value="artist">Artist A-Z (by surname)</option>
          <option value="artistDesc">Artist Z-A (by surname)</option>
          <option value="title">Title A-Z</option>
          <option value="year">Year (Newest)</option>
          <option value="originalYear">Original Release Year</option>
        </select>
      </div>

      <p className="text-zinc-500 text-sm mb-4">
        Showing {paginatedItems.length} of {filtered.length} records
        {filtered.length !== items.length && ` (${items.length} total)`}
        {artistTypesLoading && (
          <span className="inline-flex items-center gap-1 ml-2 text-purple-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading artist sort data...
          </span>
        )}
        {masterYearsLoading && (
          <span className="inline-flex items-center gap-1 ml-2 text-purple-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading original release years...
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {paginatedItems.map((item) => (
          <WantlistCard
            key={item.id}
            item={item}
            onOpenDetails={() => setSelectedItem(item)}
            onRemove={() => setConfirmRemove(item)}
            onAddToCollection={() => handleAddToCollection(item.basic_information.id)}
            isRemoving={removing === item.basic_information.id}
            isAdding={adding === item.basic_information.id}
          />
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentPage === 1
                ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>
          
          <span className="text-zinc-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentPage === totalPages
                ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white'
            }`}
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          No records match your search
        </div>
      )}
    </div>
  );
}

function WantlistCard({ item, onOpenDetails, onRemove, onAddToCollection, isRemoving, isAdding }: {
  item: WantlistItem;
  onOpenDetails: () => void;
  onRemove: () => void;
  onAddToCollection: () => void;
  isRemoving: boolean;
  isAdding: boolean;
}) {
  const info = item.basic_information;
  const artist = info.artists[0]?.name || 'Unknown Artist';
  const format = info.formats[0];
  const formatDesc = format
    ? `${format.text ? format.text + ' ' : ''}${format.descriptions?.join(', ') || format.name}`
    : 'Vinyl';

  return (
    <div className="group bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
      <div 
        className="aspect-square relative bg-zinc-800 cursor-pointer"
        onClick={onOpenDetails}
      >
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
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1 rounded-full">
            View Details
          </span>
        </div>
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
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-zinc-500 truncate flex-1" title={formatDesc}>
            {formatDesc}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={onAddToCollection}
              disabled={isAdding}
              className="text-green-500 hover:text-green-400 p-1 transition-colors"
              title="Add to Collection"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
            <a
              href={`https://www.discogs.com/release/${info.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-zinc-500 hover:text-purple-400 p-1 transition-colors"
              title="View on Discogs"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onRemove}
              disabled={isRemoving}
              className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
              title="Remove from Wantlist"
            >
              {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
