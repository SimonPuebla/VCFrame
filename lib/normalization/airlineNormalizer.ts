/**
 * Airline Normalizer
 * Converts any airline name/alias/code variant into a canonical record.
 * Driven entirely by /config/eligible-airlines.json — no code changes needed
 * when the ZED agreement updates.
 */

import type { EligibleAirlineConfig, Airline } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawConfig = require('@/config/eligible-airlines.json') as {
  airlines: EligibleAirlineConfig[];
};

/** Normalise a string for fuzzy matching: lowercase, strip accents, collapse spaces */
function normalise(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build lookup maps once at module load time
const byCode = new Map<string, EligibleAirlineConfig>();
const byNormalisedName = new Map<string, EligibleAirlineConfig>();

for (const airline of rawConfig.airlines) {
  byCode.set(airline.code.toUpperCase(), airline);
  byNormalisedName.set(normalise(airline.name), airline);
  for (const alias of airline.aliases) {
    byNormalisedName.set(normalise(alias), airline);
  }
}

/**
 * Look up an airline by IATA code, name, or any known alias.
 * Returns null if no match found.
 */
export function findAirline(query: string): EligibleAirlineConfig | null {
  if (!query) return null;
  const trimmed = query.trim();

  // Exact code match
  const byCodeResult = byCode.get(trimmed.toUpperCase());
  if (byCodeResult) return byCodeResult;

  // Exact normalised name/alias match
  const normQ = normalise(trimmed);
  const exactMatch = byNormalisedName.get(normQ);
  if (exactMatch) return exactMatch;

  // Partial/substring match (tolerant)
  for (const [key, airline] of byNormalisedName) {
    if (key.includes(normQ) || normQ.includes(key)) {
      return airline;
    }
  }

  return null;
}

/** Returns true if the query resolves to an active+eligible airline */
export function isEligible(query: string): boolean {
  const airline = findAirline(query);
  return airline !== null && airline.active;
}

/** Return all active eligible airlines as Airline records */
export function getAllEligibleAirlines(): Airline[] {
  return rawConfig.airlines
    .filter((a) => a.active)
    .map((a) => ({
      code: a.code,
      name: a.name,
      aliases: a.aliases,
      active: a.active,
      eligible: true,
      notes: a.notes,
    }));
}

/** Return airline display name for a code */
export function airlineName(code: string): string {
  const found = byCode.get(code.toUpperCase());
  return found ? found.name : code;
}
