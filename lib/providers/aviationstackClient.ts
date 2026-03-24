/**
 * Aviationstack API Client
 * Base HTTP client for all Aviationstack endpoints.
 * Docs: https://aviationstack.com/documentation
 *
 * Used endpoints:
 *   /v1/airports         — airport lookup/search (all plans)
 *   /v1/routes           — airline route network  (Basic plan+)
 *   /v1/flight_schedules — scheduled flights       (Basic plan+)
 *
 * All fetch() calls use Next.js Data Cache (next: { revalidate })
 * so responses are cached on Vercel and revalidated automatically.
 *
 * If AVIATIONSTACK_API_KEY is not set or a plan-limit error is returned,
 * callers fall back to static data — no crash, no blank screen.
 */

const BASE_URL = 'https://api.aviationstack.com/v1';

/** Thrown when the API key is missing or invalid */
export class AviationstackAuthError extends Error {}

/** Thrown when the current plan doesn't include the endpoint */
export class AviationstackPlanError extends Error {}

function getKey(): string {
  const key = process.env.AVIATIONSTACK_API_KEY;
  if (!key) throw new AviationstackAuthError('AVIATIONSTACK_API_KEY is not set');
  return key;
}

/**
 * Core fetch wrapper.
 * Uses Next.js's built-in Data Cache: responses are cached on Vercel
 * and reused across all serverless invocations until `revalidate` seconds pass.
 */
async function apiFetch<T>(
  endpoint: string,
  params: Record<string, string | number>,
  revalidateSeconds: number
): Promise<T> {
  const key = getKey();
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set('access_key', key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: revalidateSeconds },
  });

  if (!res.ok) {
    throw new Error(`Aviationstack HTTP ${res.status} for ${endpoint}`);
  }

  const json = await res.json() as { error?: { code?: string; message?: string }; data?: unknown } & T;

  // Aviationstack returns HTTP 200 even for errors — check the error field
  if (json.error) {
    const code = json.error.code ?? '';
    const msg = json.error.message ?? 'Unknown error';

    if (code === 'invalid_access_key' || code === 'missing_access_key') {
      throw new AviationstackAuthError(msg);
    }
    if (code === 'function_access_restricted') {
      throw new AviationstackPlanError(
        `This Aviationstack endpoint requires a higher plan: ${msg}`
      );
    }
    throw new Error(`Aviationstack API error (${code}): ${msg}`);
  }

  return json;
}

// ── Airport search ──────────────────────────────────────────────────────────

export interface AviationstackAirport {
  airport_name: string;
  iata_code: string;
  icao_code: string | null;
  latitude: string;
  longitude: string;
  country_name: string;
  country_iso2: string;
  timezone: string | null;
  city_iata_code: string | null;
}

interface AirportResponse {
  pagination: { total: number };
  data: AviationstackAirport[];
}

/**
 * Search airports by query string (city, name, or IATA code).
 * Cached for 24 hours — airport data rarely changes.
 */
export async function searchAirports(query: string): Promise<AviationstackAirport[]> {
  const result = await apiFetch<AirportResponse>(
    'airports',
    { search: query, limit: 10 },
    86400 // 24h cache
  );
  return result.data ?? [];
}

/**
 * Look up a single airport by IATA code.
 * Cached for 24 hours.
 */
export async function getAirportByIata(iata: string): Promise<AviationstackAirport | null> {
  const result = await apiFetch<AirportResponse>(
    'airports',
    { iata_code: iata.toUpperCase(), limit: 1 },
    86400
  );
  return result.data?.[0] ?? null;
}

// ── Routes ──────────────────────────────────────────────────────────────────

export interface AviationstackRoute {
  airline: { iata: string; name: string } | null;
  departure: { iata: string; airport: string; time: string | null } | null;
  arrival: { iata: string; airport: string; time: string | null } | null;
}

interface RouteResponse {
  pagination: { total: number; count: number; limit: number; offset: number };
  data: AviationstackRoute[];
}

/**
 * Fetch routes for a single airline IATA code.
 * Cached for 12 hours — route schedules change infrequently.
 * Uses pagination: fetches up to `pages` pages of `limit` routes each.
 */
export async function getRoutesForAirline(
  airlineIata: string,
  limit = 100,
  pages = 3
): Promise<AviationstackRoute[]> {
  const results: AviationstackRoute[] = [];

  for (let page = 0; page < pages; page++) {
    const offset = page * limit;
    const result = await apiFetch<RouteResponse>(
      'routes',
      { airline_iata: airlineIata.toUpperCase(), limit, offset },
      43200 // 12h cache
    );

    const batch = result.data ?? [];
    results.push(...batch);

    // Stop early if we got fewer than a full page
    if (batch.length < limit) break;
  }

  return results;
}

// ── Flight schedules ────────────────────────────────────────────────────────

export interface AviationstackSchedule {
  flight: { iata: string | null };
  airline: { iata: string; name: string } | null;
  departure: {
    iata: string;
    scheduled: string | null; // ISO datetime
    terminal: string | null;
  } | null;
  arrival: {
    iata: string;
    scheduled: string | null; // ISO datetime
    terminal: string | null;
  } | null;
}

interface ScheduleResponse {
  pagination: { total: number };
  data: AviationstackSchedule[];
}

/**
 * Fetch scheduled flights for an origin–destination pair on a specific date.
 * Cached for 1 hour.
 *
 * NOTE: This endpoint requires Basic plan or above on Aviationstack.
 * Returns [] if the plan doesn't support it (caller falls back to route-network mode).
 */
export async function getScheduledFlights(
  originIata: string,
  destinationIata: string,
  date: string // YYYY-MM-DD
): Promise<AviationstackSchedule[]> {
  const result = await apiFetch<ScheduleResponse>(
    'flight_schedules',
    {
      dep_iata: originIata.toUpperCase(),
      arr_iata: destinationIata.toUpperCase(),
      flight_date: date,
      limit: 100,
    },
    3600 // 1h cache
  );
  return result.data ?? [];
}
