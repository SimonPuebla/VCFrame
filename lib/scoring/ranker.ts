/**
 * Ranker
 * Takes a list of scored RankedRoutes, assigns tags (Best Overall,
 * Most Direct, etc.) and returns the top results in order.
 */

import type { RankedRoute, RouteTag } from '@/types';

const MAX_RESULTS = 8;

/**
 * Assign tags and sort routes for display.
 * Returns at most MAX_RESULTS routes.
 */
export function rankRoutes(routes: RankedRoute[]): RankedRoute[] {
  if (routes.length === 0) return [];

  // Sort by score ascending (lower = better)
  const sorted = [...routes].sort((a, b) => a.score - b.score);

  // Tag: Best Overall — lowest score overall
  sorted[0].tags.push('Best Overall');

  // Tag: Most Direct — fewest stops (tie-break by score)
  const fewestStops = Math.min(...sorted.map((r) => r.stopCount));
  const mostDirect = sorted.find((r) => r.stopCount === fewestStops);
  if (mostDirect && !mostDirect.tags.includes('Best Overall')) {
    mostDirect.tags.push('Most Direct');
  } else if (mostDirect) {
    mostDirect.tags.push('Most Direct');
  }

  // Tag: Lowest Connection Risk — highest practicality score
  //   proxy: fewest airlines * fewest stops, among routes with score <= median
  const median = sorted[Math.floor(sorted.length / 2)].score;
  const lowRisk = sorted
    .filter((r) => r.score <= median)
    .sort(
      (a, b) =>
        a.airlineSequence.length - b.airlineSequence.length ||
        a.stopCount - b.stopCount
    );

  if (lowRisk.length > 0 && !lowRisk[0].tags.includes('Best Overall')) {
    lowRisk[0].tags.push('Lowest Connection Risk');
  }

  // Remaining top routes get "Backup Option"
  const tagged = new Set(sorted.flatMap((r) => (r.tags.length > 0 ? [r.id] : [])));
  for (const r of sorted) {
    if (!tagged.has(r.id)) {
      r.tags.push('Backup Option');
      tagged.add(r.id);
      if ([...tagged].filter((id) => sorted.find((s) => s.id === id && s.tags.includes('Backup Option'))).length >= 3) {
        break;
      }
    }
  }

  return sorted.slice(0, MAX_RESULTS);
}

/**
 * Helper: tag colour for UI badges.
 */
export function tagColour(tag: RouteTag): string {
  switch (tag) {
    case 'Best Overall': return 'bg-green-100 text-green-800 border-green-200';
    case 'Most Direct': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Lowest Connection Risk': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Backup Option': return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

/**
 * Helper: practicality label colour for UI badges.
 */
export function practicalityColour(label: string): string {
  switch (label) {
    case 'Very Practical': return 'bg-green-50 text-green-700 border-green-200';
    case 'Practical': return 'bg-lime-50 text-lime-700 border-lime-200';
    case 'Riskier': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'High Risk Backup': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-600';
  }
}
