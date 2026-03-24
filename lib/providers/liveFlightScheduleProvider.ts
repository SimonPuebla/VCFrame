/**
 * Live Flight Schedule Provider
 * Uses Aviationstack /v1/flight_schedules for date-specific flight searches.
 * Requires Basic plan or above on Aviationstack.
 *
 * When this provider returns flights, the search engine switches to
 * 'live-schedule' mode and shows actual departure/arrival times.
 * If it returns [] (plan limit, no data), the engine falls back to
 * 'route-network' mode automatically.
 *
 * Each response is cached for 1 hour by Next.js Data Cache.
 */

import type { FlightOption } from '@/types';
import type { FlightScheduleProviderInterface } from './flightScheduleProvider';
import {
  getScheduledFlights,
  AviationstackPlanError,
  AviationstackAuthError,
} from './aviationstackClient';
import { getAllEligibleAirlines } from '@/lib/normalization/airlineNormalizer';

function parseDuration(dep: string | null, arr: string | null): number {
  if (!dep || !arr) return 120;
  const depMs = new Date(dep).getTime();
  const arrMs = new Date(arr).getTime();
  const diff = (arrMs - depMs) / 60000;
  return diff > 0 && diff < 1440 ? Math.round(diff) : 120;
}

function parseTime(iso: string | null): string {
  if (!iso) return '00:00';
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export class LiveFlightScheduleProvider implements FlightScheduleProviderInterface {
  private eligibleCodes: Set<string>;

  constructor() {
    this.eligibleCodes = new Set(
      getAllEligibleAirlines().map((a) => a.code.toUpperCase())
    );
  }

  async getFlights(
    originIata: string,
    destinationIata: string,
    date: string
  ): Promise<FlightOption[]> {
    try {
      const schedules = await getScheduledFlights(originIata, destinationIata, date);

      return schedules
        .filter((s) => {
          const code = s.airline?.iata?.toUpperCase();
          return code && this.eligibleCodes.has(code);
        })
        .map((s) => ({
          airlineCode: s.airline!.iata.toUpperCase(),
          flightNumber: s.flight?.iata ?? '',
          originIata: s.departure!.iata.toUpperCase(),
          destinationIata: s.arrival!.iata.toUpperCase(),
          departureTime: parseTime(s.departure?.scheduled ?? null),
          arrivalTime: parseTime(s.arrival?.scheduled ?? null),
          durationMinutes: parseDuration(
            s.departure?.scheduled ?? null,
            s.arrival?.scheduled ?? null
          ),
          operatingDays: [1, 2, 3, 4, 5, 6, 7], // schedule-specific; assume daily
          source: 'api' as const,
        }));
    } catch (err) {
      if (err instanceof AviationstackPlanError) {
        console.warn('[LiveFlightScheduleProvider] Plan does not support /v1/flight_schedules — falling back to route-network mode');
        return [];
      }
      if (err instanceof AviationstackAuthError) {
        console.warn('[LiveFlightScheduleProvider] Auth error — check AVIATIONSTACK_API_KEY');
        return [];
      }
      console.error('[LiveFlightScheduleProvider]', err);
      return [];
    }
  }

  isLive(): boolean {
    return true;
  }
}
