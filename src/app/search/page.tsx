'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Search, Disc3, Heart, Plus, Loader2, ExternalLink, Library, AlertTriangle, X } from 'lucide-react';

interface SearchResult {
  id: number;
  master_id?: number;
  title: string;
  thumb: string;
  cover_image: string;
  year?: string;
  format?: string[];
  label?: string[];
  genre?: string[];
  style?: string[];
  country?: string;
}

interface Duplicate {
  id: number;
  title: string;
  artist: string;
  year: number;
  format: string;
}

interface DuplicateWarning {
  releaseId: number;
  title: string;
  artist: string;
  duplicates: Duplicate[];
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
  'Non-Music',
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

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [decade, setDecade] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingWant, setAddingWant] = useState<number | null>(null);
  const [addingCollection, setAddingCollection] = useState<number | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState<number | null>(null);
  const [addedToWant, setAddedToWant] = useState<Set<number>>(new Set());
  const [addedToCollection, setAddedToCollection] = useState<Set<number>>(new Set());
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      if (genre && genre !== 'All Genres') params.append('genre', genre);
      if (decade && decade !== 'All Decades') params.append('decade', decade);
      
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setLoading(false);
  };

  const handleAddToWantlist = async (releaseId: number) => {
    setAddingWant(releaseId);
    try {
      await fetch('/api/wantlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId }),
      });
      setAddedToWant(new Set([...addedToWant, releaseId]));
    } catch (error) {
      console.error('Failed to add:', error);
    }
    setAddingWant(null);
  };

  const extractArtistAndTitle = (title: string) => {
    // Discogs search results have format "Artist - Title"
    const parts = title.split(' - ');
    if (parts.length >= 2) {
      return { artist: parts[0], title: parts.slice(1).join(' - ') };
    }
    return { artist: '', title };
  };

  const handleAddToCollection = async (releaseId: number, skipCheck = false) => {
    const result = results.find(r => r.id === releaseId);
    if (!result) return;

    const { artist, title } = extractArtistAndTitle(result.title);

    // Check for duplicates first (unless skipping)
    if (!skipCheck && artist) {
      setCheckingDuplicate(releaseId);
      try {
        const res = await fetch('/api/collection/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artist, title }),
        });
        const data = await res.json();
        
        if (data.hasDuplicate) {
          setCheckingDuplicate(null);
          setDuplicateWarning({
            releaseId,
            title,
            artist,
            duplicates: data.duplicates,
          });
          return;
        }
      } catch (error) {
        console.error('Duplicate check failed:', error);
      }
      setCheckingDuplicate(null);
    }

    // Add to collection
    setAddingCollection(releaseId);
    try {
      await fetch('/api/collection/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId }),
      });
      setAddedToCollection(new Set([...addedToCollection, releaseId]));
    } catch (error) {
      console.error('Failed to add:', error);
    }
    setAddingCollection(null);
    setDuplicateWarning(null);
  };

  const handleConfirmAdd = () => {
    if (duplicateWarning) {
      handleAddToCollection(duplicateWarning.releaseId, true);
    }
  };

  return (
    <div>
      {/* Duplicate Warning Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-yellow-500/20 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">Possible Duplicate</h3>
                <p className="text-zinc-400 text-sm">
                  You already have this album in your collection:
                </p>
              </div>
              <button
                onClick={() => setDuplicateWarning(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-800 rounded-lg p-4 mb-4">
              <p className="font-medium text-white">{duplicateWarning.artist}</p>
              <p className="text-zinc-400">{duplicateWarning.title}</p>
              <div className="mt-3 space-y-2">
                {duplicateWarning.duplicates.map((dup) => (
                  <div key={dup.id} className="text-sm text-zinc-500 flex items-center gap-2">
                    <Disc3 className="w-4 h-4" />
                    <span>{dup.format} • {dup.year || 'Unknown year'}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-zinc-400 text-sm mb-4">
              Do you still want to add another copy?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDuplicateWarning(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdd}
                disabled={addingCollection !== null}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {addingCollection ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search Discogs</h1>
        <p className="text-zinc-500">
          Find vinyl records to add to your collection or wantlist
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artist or album..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-12 pr-4 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={decade}
            onChange={(e) => setDecade(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            {DECADES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white py-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          Search
        </button>
      </form>

      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {results.map((result) => {
            const isCheckingOrAdding = checkingDuplicate === result.id || addingCollection === result.id;
            
            return (
              <div
                key={result.id}
                className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors"
              >
                {/* Album Art */}
                <div className="aspect-square relative bg-zinc-800">
                  {result.thumb ? (
                    <Image
                      src={result.cover_image || result.thumb}
                      alt={result.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="w-12 h-12 text-zinc-700" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 leading-tight mb-2">{result.title}</h3>
                  <div className="flex flex-wrap gap-1 text-xs mb-3">
                    {result.year && (
                      <span className="bg-zinc-800 px-2 py-0.5 rounded">{result.year}</span>
                    )}
                    {result.format?.slice(0, 1).map((f, i) => (
                      <span key={i} className="bg-zinc-800 px-2 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex gap-1">
                    {addedToCollection.has(result.id) ? (
                      <span className="flex-1 inline-flex items-center justify-center text-green-400 py-1.5 text-xs">
                        <Library className="w-3 h-3 mr-1" />
                        Added
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddToCollection(result.id)}
                        disabled={isCheckingOrAdding}
                        className="flex-1 inline-flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white py-1.5 rounded text-xs transition-colors"
                      >
                        {isCheckingOrAdding ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {addedToWant.has(result.id) ? (
                      <span className="flex-1 inline-flex items-center justify-center text-purple-400 py-1.5 text-xs">
                        <Heart className="w-3 h-3 fill-current" />
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddToWantlist(result.id)}
                        disabled={addingWant === result.id}
                        className="flex-1 inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white py-1.5 rounded text-xs transition-colors"
                      >
                        {addingWant === result.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Heart className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    <a
                      href={`https://www.discogs.com/release/${result.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-zinc-500 hover:text-white py-1.5 px-2 text-xs transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div className="text-center py-12 text-zinc-500">
          No results found. Try a different search term.
        </div>
      )}

      {!query && !loading && results.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Search for vinyl records by artist, album, or label</p>
        </div>
      )}
    </div>
  );
}
