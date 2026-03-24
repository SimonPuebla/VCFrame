/**
 * Route Data Provider
 * Supplies the routing engine with route (edge) data.
 *
 * Currently uses /data/routes.json (static mock data).
 *
 * TODO: To plug in a live schedule API (e.g. OAG, Cirium, FlightAware):
 *   1. Implement a class that satisfies the RouteDataProviderInterface below.
 *   2. Replace `staticProvider` with your live provider instance.
 *   3. The routing engine calls only `getRoutes()` — no other changes needed.
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
 * Only returns routes operated by currently active eligible airlines.
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

// ── Default export: swap this instance to plug in a live provider ──────────
export const routeDataProvider: RouteDataProviderInterface =
  new StaticRouteDataProvider();
