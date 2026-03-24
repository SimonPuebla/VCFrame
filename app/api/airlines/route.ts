/**
 * GET /api/airlines
 * Returns the full list of currently eligible ZED airlines.
 * Used by the UI to populate the preferred-airlines filter.
 */

import { NextResponse } from 'next/server';
import { getAllEligibleAirlines } from '@/lib/normalization/airlineNormalizer';

export async function GET() {
  const airlines = getAllEligibleAirlines();
  return NextResponse.json(airlines);
}
