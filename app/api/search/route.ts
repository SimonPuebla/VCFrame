/**
 * POST /api/search
 * Main route search endpoint.
 *
 * Body: SearchRequest JSON
 * Returns: SearchResponse JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SearchRequest } from '@/types';
import { search } from '@/lib/routing/searchEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as SearchRequest;

    if (!body.origin || !body.destination) {
      return NextResponse.json(
        { error: 'origin and destination are required' },
        { status: 400 }
      );
    }

    const result = await search(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/search]', err);
    return NextResponse.json(
      { error: 'Internal search error. Please try again.' },
      { status: 500 }
    );
  }
}
