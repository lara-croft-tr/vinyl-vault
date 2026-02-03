'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Mic, MicOff, Loader2, Plus, X, Disc3, Search, AlertTriangle } from 'lucide-react';

interface SearchResult {
  id: number;
  title: string;
  year?: string;
  thumb?: string;
  format?: string[];
  country?: string;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export function VoiceAdd({ onAdded }: { onAdded?: () => void }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isAdding, setIsAdding] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [duplicateWarning, setDuplicateWarning] = useState<{ releaseId: number; title: string; duplicates: any[] } | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsListening(false);
      handleSearch(text);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable it in your browser settings.');
      } else {
        setError(`Error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    setResults([]);
    setShowResults(false);
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setShowResults(true);
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results?.slice(0, 5) || []);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    }
    setIsSearching(false);
  };

  const handleAdd = async (releaseId: number, skipDuplicateCheck = false) => {
    const result = results.find(r => r.id === releaseId);
    if (!result) return;

    // Extract artist and title from "Artist - Title" format
    const parts = result.title.split(' - ');
    const artist = parts[0] || '';
    const title = parts.slice(1).join(' - ') || result.title;

    // Check for duplicates first (unless skipping)
    if (!skipDuplicateCheck && artist) {
      setIsAdding(releaseId);
      try {
        const res = await fetch('/api/collection/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artist, title }),
        });
        const data = await res.json();
        
        if (data.hasDuplicate) {
          setIsAdding(null);
          setDuplicateWarning({
            releaseId,
            title: result.title,
            duplicates: data.duplicates,
          });
          return;
        }
      } catch (err) {
        console.error('Duplicate check failed:', err);
      }
    }

    setIsAdding(releaseId);
    try {
      await fetch('/api/collection/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId }),
      });
      setAddedIds(new Set([...addedIds, releaseId]));
      setDuplicateWarning(null);
      onAdded?.();
    } catch (err) {
      console.error('Failed to add:', err);
      setError('Failed to add to collection.');
    }
    setIsAdding(null);
  };

  const closeResults = () => {
    setShowResults(false);
    setTranscript('');
    setResults([]);
    setError(null);
  };

  if (!supported) {
    return null; // Don't show button if not supported
  }

  return (
    <>
      {/* Voice Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
        title={isListening ? 'Tap to stop' : 'Voice add album'}
      >
        {isListening ? (
          <>
            <MicOff className="w-5 h-5" />
            <span className="hidden sm:inline">Listening...</span>
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            <span className="hidden sm:inline">Voice Add</span>
          </>
        )}
      </button>

      {/* Results Modal */}
      {showResults && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5 text-purple-500" />
                <div>
                  <h3 className="font-semibold">Voice Add</h3>
                  {transcript && (
                    <p className="text-sm text-zinc-400">"{transcript}"</p>
                  )}
                </div>
              </div>
              <button onClick={closeResults} className="text-zinc-500 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={startListening}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    Try Again
                  </button>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No results found</p>
                  <button
                    onClick={startListening}
                    className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-500 mb-3">Select album to add:</p>
                  {results.map((result) => {
                    const isAdded = addedIds.has(result.id);
                    const isAddingThis = isAdding === result.id;
                    
                    return (
                      <div
                        key={result.id}
                        className="flex gap-3 bg-zinc-800 rounded-lg p-3"
                      >
                        <div className="w-16 h-16 relative rounded overflow-hidden bg-zinc-700 flex-shrink-0">
                          {result.thumb ? (
                            <Image
                              src={result.thumb}
                              alt={result.title}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Disc3 className="w-6 h-6 text-zinc-600" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{result.title}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.year && (
                              <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded">{result.year}</span>
                            )}
                            {result.format?.slice(0, 2).map((f, i) => (
                              <span key={i} className="text-xs bg-zinc-700 px-2 py-0.5 rounded">{f}</span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0">
                          {isAdded ? (
                            <span className="text-green-400 text-sm px-3 py-2">Added ✓</span>
                          ) : (
                            <button
                              onClick={() => handleAdd(result.id)}
                              disabled={isAddingThis}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                            >
                              {isAddingThis ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {results.length > 0 && (
              <div className="p-4 border-t border-zinc-800">
                <button
                  onClick={startListening}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  Add Another
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Duplicate Warning Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-yellow-500/20 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">Possible Duplicate</h3>
                <p className="text-zinc-400 text-sm">
                  You may already have this album:
                </p>
              </div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-4 mb-4">
              <p className="font-medium text-white">{duplicateWarning.title}</p>
              <div className="mt-2 space-y-1">
                {duplicateWarning.duplicates.map((dup: any) => (
                  <p key={dup.id} className="text-sm text-zinc-500">
                    • {dup.format} ({dup.year || 'Unknown year'})
                  </p>
                ))}
              </div>
            </div>

            <p className="text-zinc-400 text-sm mb-4">
              Add another copy anyway?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDuplicateWarning(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAdd(duplicateWarning.releaseId, true)}
                disabled={isAdding !== null}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isAdding ? (
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
    </>
  );
}
