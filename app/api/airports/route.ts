/**
 * GET /api/airports?q=<query>
 * Airport autocomplete endpoint.
 * Returns up to 8 matching airports for the given query.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAirports, toSuggestions } from '@/lib/normalization/airportResolver';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const airports = resolveAirports(q).slice(0, 8);
  return NextResponse.json(toSuggestions(airports));
}
