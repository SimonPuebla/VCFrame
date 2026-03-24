/**
 * Airport Resolver
 * Resolves city names, airport names, or IATA codes → Airport records.
 * Data is loaded from /data/airports.json (static; swap for API later).
 *
 * TODO: To add live airport data, replace the require() below with
 *       a call to your preferred aviation API (e.g. AviationStack, OAG)
 *       and implement the same AirportResolver interface.
 */

import type { Airport, AirportSuggestion } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawAirports: Airport[] = require('@/data/airports.json');

function normalise(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Index maps built once at module load
const byIata = new Map<string, Airport>();
const byCityNorm = new Map<string, Airport[]>();
const byNameNorm = new Map<string, Airport>();

for (const ap of rawAirports) {
  byIata.set(ap.iata.toUpperCase(), ap);

  const normName = normalise(ap.name);
  byNameNorm.set(normName, ap);

  const normCity = normalise(ap.city);
  const cityList = byCityNorm.get(normCity) ?? [];
  cityList.push(ap);
  byCityNorm.set(normCity, cityList);
}

/**
 * Resolve a user query (IATA code, city, or airport name) to a list of
 * matching Airport records. Returns multiple when a city has many airports.
 */
export function resolveAirports(query: string): Airport[] {
  if (!query || query.trim().length < 2) return [];
  const trimmed = query.trim();

  // Exact IATA code (3 letters)
  if (/^[A-Za-z]{3}$/.test(trimmed)) {
    const match = byIata.get(trimmed.toUpperCase());
    if (match) return [match];
  }

  const normQ = normalise(trimmed);

  // Exact city match
  const cityMatch = byCityNorm.get(normQ);
  if (cityMatch && cityMatch.length > 0) return cityMatch;

  // Exact airport name match
  const nameMatch = byNameNorm.get(normQ);
  if (nameMatch) return [nameMatch];

  // Partial match on city
  const partialCity: Airport[] = [];
  for (const [key, airports] of byCityNorm) {
    if (key.includes(normQ) || normQ.includes(key)) {
      partialCity.push(...airports);
    }
  }
  if (partialCity.length > 0) return partialCity;

  // Partial match on name
  const partialName: Airport[] = [];
  for (const [key, airport] of byNameNorm) {
    if (key.includes(normQ) || normQ.includes(key)) {
      partialName.push(airport);
    }
  }
  return partialName;
}

/** Get a single airport by IATA code, or null */
export function getAirport(iata: string): Airport | null {
  return byIata.get(iata.toUpperCase()) ?? null;
}

/** Get all airports */
export function getAllAirports(): Airport[] {
  return rawAirports;
}

/**
 * Convert airports to lightweight suggestion objects for autocomplete UI.
 */
export function toSuggestions(airports: Airport[]): AirportSuggestion[] {
  return airports.map((ap) => ({
    iata: ap.iata,
    name: ap.name,
    city: ap.city,
    country: ap.country,
  }));
}

/**
 * Haversine distance in km between two airports.
 * Used by the routing engine to compute detour factors.
 */
export function distanceKm(a: Airport, b: Airport): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const x =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
