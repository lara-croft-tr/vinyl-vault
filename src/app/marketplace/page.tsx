'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ShoppingBag, Search, Disc3, ExternalLink, DollarSign, MapPin, Star, Loader2 } from 'lucide-react';

interface Listing {
  id: number;
  price: { value: number; currency: string };
  condition: string;
  sleeve_condition: string;
  ships_from: string;
  seller: { username: string; rating: number };
  release: { id: number; description: string; thumbnail: string };
  uri?: string;
}

interface Stats {
  lowest_price?: { value: number; currency: string };
  num_for_sale: number;
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const initialReleaseId = searchParams.get('releaseId');

  const [releaseId, setReleaseId] = useState(initialReleaseId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [country, setCountry] = useState('US');

  useEffect(() => {
    if (initialReleaseId) {
      fetchListings(initialReleaseId);
    }
  }, [initialReleaseId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setSearchLoading(false);
  };

  const selectRelease = async (release: any) => {
    setSelectedRelease(release);
    setReleaseId(release.id.toString());
    setSearchResults([]);
    setSearchQuery('');
    await fetchListings(release.id.toString());
  };

  const fetchListings = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace?releaseId=${id}&country=${country}`);
      const data = await res.json();
      setListings(data.listings || []);
      setStats(data.stats || null);
      
      // If we don't have release info, fetch it
      if (!selectedRelease) {
        const releaseRes = await fetch(`https://api.discogs.com/releases/${id}`);
        const releaseData = await releaseRes.json();
        setSelectedRelease({
          id: releaseData.id,
          title: releaseData.title,
          thumb: releaseData.thumb,
          year: releaseData.year,
          artists_sort: releaseData.artists_sort,
        });
      }
    } catch (error) {
      console.error('Marketplace fetch failed:', error);
    }
    setLoading(false);
  };

  const formatCondition = (condition: string) => {
    const map: Record<string, { label: string; color: string }> = {
      'Mint (M)': { label: 'M', color: 'bg-green-500' },
      'Near Mint (NM or M-)': { label: 'NM', color: 'bg-green-400' },
      'Very Good Plus (VG+)': { label: 'VG+', color: 'bg-yellow-500' },
      'Very Good (VG)': { label: 'VG', color: 'bg-yellow-600' },
      'Good Plus (G+)': { label: 'G+', color: 'bg-orange-500' },
      'Good (G)': { label: 'G', color: 'bg-orange-600' },
      'Fair (F)': { label: 'F', color: 'bg-red-500' },
      'Poor (P)': { label: 'P', color: 'bg-red-600' },
    };
    return map[condition] || { label: condition, color: 'bg-zinc-600' };
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
        <p className="text-zinc-500">
          Find vinyl records from US sellers
        </p>
      </div>

      {/* Search for releases */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for an album to find copies for sale..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-12 pr-4 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-purple-500"
          >
            <option value="US">🇺🇸 USA</option>
            <option value="UK">🇬🇧 UK</option>
            <option value="DE">🇩🇪 Germany</option>
            <option value="JP">🇯🇵 Japan</option>
          </select>
          <button
            type="submit"
            disabled={searchLoading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-8 py-4 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {searchLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Search
          </button>
        </div>
      </form>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="mb-6 bg-zinc-900 rounded-lg border border-zinc-800 p-4">
          <h3 className="text-sm text-zinc-400 mb-3">Select a release:</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => selectRelease(result)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="w-12 h-12 relative rounded bg-zinc-700 flex-shrink-0 overflow-hidden">
                  {result.thumb ? (
                    <Image src={result.thumb} alt="" fill className="object-cover" sizes="48px" />
                  ) : (
                    <Disc3 className="w-6 h-6 m-auto text-zinc-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{result.title}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {result.year} • {result.format?.join(', ')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected release & listings */}
      {selectedRelease && (
        <div className="mb-6 bg-zinc-900 rounded-lg border border-zinc-800 p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 relative rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden">
              {selectedRelease.thumb ? (
                <Image src={selectedRelease.thumb} alt="" fill className="object-cover" sizes="64px" />
              ) : (
                <Disc3 className="w-8 h-8 m-auto text-zinc-700" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{selectedRelease.title}</h2>
              <p className="text-zinc-400">{selectedRelease.artists_sort || ''}</p>
            </div>
          </div>

          {stats && (
            <div className="flex gap-4 mb-4">
              <div className="bg-zinc-800 rounded-lg px-4 py-2">
                <p className="text-xs text-zinc-500">Lowest Price</p>
                <p className="text-lg font-bold text-green-400">
                  ${stats.lowest_price?.value?.toFixed(2) || 'N/A'}
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg px-4 py-2">
                <p className="text-xs text-zinc-500">For Sale</p>
                <p className="text-lg font-bold">{stats.num_for_sale}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      )}

      {/* Listings */}
      {!loading && listings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold mb-4">
            {listings.length} listings from {country === 'US' ? 'USA' : country}
          </h3>
          {listings.map((listing) => {
            const media = formatCondition(listing.condition);
            const sleeve = formatCondition(listing.sleeve_condition);

            return (
              <div
                key={listing.id}
                className="flex items-center gap-4 bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`${media.color} text-white text-xs font-bold px-2 py-1 rounded`}>
                      {media.label}
                    </span>
                    <span className="text-zinc-500 text-xs">
                      Sleeve: {sleeve.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {listing.ships_from}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {listing.seller.username} ({listing.seller.rating}%)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">
                    ${listing.price.value.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-500">{listing.price.currency}</p>
                </div>

                <a
                  href={`https://www.discogs.com/sell/item/${listing.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Buy
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* No listings */}
      {!loading && selectedRelease && listings.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No listings found from {country === 'US' ? 'USA' : country}</p>
          <p className="text-sm mt-2">Try a different country filter</p>
        </div>
      )}

      {/* Empty state */}
      {!selectedRelease && !loading && searchResults.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Search for a record to find copies for sale</p>
        </div>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
