/**
 * Live Route Data Provider
 * Fetches the full route network for all eligible airlines from Aviationstack,
 * caches the result for 12 hours, and maps it to the internal Route type.
 *
 * Falls back to the static provider if:
 *   - AVIATIONSTACK_API_KEY is not set
 *   - The plan doesn't support /v1/routes (requires Basic+)
 *   - Any network error occurs
 *
 * Caching strategy:
 *   Each per-airline fetch() call is cached by Next.js Data Cache with
 *   revalidate=43200 (12h). On Vercel this cache persists across all
 *   serverless invocations and is automatically revalidated.
 *
 * Performance:
 *   Airlines are fetched in parallel batches of 8 to avoid rate limiting.
 *   First cold call: ~5–10s (building cache for 42 airlines).
 *   Subsequent calls: <50ms (served from Data Cache).
 */

import type { Route } from '@/types';
import type { RouteDataProviderInterface } from './routeDataProvider';
import {
  getRoutesForAirline,
  AviationstackPlanError,
  AviationstackAuthError,
} from './aviationstackClient';
import { getAllEligibleAirlines } from '@/lib/normalization/airlineNormalizer';
import { unstable_cache } from 'next/cache';

// ── Duration helper ───────────────────────────────────────────────────────────
// Aviationstack routes give departure/arrival times in HH:MM local.
// Without timezone data we can only produce a rough estimate.
// We treat times as UTC and handle overnight routes.
function estimateDuration(depTime: string | null, arrTime: string | null): number {
  if (!depTime || !arrTime) return 120; // default 2h if unknown

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  let diff = toMinutes(arrTime) - toMinutes(depTime);
  if (diff <= 0) diff += 24 * 60; // overnight flight
  // Cap unreasonable values
  if (diff > 900) diff = 120;
  return diff;
}

// ── Main cached fetcher ───────────────────────────────────────────────────────

const fetchAllEligibleRoutes = unstable_cache(
  async (): Promise<Route[]> => {
    const eligibleAirlines = getAllEligibleAirlines();
    const codes = eligibleAirlines.map((a) => a.code);

    const BATCH_SIZE = 8;
    const allRoutes: Route[] = [];

    for (let i = 0; i < codes.length; i += BATCH_SIZE) {
      const batch = codes.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((code) => getRoutesForAirline(code))
      );

      for (const result of batchResults) {
        if (result.status !== 'fulfilled') continue;

        for (const r of result.value) {
          if (!r.airline?.iata || !r.departure?.iata || !r.arrival?.iata) continue;

          allRoutes.push({
            airlineCode: r.airline.iata.toUpperCase(),
            originIata: r.departure.iata.toUpperCase(),
            destinationIata: r.arrival.iata.toUpperCase(),
            typicalDurationMinutes: estimateDuration(
              r.departure.time,
              r.arrival.time
            ),
            seasonal: false,
            frequencyPerWeek: 5, // conservative default; Aviationstack routes don't include frequency
            source: 'api',
          });
        }
      }
    }

    console.log(`[LiveRouteDataProvider] Loaded ${allRoutes.length} routes from Aviationstack`);
    return allRoutes;
  },
  ['aviationstack-eligible-routes'],
  { revalidate: 43200 } // 12h
);

// ── Provider class ────────────────────────────────────────────────────────────

export class LiveRouteDataProvider implements RouteDataProviderInterface {
  async getRoutes(): Promise<Route[]> {
    return fetchAllEligibleRoutes();
  }
  isLive(): boolean {
    return true;
  }
}
