'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Search, Disc3, Heart, Plus, Loader2, ExternalLink, Library } from 'lucide-react';

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

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingWant, setAddingWant] = useState<number | null>(null);
  const [addingCollection, setAddingCollection] = useState<number | null>(null);
  const [addedToWant, setAddedToWant] = useState<Set<number>>(new Set());
  const [addedToCollection, setAddedToCollection] = useState<Set<number>>(new Set());

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
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

  const handleAddToCollection = async (releaseId: number) => {
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
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search Discogs</h1>
        <p className="text-zinc-500">
          Find vinyl records to add to your wantlist
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for artist, album, or label..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-12 pr-4 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-8 py-4 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Search
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => {
            return (
              <div
                key={result.id}
                className="flex gap-4 bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                  {result.thumb ? (
                    <Image
                      src={result.thumb}
                      alt={result.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="w-8 h-8 text-zinc-700" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{result.title}</h3>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    {result.year && (
                      <span className="bg-zinc-800 px-2 py-1 rounded">{result.year}</span>
                    )}
                    {result.format?.slice(0, 2).map((f, i) => (
                      <span key={i} className="bg-zinc-800 px-2 py-1 rounded">{f}</span>
                    ))}
                    {result.country && (
                      <span className="bg-zinc-800 px-2 py-1 rounded">{result.country}</span>
                    )}
                  </div>
                  {result.label && result.label.length > 0 && (
                    <p className="text-zinc-500 text-xs mt-2 truncate">
                      {result.label.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {addedToCollection.has(result.id) ? (
                    <span className="inline-flex items-center gap-2 text-green-400 px-4 py-2 text-sm">
                      <Library className="w-4 h-4" />
                      In Collection
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAddToCollection(result.id)}
                      disabled={addingCollection === result.id}
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      {addingCollection === result.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Collection
                    </button>
                  )}
                  {addedToWant.has(result.id) ? (
                    <span className="inline-flex items-center gap-2 text-purple-400 px-4 py-2 text-sm">
                      <Heart className="w-4 h-4 fill-current" />
                      In Wantlist
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAddToWantlist(result.id)}
                      disabled={addingWant === result.id}
                      className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      {addingWant === result.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Heart className="w-4 h-4" />
                      )}
                      Want
                    </button>
                  )}
                  <a
                    href={`https://www.discogs.com/release/${result.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white px-4 py-2 text-sm transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </a>
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
