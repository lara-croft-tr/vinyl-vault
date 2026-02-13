'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CollectionItem, formatCondition } from '@/lib/discogs';
import { Calendar, Disc3, ExternalLink, Trash2, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Guitar } from 'lucide-react';
import { getArtistSortName } from '@/lib/sort-utils';
import { useArtistTypes } from '@/lib/use-artist-types';
import { useMasterYears } from '@/lib/use-master-years';
import { useReleaseExtras, getCountryFlag, getCountryShort, ReleaseExtras } from '@/lib/use-release-extras';
import { ReleaseDetailModal } from './ReleaseDetailModal';

interface Props {
  items: CollectionItem[];
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

export function CollectionGrid({ items: initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All Genres');
  const [decade, setDecade] = useState('All Decades');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState<'added' | 'artist' | 'artistDesc' | 'title' | 'year' | 'originalYear'>('artist');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<CollectionItem | null>(null);

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

  // Get release extras (country + value)
  const releaseIds = items.map(i => i.basic_information.id);
  const { extras: releaseExtras, loading: extrasLoading } = useReleaseExtras(releaseIds);

  // Helper to get original year (master year) or fall back to release year
  const getOriginalYear = (item: CollectionItem): number => {
    const masterId = item.basic_information.master_id;
    if (masterId && masterYears[masterId]) return masterYears[masterId];
    return item.basic_information.year || 0;
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
      
      // Year filter
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
          // Secondary sort: ascending original release year within same artist
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

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleOpenDetails = (item: CollectionItem) => {
    setSelectedItem(item);
  };

  const handleRemove = async (item: CollectionItem) => {
    setRemoving(item.instance_id);
    try {
      await fetch('/api/collection/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          releaseId: item.basic_information.id,
          instanceId: item.instance_id,
          folderId: 1,
        }),
      });
      setItems(items.filter(i => i.instance_id !== item.instance_id));
      setSelectedItem(null);
      setConfirmRemove(null);
    } catch (error) {
      console.error('Failed to remove:', error);
    }
    setRemoving(null);
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
                <h3 className="text-lg font-semibold text-white mb-1">Remove from Collection?</h3>
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
          showRemoveButton
          onRemove={() => setConfirmRemove(selectedItem)}
        />
      )}

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search your collection..."
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
        {extrasLoading && (
          <span className="inline-flex items-center gap-1 ml-2 text-purple-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading release details...
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {paginatedItems.map((item) => (
          <RecordCard 
            key={item.instance_id} 
            item={item} 
            onOpenDetails={() => handleOpenDetails(item)}
            extras={releaseExtras[item.basic_information.id]}
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

function GenreStyleTags({ genres, styles }: { genres?: string[]; styles?: string[] }) {
  const maxGenres = 2;
  const maxStyles = 2;
  const shownGenres = genres?.slice(0, maxGenres) || [];
  const shownStyles = styles?.slice(0, maxStyles) || [];
  const extraCount = ((genres?.length || 0) - maxGenres) + ((styles?.length || 0) - maxStyles);
  const hasExtra = extraCount > 0;

  if (shownGenres.length === 0 && shownStyles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {shownGenres.map((g) => (
        <span key={g} className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full leading-tight">
          {g}
        </span>
      ))}
      {shownStyles.map((s) => (
        <span key={s} className="text-[10px] bg-zinc-700/60 text-zinc-400 px-1.5 py-0.5 rounded-full leading-tight">
          {s}
        </span>
      ))}
      {hasExtra && (
        <span className="text-[10px] text-zinc-500 px-1 py-0.5 leading-tight">
          +{extraCount}
        </span>
      )}
    </div>
  );
}

function RecordCard({ item, onOpenDetails, extras }: { item: CollectionItem; onOpenDetails: () => void; extras?: ReleaseExtras }) {
  const info = item.basic_information;
  const artist = info.artists[0]?.name || 'Unknown Artist';
  const format = info.formats[0];
  const formatDesc = format
    ? `${format.text ? format.text + ' ' : ''}${format.descriptions?.join(', ') || format.name}`
    : 'Vinyl';
  
  const mediaCondition = item.notes?.find((n) => n.field_id === 1)?.value;

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
        {extras?.country && (
          <p className="text-zinc-500 text-xs mt-0.5">
            {getCountryFlag(extras.country)} {getCountryShort(extras.country)}
          </p>
        )}

        <GenreStyleTags genres={info.genres} styles={info.styles} />
        
        <div className="mt-2 flex flex-wrap gap-2">
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
        
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-zinc-500 truncate flex-1" title={formatDesc}>
            {formatDesc}
          </p>
          <div className="flex items-center gap-1">
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
          </div>
        </div>

        {extras?.lowestPrice != null && (
          <p className="text-green-500/80 text-xs mt-1.5 font-medium">
            ${extras.lowestPrice.toFixed(2)} est.
          </p>
        )}
      </div>
    </div>
  );
}
