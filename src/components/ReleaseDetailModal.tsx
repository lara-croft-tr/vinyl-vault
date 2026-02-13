'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ExternalLink, Trash2, Loader2, Music, ChevronLeft, ChevronRight, Search, ScrollText, Disc3 } from 'lucide-react';

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
  notes?: string;
  uri?: string;
}

interface BasicInfo {
  title: string;
  artist: string;
  cover_image?: string;
  year?: number | string;
}

interface ReleaseDetailModalProps {
  releaseId: number;
  onClose: () => void;
  basicInfo?: BasicInfo;
  showRemoveButton?: boolean;
  onRemove?: () => void;
}

export function ReleaseDetailModal({ releaseId, onClose, basicInfo, showRemoveButton, onRemove }: ReleaseDetailModalProps) {
  const [releaseDetails, setReleaseDetails] = useState<ReleaseDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lyricsModal, setLyricsModal] = useState<{ artist: string; title: string } | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsFallback, setLyricsFallback] = useState<{ searchUrl?: string; geniusUrl?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingDetails(true);
    setReleaseDetails(null);
    setCurrentImageIndex(0);

    fetch(`/api/release/${releaseId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setReleaseDetails(data);
      })
      .catch(err => console.error('Failed to load details:', err))
      .finally(() => { if (!cancelled) setLoadingDetails(false); });

    return () => { cancelled = true; };
  }, [releaseId]);

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
    } catch {
      setLyricsFallback({ searchUrl: `https://www.google.com/search?q=${encodeURIComponent(`${artist} ${title} lyrics`)}` });
    }
    setLyricsLoading(false);
  };

  return (
    <>
      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[70]"
          onClick={() => setLightboxImage(null)}
        >
          <button onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10">
            <X className="w-8 h-8" />
          </button>
          {releaseDetails?.images && releaseDetails.images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); const imgs = releaseDetails.images!; const ni = (currentImageIndex - 1 + imgs.length) % imgs.length; setCurrentImageIndex(ni); setLightboxImage(imgs[ni]?.uri || imgs[ni]?.uri150); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-10"
              ><ChevronLeft className="w-8 h-8" /></button>
              <button
                onClick={(e) => { e.stopPropagation(); const imgs = releaseDetails.images!; const ni = (currentImageIndex + 1) % imgs.length; setCurrentImageIndex(ni); setLightboxImage(imgs[ni]?.uri || imgs[ni]?.uri150); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-10"
              ><ChevronRight className="w-8 h-8" /></button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-4 py-2 rounded-full z-10">
                {currentImageIndex + 1} / {releaseDetails.images.length}
              </div>
            </>
          )}
          <Image src={lightboxImage} alt="Full size" fill className="object-contain p-16" sizes="100vw" quality={100} onClick={(e) => e.stopPropagation()} />
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
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
              ) : lyrics ? (
                <pre className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed">{lyrics}</pre>
              ) : lyricsFallback ? (
                <div className="text-center py-8">
                  <ScrollText className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                  <p className="text-zinc-400 mb-6">Lyrics not found in database</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {lyricsFallback.geniusUrl && (
                      <a href={lyricsFallback.geniusUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-medium transition-colors">
                        <ExternalLink className="w-4 h-4" />Search Genius
                      </a>
                    )}
                    {lyricsFallback.searchUrl && (
                      <a href={lyricsFallback.searchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                        <Search className="w-4 h-4" />Google Search
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
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
        <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center z-10">
            <h2 className="text-xl font-bold truncate pr-4">
              {releaseDetails?.title || basicInfo?.title || 'Loading...'}
            </h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-white p-2">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                {basicInfo?.cover_image && (
                  <div className="w-32 h-32 relative rounded-lg overflow-hidden opacity-50">
                    <Image src={basicInfo.cover_image} alt={basicInfo.title} fill className="object-cover" sizes="128px" />
                  </div>
                )}
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : releaseDetails ? (
              <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
                {/* Images */}
                <div className="w-full">
                  <div className="relative aspect-square bg-zinc-800 rounded-lg overflow-hidden w-full max-w-[300px] md:max-w-none mx-auto">
                    {images.length > 0 ? (
                      <>
                        <Image src={images[currentImageIndex]?.uri || images[currentImageIndex]?.uri150} alt={releaseDetails.title} fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
                        {images.length > 1 && (
                          <>
                            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-20"><ChevronLeft className="w-5 h-5" /></button>
                            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-20"><ChevronRight className="w-5 h-5" /></button>
                          </>
                        )}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                          {images.length > 1 && (
                            <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full">{currentImageIndex + 1} / {images.length}</span>
                          )}
                          <button onClick={() => setLightboxImage(images[currentImageIndex]?.uri || images[currentImageIndex]?.uri150)} className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors" title="View full size">
                            <Search className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Disc3 className="w-24 h-24 text-zinc-700" /></div>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                      {images.map((img, i) => (
                        <button key={i} onClick={() => setCurrentImageIndex(i)} className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${i === currentImageIndex ? 'border-purple-500' : 'border-transparent'}`}>
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
                      <p className="text-zinc-300">{releaseDetails.formats.map(f => `${f.qty}x ${f.name}${f.descriptions ? ' (' + f.descriptions.join(', ') + ')' : ''}`).join(', ')}</p>
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
                        <Music className="w-4 h-4" />Tracklist
                        <span className="text-xs text-purple-400/60">(tap song for lyrics)</span>
                      </p>
                      <div className="bg-zinc-800 rounded-lg p-3 max-h-60 overflow-y-auto">
                        {releaseDetails.tracklist.map((track, i) => (
                          <button key={i} onClick={() => fetchLyrics(releaseDetails.artists?.[0]?.name || 'Unknown', track.title)} className="w-full flex justify-between py-2 px-2 -mx-2 border-b border-zinc-700 last:border-0 hover:bg-zinc-700/50 rounded transition-colors text-left group">
                            <span className="text-zinc-300 group-hover:text-white">
                              <span className="text-zinc-500 mr-2">{track.position || i + 1}.</span>{track.title}
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

                  {/* Notes */}
                  {releaseDetails.notes && (
                    <div>
                      <p className="text-sm text-zinc-500 mb-1">Notes</p>
                      <p className="text-zinc-400 text-sm">{releaseDetails.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-zinc-800">
                    <a href={`https://www.discogs.com/release/${releaseDetails.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-lg transition-colors">
                      <ExternalLink className="w-5 h-5" />View on Discogs
                    </a>
                    {showRemoveButton && onRemove && (
                      <button onClick={onRemove} className="inline-flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-3 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-center py-12">Failed to load details</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
