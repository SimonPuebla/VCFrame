/**
 * Pathfinder
 * Finds all valid paths between two airports subject to:
 *   - max stops (defaults to 3)
 *   - min/max layover at each intermediate airport
 *   - preferred airlines and airports/countries to avoid
 *   - only eligible airline edges (graph already pre-filtered)
 *
 * Algorithm: BFS / DFS with depth limit.
 * We enumerate paths rather than just the optimal one so the scoring layer
 * can rank alternatives and surface them as "Best Overall", "Most Direct", etc.
 */

import type { RouteGraph, GraphEdge } from './graph';
import type { SearchRequest } from '@/types';

export interface RawPath {
  airports: string[];   // IATA sequence including origin and destination
  edges: GraphEdge[];   // one per segment
  totalFlightMinutes: number;
}

interface SearchState {
  airport: string;
  path: string[];
  edges: GraphEdge[];
  flightMinutes: number;
}

const DEFAULT_MAX_STOPS = 3;
const DEFAULT_MIN_LAYOVER = 45;    // minutes
const DEFAULT_MAX_LAYOVER = 1440;  // 24 hours

// Typical ground/transfer time added per connection (conservative estimate)
const TYPICAL_LAYOVER_MINUTES = 90;
// Max raw paths to evaluate before stopping (performance ceiling)
const MAX_PATHS = 200;

/**
 * Find all valid raw paths from originIata to destinationIata.
 * Returns paths sorted ascending by total flight time (layover not yet added).
 */
export function findPaths(
  graph: RouteGraph,
  originIata: string,
  destinationIata: string,
  request: SearchRequest,
  avoidAirportSet: Set<string>
): RawPath[] {
  const maxStops = request.maxStops ?? DEFAULT_MAX_STOPS;
  const minLayover = request.minLayoverMinutes ?? DEFAULT_MIN_LAYOVER;
  const maxLayover = request.maxLayoverMinutes ?? DEFAULT_MAX_LAYOVER;
  const preferred = new Set(
    (request.preferredAirlines ?? []).map((a) => a.toUpperCase())
  );

  const results: RawPath[] = [];

  // Iterative DFS using explicit stack (avoids call-stack overflow for deep graphs)
  const stack: SearchState[] = [
    {
      airport: originIata.toUpperCase(),
      path: [originIata.toUpperCase()],
      edges: [],
      flightMinutes: 0,
    },
  ];

  while (stack.length > 0 && results.length < MAX_PATHS) {
    const state = stack.pop()!;
    const { airport, path, edges, flightMinutes } = state;

    if (airport === destinationIata.toUpperCase() && edges.length > 0) {
      results.push({
        airports: path,
        edges,
        totalFlightMinutes: flightMinutes,
      });
      continue;
    }

    // Stop expanding if we've already hit the stop limit
    const stopsUsed = path.length - 1; // segments used so far
    if (stopsUsed >= maxStops + 1) continue; // +1 because path includes origin

    const outbound = graph.get(airport) ?? [];

    for (const edge of outbound) {
      const next = edge.destinationIata;

      // Don't revisit airports (cycle guard)
      if (path.includes(next)) continue;

      // Avoid specified airports
      if (avoidAirportSet.has(next)) continue;

      // If this is an intermediate hop (not the destination), check layover window.
      // We use TYPICAL_LAYOVER_MINUTES as the default layover — actual layover
      // depends on scheduling which isn't available in route-network mode.
      if (next !== destinationIata.toUpperCase()) {
        if (TYPICAL_LAYOVER_MINUTES < minLayover) continue;
        if (TYPICAL_LAYOVER_MINUTES > maxLayover) continue;
      }

      // Preferred airline filter: if user specified preferences, skip edges
      // that don't match UNLESS no other path exists (we relax this at ranking level)
      if (preferred.size > 0 && !preferred.has(edge.airlineCode.toUpperCase())) {
        // Still allow — we'll score preferred routes higher rather than hard-reject
      }

      stack.push({
        airport: next,
        path: [...path, next],
        edges: [...edges, edge],
        flightMinutes: flightMinutes + edge.durationMinutes,
      });
    }
  }

  // Sort by total flight time ascending
  results.sort((a, b) => a.totalFlightMinutes - b.totalFlightMinutes);

  return results;
}
