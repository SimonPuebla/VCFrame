/**
 * GET /api/airports?q=<query>
 * Airport autocomplete endpoint.
 *
 * Data source (auto-selected):
 *   - AVIATIONSTACK_API_KEY set → Aviationstack /v1/airports (10,000+ airports, cached 24h)
 *   - No key                   → Static airports.json (~100 major airports, instant)
 *
 * Returns up to 8 matching airports as AirportSuggestion[].
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAirports, toSuggestions } from '@/lib/normalization/airportResolver';
import type { AirportSuggestion } from '@/types';

async function liveSearch(q: string): Promise<AirportSuggestion[]> {
  const { searchAirports } = await import('@/lib/providers/aviationstackClient');
  const results = await searchAirports(q);
  return results.slice(0, 8).map((a) => ({
    iata: a.iata_code,
    name: a.airport_name,
    city: a.airport_name, // Aviationstack doesn't always return a separate city field
    country: a.country_name,
  }));
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) {
    return NextResponse.json([]);
  }

  // Live search if API key is set
  if (process.env.AVIATIONSTACK_API_KEY) {
    try {
      const suggestions = await liveSearch(q.trim());
      // If live returns results, prefer them; otherwise fall through to static
      if (suggestions.length > 0) {
        return NextResponse.json(suggestions);
      }
    } catch (err) {
      console.warn('[/api/airports] Live search failed, falling back to static:', err);
    }
  }

  // Static fallback
  const airports = resolveAirports(q).slice(0, 8);
  return NextResponse.json(toSuggestions(airports));
}
