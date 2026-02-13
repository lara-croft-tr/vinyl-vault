'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CollectionItem } from '@/lib/discogs';
import { Calendar, Disc3, X, ExternalLink, Music, ChevronLeft, ChevronRight, Loader2, Search, ScrollText } from 'lucide-react';
import { getArtistSortName } from '@/lib/sort-utils';
import { useArtistTypes } from '@/lib/use-artist-types';

interface Props {
  items: CollectionItem[];
  username: string;
}

interface ReleaseDetails {
  id: number;
  title: string;
  artists: { name: string }[];
  year: number;
  images?: { type: string; uri: string; uri150: string }[];
  tracklist?: { position: string; title: string; duration: string }[];
  labels?: { name: string; catno: string }[];
  formats?: { name: string; qty: string; descriptions?: string[] }[];
  genres?: string[];
  styles?: string[];
}

const GENRES = [
  'All Genres', 'Rock', 'Electronic', 'Pop', 'Jazz', 'Funk / Soul',
  'Classical', 'Hip Hop', 'Reggae', 'Latin', 'Blues', 'Folk, World, & Country',
];

const DECADES = [
  'All Decades', '2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s', '1950s',
];

export function PublicCollectionView({ items, username }: Props) {
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All Genres');
  const [decade, setDecade] = useState('All Decades');
  const [sortBy, setSortBy] = useState<'added' | 'artist' | 'title' | 'year'>('artist');
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [releaseDetails, setReleaseDetails] = useState<ReleaseDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lyricsModal, setLyricsModal] = useState<{ artist: string; title: string } | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsFallback, setLyricsFallback] = useState<{ searchUrl?: string; geniusUrl?: string } | null>(null);

  const uniqueArtists = Array.from(
    new Map(items.map(i => {
      const a = i.basic_information.artists[0];
      return [a?.id, { id: a?.id || 0, name: a?.name || '' }];
    })).values()
  ).filter(a => a.id > 0);
  const { artistTypes, loading: artistTypesLoading } = useArtistTypes(uniqueArtists);

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
      
      return matchesSearch && matchesGenre && matchesDecade;
    })
    .sort((a, b) => {
      const infoA = a.basic_information;
      const infoB = b.basic_information;
      switch (sortBy) {
        case 'artist':
          return getArtistSortName(infoA.artists[0]?.name || '', artistTypes[infoA.artists[0]?.id] || 'band').localeCompare(getArtistSortName(infoB.artists[0]?.name || '', artistTypes[infoB.artists[0]?.id] || 'band'));
        case 'title':
          return infoA.title.localeCompare(infoB.title);
        case 'year':
          return (infoB.year || 0) - (infoA.year || 0);
        default:
          return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
      }
    });

  const handleOpenDetails = async (item: CollectionItem) => {
    setSelectedItem(item);
    setReleaseDetails(null);
    setCurrentImageIndex(0);
    setLoadingDetails(true);
    
    try {
      // Public API call
      const res = await fetch(`https://api.discogs.com/releases/${item.basic_information.id}`, {
        headers: { 'User-Agent': 'VinylVault/1.0' },
      });
      const data = await res.json();
      setReleaseDetails(data);
    } catch (error) {
      console.error('Failed to load details:', error);
    }
    setLoadingDetails(false);
  };

  const images = releaseDetails?.images || [];
  const nextImage = () => setCurrentImageIndex((i) => (i + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((i) => (i - 1 + images.length) % images.length);

  const fetchLyrics = async (artist: string, title: string) => {
    setLyricsModal({ artist, title });
    setLyrics(null);
    setLyricsFallback(null);
    setLyricsLoading(true);
    
    try {
      const res = await fetch(`/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`);
      const data = await res.json();
      
      if (data.lyrics) {
        setLyrics(data.lyrics);
      } else {
        setLyricsFallback({ searchUrl: data.searchUrl, geniusUrl: data.geniusUrl });
      }
    } catch (error) {
      console.error('Failed to fetch lyrics:', error);
      setLyricsFallback({ searchUrl: `https://www.google.com/search?q=${encodeURIComponent(`${artist} ${title} lyrics`)}` });
    }
    setLyricsLoading(false);
  };

  return (
    <div>
      {/* Lightbox for full-size image */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[70]"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10"
          >
            <X className="w-8 h-8" />
          </button>
          
          {/* Lightbox carousel arrows */}
          {releaseDetails?.images && releaseDetails.images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const imgs = releaseDetails.images!;
                  const newIndex = (currentImageIndex - 1 + imgs.length) % imgs.length;
                  setCurrentImageIndex(newIndex);
                  setLightboxImage(imgs[newIndex]?.uri || imgs[newIndex]?.uri150);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const imgs = releaseDetails.images!;
                  const newIndex = (currentImageIndex + 1) % imgs.length;
                  setCurrentImageIndex(newIndex);
                  setLightboxImage(imgs[newIndex]?.uri || imgs[newIndex]?.uri150);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-4 py-2 rounded-full z-10">
                {currentImageIndex + 1} / {releaseDetails.images.length}
              </div>
            </>
          )}
          
          <Image
            src={lightboxImage}
            alt="Full size"
            fill
            className="object-contain p-16"
            sizes="100vw"
            quality={100}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Lyrics Modal */}
      {lyricsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <ScrollText className="w-5 h-5 text-purple-500" />
                <div>
                  <h3 className="font-semibold">{lyricsModal.title}</h3>
                  <p className="text-sm text-zinc-400">{lyricsModal.artist}</p>
                </div>
              </div>
              <button onClick={() => setLyricsModal(null)} className="text-zinc-500 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {lyricsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : lyrics ? (
                <pre className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed">{lyrics}</pre>
              ) : lyricsFallback ? (
                <div className="text-center py-8">
                  <ScrollText className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                  <p className="text-zinc-400 mb-6">Lyrics not found in database</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {lyricsFallback.geniusUrl && (
                      <a
                        href={lyricsFallback.geniusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Search Genius
                      </a>
                    )}
                    {lyricsFallback.searchUrl && (
                      <a
                        href={lyricsFallback.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        <Search className="w-4 h-4" />
                        Google Search
                      </a>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold truncate pr-4">
                {selectedItem.basic_information.title}
              </h2>
              <button onClick={() => setSelectedItem(null)} className="text-zinc-500 hover:text-white p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : releaseDetails ? (
                <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
                  {/* Images */}
                  <div className="w-full">
                    <div className="relative aspect-square bg-zinc-800 rounded-lg overflow-hidden w-full max-w-[300px] md:max-w-none mx-auto">
                      {images.length > 0 ? (
                        <>
                          <Image
                            src={images[currentImageIndex]?.uri || images[currentImageIndex]?.uri150}
                            alt={releaseDetails.title}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                          {images.length > 1 && (
                            <>
                              <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-20">
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-20">
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                            {images.length > 1 && (
                              <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                                {currentImageIndex + 1} / {images.length}
                              </span>
                            )}
                            <button
                              onClick={() => setLightboxImage(images[currentImageIndex]?.uri || images[currentImageIndex]?.uri150)}
                              className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
                              title="View full size"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc3 className="w-24 h-24 text-zinc-700" />
                        </div>
                      )}
                    </div>

                    {images.length > 1 && (
                      <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        {images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImageIndex(i)}
                            className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                              i === currentImageIndex ? 'border-purple-500' : 'border-transparent'
                            }`}
                          >
                            <Image src={img.uri150 || img.uri} alt={`Image ${i + 1}`} width={64} height={64} className="object-cover w-full h-full" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-2xl font-bold">{releaseDetails.title}</p>
                      <p className="text-lg text-purple-400">{releaseDetails.artists?.map(a => a.name).join(', ')}</p>
                      {releaseDetails.year && <p className="text-zinc-500">{releaseDetails.year}</p>}
                    </div>

                    {releaseDetails.labels && releaseDetails.labels.length > 0 && (
                      <div>
                        <p className="text-sm text-zinc-500 mb-1">Label</p>
                        <p className="text-zinc-300">{releaseDetails.labels.map(l => `${l.name} - ${l.catno}`).join(', ')}</p>
                      </div>
                    )}

                    {releaseDetails.formats && releaseDetails.formats.length > 0 && (
                      <div>
                        <p className="text-sm text-zinc-500 mb-1">Format</p>
                        <p className="text-zinc-300">
                          {releaseDetails.formats.map(f => `${f.qty}x ${f.name}${f.descriptions ? ' (' + f.descriptions.join(', ') + ')' : ''}`).join(', ')}
                        </p>
                      </div>
                    )}

                    {(releaseDetails.genres || releaseDetails.styles) && (
                      <div className="flex flex-wrap gap-2">
                        {releaseDetails.genres?.map((g, i) => (
                          <span key={`g-${i}`} className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-sm">{g}</span>
                        ))}
                        {releaseDetails.styles?.map((s, i) => (
                          <span key={`s-${i}`} className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-sm">{s}</span>
                        ))}
                      </div>
                    )}

                    {releaseDetails.tracklist && releaseDetails.tracklist.length > 0 && (
                      <div>
                        <p className="text-sm text-zinc-500 mb-2 flex items-center gap-2">
                          <Music className="w-4 h-4" /> Tracklist
                          <span className="text-xs text-purple-400/60">(tap song for lyrics)</span>
                        </p>
                        <div className="bg-zinc-800 rounded-lg p-3 max-h-60 overflow-y-auto">
                          {releaseDetails.tracklist.map((track, i) => (
                            <button
                              key={i}
                              onClick={() => fetchLyrics(
                                releaseDetails.artists?.[0]?.name || 'Unknown',
                                track.title
                              )}
                              className="w-full flex justify-between py-2 px-2 -mx-2 border-b border-zinc-700 last:border-0 hover:bg-zinc-700/50 rounded transition-colors text-left group"
                            >
                              <span className="text-zinc-300 group-hover:text-white">
                                <span className="text-zinc-500 mr-2">{track.position || i + 1}.</span>
                                {track.title}
                              </span>
                              <div className="flex items-center gap-2">
                                {track.duration && <span className="text-zinc-500 text-sm">{track.duration}</span>}
                                <ScrollText className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-colors" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-zinc-800">
                      <a
                        href={`https://www.discogs.com/release/${releaseDetails.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-lg transition-colors w-full"
                      >
                        <ExternalLink className="w-5 h-5" />
                        View on Discogs
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500 text-center py-12">Failed to load details</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search collection..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
        />
        <select value={genre} onChange={(e) => setGenre(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500">
          {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={decade} onChange={(e) => setDecade(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500">
          {DECADES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500">
          <option value="added">Recently Added</option>
          <option value="artist">Artist A-Z (by surname)</option>
          <option value="title">Title A-Z</option>
          <option value="year">Year (Newest)</option>
        </select>
      </div>

      <p className="text-zinc-500 text-sm mb-4">
        Showing {filtered.length} of {items.length} records
        {artistTypesLoading && (
          <span className="inline-flex items-center gap-1 ml-2 text-purple-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading artist sort data...
          </span>
        )}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map((item) => (
          <RecordCard key={item.instance_id} item={item} onOpenDetails={() => handleOpenDetails(item)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500">No records match your filters</div>
      )}
    </div>
  );
}

function RecordCard({ item, onOpenDetails }: { item: CollectionItem; onOpenDetails: () => void }) {
  const info = item.basic_information;
  const artist = info.artists[0]?.name || 'Unknown Artist';
  const format = info.formats[0];
  const formatDesc = format ? `${format.descriptions?.join(', ') || format.name}` : 'Vinyl';

  return (
    <div 
      className="group bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer"
      onClick={onOpenDetails}
    >
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
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1 rounded-full">
            View Details
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate" title={info.title}>{info.title}</h3>
        <p className="text-zinc-400 text-sm truncate" title={artist}>{artist}</p>
        <div className="mt-2 flex items-center gap-2">
          {info.year && (
            <span className="inline-flex items-center gap-1 text-xs bg-zinc-800 px-2 py-1 rounded">
              <Calendar className="w-3 h-3" />{info.year}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-2 truncate">{formatDesc}</p>
      </div>
    </div>
  );
}
