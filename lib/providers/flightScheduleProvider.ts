/**
 * Flight Schedule Provider
 * Supplies concrete flight options for a specific date.
 *
 * Currently returns an empty result (no live data), which causes the
 * routing engine to fall back to Route Network Mode automatically.
 *
 * TODO: To plug in a live flight schedule API (e.g. OAG Schedules,
 *   Cirium Schedules, AviationStack):
 *   1. Implement FlightScheduleProviderInterface below.
 *   2. Replace `flightScheduleProvider` export with your live instance.
 *   3. Return FlightOption[] for the requested date and route.
 */

import type { FlightOption } from '@/types';

export interface FlightScheduleProviderInterface {
  /**
   * Return concrete flight options for a given city-pair and date.
   * Return [] if the provider has no data → triggers route-network fallback.
   */
  getFlights(
    originIata: string,
    destinationIata: string,
    date: string // YYYY-MM-DD
  ): Promise<FlightOption[]>;

  /** True when connected to live data */
  isLive(): boolean;
}

class NoopScheduleProvider implements FlightScheduleProviderInterface {
  async getFlights(): Promise<FlightOption[]> {
    return []; // No live data yet — will trigger route-network fallback
  }
  isLive(): boolean {
    return false;
  }
}

// ── Default export: replace with live provider when available ──────────────
export const flightScheduleProvider: FlightScheduleProviderInterface =
  new NoopScheduleProvider();
