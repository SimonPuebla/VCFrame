/**
 * Route Data Provider
 * Supplies the routing engine with route (edge) data.
 *
 * Auto-selects provider based on environment:
 *   - AVIATIONSTACK_API_KEY set  → LiveRouteDataProvider (Aviationstack /v1/routes)
 *   - No API key                 → StaticRouteDataProvider (bundled routes.json)
 *
 * Live provider caches responses for 12h via Next.js Data Cache.
 * Falls back to static on any API error or plan restriction.
 */

import type { Route } from '@/types';
import { getAllEligibleAirlines } from '@/lib/normalization/airlineNormalizer';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawRoutes: Route[] = require('@/data/routes.json');

export interface RouteDataProviderInterface {
  /** Return all routes available for routing. May be filtered to eligible airlines only. */
  getRoutes(): Promise<Route[]>;
  /** True if this provider supplies real-time or near-real-time data */
  isLive(): boolean;
}

/**
 * Static provider — reads from the bundled routes.json file.
 * Fallback when no API key is configured.
 */
class StaticRouteDataProvider implements RouteDataProviderInterface {
  private eligibleCodes: Set<string>;

  constructor() {
    this.eligibleCodes = new Set(
      getAllEligibleAirlines().map((a) => a.code.toUpperCase())
    );
  }

  async getRoutes(): Promise<Route[]> {
    return rawRoutes.filter((r) =>
      this.eligibleCodes.has(r.airlineCode.toUpperCase())
    );
  }

  isLive(): boolean {
    return false;
  }
}

// ── Auto-select provider at module load time ───────────────────────────────
// Dynamic import keeps the live provider out of the bundle when not needed.
async function createProvider(): Promise<RouteDataProviderInterface> {
  if (process.env.AVIATIONSTACK_API_KEY) {
    try {
      const { LiveRouteDataProvider } = await import('./liveRouteDataProvider');
      return new LiveRouteDataProvider();
    } catch (err) {
      console.warn('[routeDataProvider] Failed to load live provider, falling back to static:', err);
    }
  }
  return new StaticRouteDataProvider();
}

let _providerPromise: Promise<RouteDataProviderInterface> | null = null;

function getProvider(): Promise<RouteDataProviderInterface> {
  if (!_providerPromise) _providerPromise = createProvider();
  return _providerPromise;
}

/**
 * The active route data provider.
 * Usage: const routes = await routeDataProvider.getRoutes();
 */
export const routeDataProvider: RouteDataProviderInterface = {
  async getRoutes() {
    const p = await getProvider();
    return p.getRoutes();
  },
  isLive() {
    // We can't know synchronously; the search engine checks mode after routes load.
    return !!process.env.AVIATIONSTACK_API_KEY;
  },
};
