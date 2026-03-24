/**
 * Search Engine
 * Orchestrates the full route search pipeline:
 *   1. Resolve origin/destination to airport IATA codes
 *   2. Load route data from provider
 *   3. Build route graph
 *   4. Find all valid paths (BFS/DFS)
 *   5. Score each path
 *   6. Rank and tag results
 *   7. Return SearchResponse
 *
 * TODO: When a FlightScheduleProvider returns live data, mode becomes
 *       'live-schedule' and timing is calculated from actual flight times.
 */

import type { SearchRequest, SearchResponse, SearchMode } from '@/types';
import { resolveAirports } from '@/lib/normalization/airportResolver';
import { routeDataProvider } from '@/lib/providers/routeDataProvider';
import { buildGraph } from './graph';
import { findPaths } from './pathfinder';
import { scorePath } from '@/lib/scoring/scorer';
import { rankRoutes } from '@/lib/scoring/ranker';
import { findAirline } from '@/lib/normalization/airlineNormalizer';

const SPACE_WARNING =
  'Routes shown are eligible routing options based on the ZED/staff-travel agreement. ' +
  'Actual boarding depends on available space at time of travel. ' +
  'All tickets are subject to space availability and must be self-issued via myIDTravel.';

export async function search(request: SearchRequest): Promise<SearchResponse> {
  // ── 1. Resolve airports ───────────────────────────────────────────────────
  const originAirports = resolveAirports(request.origin);
  const destinationAirports = resolveAirports(request.destination);

  if (originAirports.length === 0) {
    return errorResponse(
      `Could not find any airport matching "${request.origin}". Try an IATA code (e.g. JFK) or city name.`,
      request
    );
  }
  if (destinationAirports.length === 0) {
    return errorResponse(
      `Could not find any airport matching "${request.destination}". Try an IATA code (e.g. MAD) or city name.`,
      request
    );
  }

  // ── 2. Determine avoid-airport set ───────────────────────────────────────
  const avoidSet = new Set<string>(
    (request.avoidAirports ?? []).map((a) => a.toUpperCase())
  );

  // ── 3. Load routes and build graph ────────────────────────────────────────
  const routes = await routeDataProvider.getRoutes();
  const mode: SearchMode = routeDataProvider.isLive() ? 'live-schedule' : 'route-network';
  const graph = buildGraph(routes);

  // ── 4. Find paths for every origin × destination pair ────────────────────
  const preferredSet = new Set<string>(
    (request.preferredAirlines ?? [])
      .map((a) => {
        const found = findAirline(a);
        return found ? found.code.toUpperCase() : a.toUpperCase();
      })
  );

  const requestId = Date.now().toString(36);
  let pathIndex = 0;

  const allRoutes = [];

  for (const origin of originAirports) {
    for (const dest of destinationAirports) {
      if (origin.iata === dest.iata) continue;

      const rawPaths = findPaths(graph, origin.iata, dest.iata, request, avoidSet);

      for (const path of rawPaths) {
        const ranked = scorePath(path, mode, preferredSet, requestId, pathIndex++);
        allRoutes.push(ranked);
      }
    }
  }

  if (allRoutes.length === 0) {
    return {
      mode,
      originAirports,
      destinationAirports,
      routes: [],
      totalFound: 0,
      warning: SPACE_WARNING,
      searchedAt: new Date().toISOString(),
    };
  }

  // ── 5. Rank and tag ───────────────────────────────────────────────────────
  const rankedRoutes = rankRoutes(allRoutes);

  return {
    mode,
    originAirports,
    destinationAirports,
    routes: rankedRoutes,
    totalFound: allRoutes.length,
    warning: SPACE_WARNING,
    searchedAt: new Date().toISOString(),
  };
}

function errorResponse(message: string, request: SearchRequest): SearchResponse {
  return {
    mode: 'route-network',
    originAirports: [],
    destinationAirports: [],
    routes: [],
    totalFound: 0,
    warning: message,
    searchedAt: new Date().toISOString(),
  };
}
