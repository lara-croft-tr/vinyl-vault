'use client';

import { useState, useEffect } from 'react';
import { CollectionItem } from '@/lib/discogs';
import { Disc3, DollarSign, Calendar, Music, TrendingUp, Loader2, BarChart3, PieChart } from 'lucide-react';

interface Props {
  items: CollectionItem[];
}

interface ValueData {
  totalLow: number;
  totalMid: number;
  totalHigh: number;
  itemCount: number;
  loaded: boolean;
}

export function StatsView({ items }: Props) {
  const [valueData, setValueData] = useState<ValueData>({
    totalLow: 0,
    totalMid: 0,
    totalHigh: 0,
    itemCount: 0,
    loaded: false,
  });
  const [loadingValues, setLoadingValues] = useState(false);
  const [sampleSize, setSampleSize] = useState<number>(20);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Calculate genre stats
  const genreStats = items.reduce((acc, item) => {
    const genres = item.basic_information.genres || [];
    genres.forEach((genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedGenres = Object.entries(genreStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // Calculate decade stats
  const decadeStats = items.reduce((acc, item) => {
    const year = item.basic_information.year;
    if (year) {
      const decade = `${Math.floor(year / 10) * 10}s`;
      acc[decade] = (acc[decade] || 0) + 1;
    } else {
      acc['Unknown'] = (acc['Unknown'] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedDecades = Object.entries(decadeStats)
    .sort(([a], [b]) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return b.localeCompare(a);
    });

  // Calculate year stats (for chart)
  const yearStats = items.reduce((acc, item) => {
    const year = item.basic_information.year;
    if (year && year >= 1950) {
      acc[year] = (acc[year] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);

  const sortedYears = Object.entries(yearStats)
    .map(([year, count]) => ({ year: parseInt(year), count }))
    .sort((a, b) => a.year - b.year);

  // Calculate format stats
  const formatStats = items.reduce((acc, item) => {
    const format = item.basic_information.formats?.[0];
    if (format) {
      const formatName = format.descriptions?.includes('LP') ? 'LP' :
                         format.descriptions?.includes('Single') ? 'Single' :
                         format.descriptions?.includes('EP') ? 'EP' :
                         format.descriptions?.includes('Album') ? 'LP' :
                         format.name || 'Other';
      acc[formatName] = (acc[formatName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedFormats = Object.entries(formatStats)
    .sort(([, a], [, b]) => b - a);

  // Calculate style stats
  const styleStats = items.reduce((acc, item) => {
    const styles = item.basic_information.styles || [];
    styles.forEach((style) => {
      acc[style] = (acc[style] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedStyles = Object.entries(styleStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // Calculate label stats
  const labelStats = items.reduce((acc, item) => {
    const label = item.basic_information.labels?.[0]?.name;
    if (label) {
      acc[label] = (acc[label] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedLabels = Object.entries(labelStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // Calculate artist stats
  const artistStats = items.reduce((acc, item) => {
    const artist = item.basic_information.artists?.[0]?.name;
    if (artist && artist !== 'Various') {
      acc[artist] = (acc[artist] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedArtists = Object.entries(artistStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // Max values for bar charts
  const maxGenreCount = Math.max(...sortedGenres.map(([, count]) => count), 1);
  const maxDecadeCount = Math.max(...sortedDecades.map(([, count]) => count), 1);
  const maxStyleCount = Math.max(...sortedStyles.map(([, count]) => count), 1);
  const maxYearCount = Math.max(...sortedYears.map(({ count }) => count), 1);

  // Load collection values
  const loadValues = async () => {
    setLoadingValues(true);
    let totalLow = 0;
    let totalMid = 0;
    let totalHigh = 0;
    let priceCount = 0;
    let processed = 0;

    // Sample items for value estimation
    const sampleItems = sampleSize === -1 ? items : items.slice(0, sampleSize);
    setLoadingProgress(0);
    
    for (const item of sampleItems) {
      try {
        const res = await fetch(`/api/stats/value?releaseId=${item.basic_information.id}`);
        const data = await res.json();
        if (data.lowest_price?.value) {
          totalLow += data.lowest_price.value;
          totalMid += data.lowest_price.value * 1.3;
          totalHigh += data.lowest_price.value * 1.8;
          priceCount++;
        }
      } catch (e) {
        // Skip failed items
      }
      processed++;
      setLoadingProgress(processed);
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    // Extrapolate to full collection
    if (priceCount > 0) {
      const avgLow = totalLow / priceCount;
      const avgMid = totalMid / priceCount;
      const avgHigh = totalHigh / priceCount;
      setValueData({
        totalLow: avgLow * items.length,
        totalMid: avgMid * items.length,
        totalHigh: avgHigh * items.length,
        itemCount: sampleItems.length,
        loaded: true,
      });
    }
    setLoadingValues(false);
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Disc3 className="w-5 h-5 text-purple-500" />
            <span className="text-zinc-500 text-sm">Total Records</span>
          </div>
          <p className="text-3xl font-bold">{items.length}</p>
        </div>
        
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Music className="w-5 h-5 text-purple-500" />
            <span className="text-zinc-500 text-sm">Genres</span>
          </div>
          <p className="text-3xl font-bold">{Object.keys(genreStats).length}</p>
        </div>
        
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            <span className="text-zinc-500 text-sm">Decades Spanned</span>
          </div>
          <p className="text-3xl font-bold">{Object.keys(decadeStats).filter(d => d !== 'Unknown').length}</p>
        </div>
        
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span className="text-zinc-500 text-sm">Artists</span>
          </div>
          <p className="text-3xl font-bold">{Object.keys(artistStats).length}</p>
        </div>
      </div>

      {/* Estimated Value */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-lg font-semibold">Estimated Collection Value</span>
          </div>
          {!valueData.loaded && !loadingValues && (
            <div className="flex items-center gap-2">
              <select
                value={sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value={20}>20 records</option>
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
                <option value={-1}>All ({items.length})</option>
              </select>
              <button
                onClick={loadValues}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Calculate Value
              </button>
            </div>
          )}
        </div>
        
        {loadingValues ? (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Fetching market prices... ({sampleSize === -1 ? `all ${items.length}` : `sampling ${Math.min(sampleSize, items.length)} of ${items.length}`} records) — {loadingProgress}/{sampleSize === -1 ? items.length : Math.min(sampleSize, items.length)}</span>
          </div>
        ) : valueData.loaded ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-zinc-500 text-sm mb-1">Low Estimate</p>
              <p className="text-2xl font-bold text-green-400">
                ${valueData.totalLow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm mb-1">Mid Estimate</p>
              <p className="text-2xl font-bold text-green-500">
                ${valueData.totalMid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm mb-1">High Estimate</p>
              <p className="text-2xl font-bold text-green-600">
                ${valueData.totalHigh.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-zinc-500">Click to estimate your collection&apos;s market value based on current Discogs prices</p>
        )}
        {valueData.loaded && (
          <p className="text-zinc-600 text-xs mt-3">
            *{valueData.itemCount >= items.length ? `Based on all ${items.length} records` : `Based on ${valueData.itemCount} of ${items.length} records sampled`}{valueData.itemCount < items.length ? ', extrapolated to full collection' : ''}
          </p>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Genre Breakdown */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="w-5 h-5 text-purple-500" />
            <span className="text-lg font-semibold">By Genre</span>
          </div>
          <div className="space-y-3">
            {sortedGenres.map(([genre, count]) => (
              <div key={genre}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-300">{genre}</span>
                  <span className="text-zinc-500">{count}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(count / maxGenreCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decade Breakdown */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <span className="text-lg font-semibold">By Decade</span>
          </div>
          <div className="space-y-3">
            {sortedDecades.map(([decade, count]) => (
              <div key={decade}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-300">{decade}</span>
                  <span className="text-zinc-500">{count}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(count / maxDecadeCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Year Timeline */}
      {sortedYears.length > 0 && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-purple-500" />
            <span className="text-lg font-semibold">Records by Year</span>
          </div>
          <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
            {sortedYears.map(({ year, count }) => (
              <div key={year} className="flex flex-col items-center min-w-[20px]">
                <div
                  className="w-4 bg-purple-500 rounded-t hover:bg-purple-400 transition-colors"
                  style={{ height: `${(count / maxYearCount) * 100}%`, minHeight: '4px' }}
                  title={`${year}: ${count} records`}
                />
                {count >= maxYearCount * 0.5 && (
                  <span className="text-[10px] text-zinc-500 mt-1 -rotate-45">{year}</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-2">
            <span>{sortedYears[0]?.year}</span>
            <span>{sortedYears[sortedYears.length - 1]?.year}</span>
          </div>
        </div>
      )}

      {/* More Stats Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Top Artists */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h3 className="text-lg font-semibold mb-4">Top Artists</h3>
          <div className="space-y-2">
            {sortedArtists.map(([artist, count], i) => (
              <div key={artist} className="flex justify-between items-center">
                <span className="text-zinc-300 truncate flex-1">
                  <span className="text-zinc-500 mr-2">{i + 1}.</span>
                  {artist}
                </span>
                <span className="text-zinc-500 text-sm ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Labels */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h3 className="text-lg font-semibold mb-4">Top Labels</h3>
          <div className="space-y-2">
            {sortedLabels.map(([label, count], i) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-zinc-300 truncate flex-1">
                  <span className="text-zinc-500 mr-2">{i + 1}.</span>
                  {label}
                </span>
                <span className="text-zinc-500 text-sm ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Styles */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h3 className="text-lg font-semibold mb-4">Top Styles</h3>
          <div className="space-y-2">
            {sortedStyles.map(([style, count], i) => (
              <div key={style} className="flex justify-between items-center">
                <span className="text-zinc-300 truncate flex-1">
                  <span className="text-zinc-500 mr-2">{i + 1}.</span>
                  {style}
                </span>
                <span className="text-zinc-500 text-sm ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Format Breakdown */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h3 className="text-lg font-semibold mb-4">By Format</h3>
        <div className="flex flex-wrap gap-4">
          {sortedFormats.map(([format, count]) => (
            <div key={format} className="bg-zinc-800 rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-zinc-500 text-sm">{format}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
