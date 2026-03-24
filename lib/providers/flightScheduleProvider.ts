/**
 * Flight Schedule Provider
 * Supplies concrete flight options for a specific date.
 *
 * Auto-selects:
 *   - AVIATIONSTACK_API_KEY set + Basic plan → LiveFlightScheduleProvider
 *   - No key, or Free plan → NoopScheduleProvider (triggers route-network fallback)
 *
 * Live provider uses Aviationstack /v1/flight_schedules (Basic plan+).
 * Returns [] on Free plan — the search engine falls back to route-network mode.
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
    return [];
  }
  isLive(): boolean {
    return false;
  }
}

async function createProvider(): Promise<FlightScheduleProviderInterface> {
  if (process.env.AVIATIONSTACK_API_KEY) {
    try {
      const { LiveFlightScheduleProvider } = await import('./liveFlightScheduleProvider');
      return new LiveFlightScheduleProvider();
    } catch (err) {
      console.warn('[flightScheduleProvider] Failed to load live provider:', err);
    }
  }
  return new NoopScheduleProvider();
}

let _providerPromise: Promise<FlightScheduleProviderInterface> | null = null;

export const flightScheduleProvider: FlightScheduleProviderInterface = {
  async getFlights(originIata, destinationIata, date) {
    if (!_providerPromise) _providerPromise = createProvider();
    const p = await _providerPromise;
    return p.getFlights(originIata, destinationIata, date);
  },
  isLive() {
    return !!process.env.AVIATIONSTACK_API_KEY;
  },
};
