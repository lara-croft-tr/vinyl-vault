/**
 * Get sort key for an artist name using Discogs API-determined type.
 * 
 * If person: sort by last name ("Eric Clapton" → "clapton, eric")
 * If band: sort by name, stripping leading "The" ("The Stone Roses" → "stone roses")
 */
export function getArtistSortName(name: string, type: 'person' | 'band' = 'band'): string {
  if (!name) return '';
  
  // Strip trailing numbering from Discogs (e.g., "Phil Collins (2)")
  const cleaned = name.replace(/\s*\(\d+\)\s*$/, '').trim();
  
  // Strip leading "The " for sorting
  const withoutThe = cleaned.replace(/^The\s+/i, '');
  
  if (type === 'person') {
    const words = withoutThe.split(/\s+/);
    if (words.length >= 2) {
      const lastName = words[words.length - 1];
      const firstNames = words.slice(0, -1).join(' ');
      return `${lastName}, ${firstNames}`.toLowerCase();
    }
    return withoutThe.toLowerCase();
  }
  
  // Band: just strip "The" and lowercase
  return withoutThe.toLowerCase();
}
