/**
 * Route Scorer
 *
 * Converts a RawPath into a fully scored RankedRoute.
 * Scoring is penalty-based: lower total score = better route.
 *
 * Configurable weights are defined in SCORE_CONFIG — tweak values
 * without touching algorithm logic.
 *
 * Practicality labels reflect staff-travel realities (no confirmed seats).
 */

import type {
  RankedRoute,
  RouteSegment,
  ScoreBreakdown,
  PracticalityLabel,
  RouteTag,
  SearchMode,
} from '@/types';
import type { RawPath } from '@/lib/routing/pathfinder';
import { getAirport, distanceKm } from '@/lib/normalization/airportResolver';
import { airlineName } from '@/lib/normalization/airlineNormalizer';

// ── Scoring configuration (all values are penalty weights) ─────────────────
const SCORE_CONFIG = {
  // Per-minute penalty for total journey duration (normalised to hours)
  durationPenaltyPerHour: 10,

  // Penalty per stop beyond the first
  stopPenaltyBase: 40,

  // Layover penalties (per connection)
  layoverTooShortThreshold: 60,    // minutes — under this is risky
  layoverTooShortPenalty: 80,
  layoverOvernightThreshold: 480,  // minutes — over this is an overnight wait
  layoverOvernightPenalty: 120,
  layoverIdealMin: 60,
  layoverIdealMax: 240,
  layoverOutsideIdealPenalty: 20,  // per connection outside ideal window

  // Detour penalty: ratio of actual path distance vs great-circle
  detourRatioThreshold: 1.4,       // 40% longer than direct is acceptable
  detourPenaltyPerTenPercent: 15,

  // Number of airlines involved
  multiAirlinePenaltyPerExtra: 25,

  // Preferred airline reward
  preferredAirlineReward: -30,     // negative = reward (lowers score)

  // Frequency penalty: low-frequency routes add risk
  lowFrequencyThreshold: 3,        // flights per week
  lowFrequencyPenalty: 30,
};

// Default assumed layover per connection when no schedule data available
const ASSUMED_LAYOVER_MINUTES = 90;

/**
 * Score a single RawPath and return a fully populated RankedRoute.
 */
export function scorePath(
  path: RawPath,
  mode: SearchMode,
  preferredAirlines: Set<string>,
  requestId: string,
  pathIndex: number
): RankedRoute {
  const { airports, edges } = path;
  const stopCount = edges.length - 1; // stops = connections (not segments)

  // ── Build segments ────────────────────────────────────────────────────────
  const segments: RouteSegment[] = edges.map((edge) => ({
    airlineCode: edge.airlineCode,
    airlineName: airlineName(edge.airlineCode),
    originIata: edge.destinationIata === airports[airports.indexOf(edge.destinationIata)]
      ? airports[airports.indexOf(edge.destinationIata) - 1]
      : edge.destinationIata,
    destinationIata: edge.destinationIata,
    originCity: getAirport(airports[edges.indexOf(edge)])?.city ?? airports[edges.indexOf(edge)],
    destinationCity: getAirport(edge.destinationIata)?.city ?? edge.destinationIata,
    durationMinutes: edge.durationMinutes,
  }));

  // Fix: set origins correctly using the airports array
  for (let i = 0; i < edges.length; i++) {
    segments[i].originIata = airports[i];
    segments[i].destinationIata = airports[i + 1];
    segments[i].originCity = getAirport(airports[i])?.city ?? airports[i];
    segments[i].destinationCity = getAirport(airports[i + 1])?.city ?? airports[i + 1];
  }

  // ── Total durations ───────────────────────────────────────────────────────
  const totalFlightMinutes = path.totalFlightMinutes;
  const totalLayoverMinutes = stopCount >= 0 ? ASSUMED_LAYOVER_MINUTES * stopCount : 0;
  const totalDurationMinutes = totalFlightMinutes + totalLayoverMinutes;

  // ── Score breakdown ───────────────────────────────────────────────────────
  const breakdown: ScoreBreakdown = {
    baseDurationPenalty: 0,
    stopPenalty: 0,
    layoverPenalty: 0,
    detourPenalty: 0,
    overnightPenalty: 0,
    riskPenalty: 0,
    airlineCountPenalty: 0,
    total: 0,
  };

  // 1. Duration penalty (in hours)
  breakdown.baseDurationPenalty = Math.round(
    (totalDurationMinutes / 60) * SCORE_CONFIG.durationPenaltyPerHour
  );

  // 2. Stop penalty
  breakdown.stopPenalty = stopCount * SCORE_CONFIG.stopPenaltyBase;

  // 3. Layover penalty per connection
  let layoverPenalty = 0;
  for (let i = 0; i < stopCount; i++) {
    const layover = ASSUMED_LAYOVER_MINUTES; // static estimate; live mode uses real gaps
    if (layover < SCORE_CONFIG.layoverTooShortThreshold) {
      layoverPenalty += SCORE_CONFIG.layoverTooShortPenalty;
    } else if (layover > SCORE_CONFIG.layoverOvernightThreshold) {
      layoverPenalty += SCORE_CONFIG.layoverOvernightPenalty;
    } else if (
      layover < SCORE_CONFIG.layoverIdealMin ||
      layover > SCORE_CONFIG.layoverIdealMax
    ) {
      layoverPenalty += SCORE_CONFIG.layoverOutsideIdealPenalty;
    }
  }
  breakdown.layoverPenalty = layoverPenalty;

  // 4. Detour penalty (compare total path distance vs direct great-circle)
  const origin = getAirport(airports[0]);
  const destination = getAirport(airports[airports.length - 1]);
  let detourPenalty = 0;
  if (origin && destination && airports.length > 2) {
    const directKm = distanceKm(origin, destination);
    let pathKm = 0;
    for (let i = 0; i < airports.length - 1; i++) {
      const a = getAirport(airports[i]);
      const b = getAirport(airports[i + 1]);
      if (a && b) pathKm += distanceKm(a, b);
    }
    const detourRatio = directKm > 0 ? pathKm / directKm : 1;
    if (detourRatio > SCORE_CONFIG.detourRatioThreshold) {
      const excessTenPercents = Math.floor(
        (detourRatio - SCORE_CONFIG.detourRatioThreshold) * 10
      );
      detourPenalty = excessTenPercents * SCORE_CONFIG.detourPenaltyPerTenPercent;
    }
  }
  breakdown.detourPenalty = detourPenalty;

  // 5. Overnight penalty (assumed if layover > 8h)
  let overnightPenalty = 0;
  for (let i = 0; i < stopCount; i++) {
    if (ASSUMED_LAYOVER_MINUTES > SCORE_CONFIG.layoverOvernightThreshold) {
      overnightPenalty += SCORE_CONFIG.layoverOvernightPenalty;
    }
  }
  breakdown.overnightPenalty = overnightPenalty;

  // 6. Risk penalty: low-frequency segments
  let riskPenalty = 0;
  for (const edge of edges) {
    if ((edge.frequencyPerWeek ?? 7) < SCORE_CONFIG.lowFrequencyThreshold) {
      riskPenalty += SCORE_CONFIG.lowFrequencyPenalty;
    }
  }
  // Apply preferred airline reward
  for (const edge of edges) {
    if (preferredAirlines.has(edge.airlineCode.toUpperCase())) {
      riskPenalty += SCORE_CONFIG.preferredAirlineReward;
    }
  }
  breakdown.riskPenalty = riskPenalty;

  // 7. Multi-airline penalty
  const uniqueAirlines = new Set(edges.map((e) => e.airlineCode));
  breakdown.airlineCountPenalty =
    Math.max(0, uniqueAirlines.size - 1) * SCORE_CONFIG.multiAirlinePenaltyPerExtra;

  // Total score
  breakdown.total =
    breakdown.baseDurationPenalty +
    breakdown.stopPenalty +
    breakdown.layoverPenalty +
    breakdown.detourPenalty +
    breakdown.overnightPenalty +
    breakdown.riskPenalty +
    breakdown.airlineCountPenalty;

  // ── Practicality label ────────────────────────────────────────────────────
  const practicalityLabel = derivePracticality(
    stopCount,
    uniqueAirlines.size,
    edges,
    breakdown.total
  );

  // ── Explanation ───────────────────────────────────────────────────────────
  const explanation = buildExplanation(
    airports,
    segments,
    stopCount,
    totalDurationMinutes,
    uniqueAirlines,
    breakdown,
    practicalityLabel
  );

  return {
    id: `${requestId}-${pathIndex}`,
    segments,
    airportSequence: airports,
    airlineSequence: [...uniqueAirlines],
    stopCount,
    totalDurationMinutes,
    totalLayoverMinutes,
    mode,
    score: breakdown.total,
    practicalityLabel,
    tags: [], // assigned by ranker
    explanation,
    scoreBreakdown: breakdown,
  };
}

function derivePracticality(
  stopCount: number,
  airlineCount: number,
  edges: { frequencyPerWeek: number }[],
  totalScore: number
): PracticalityLabel {
  const avgFrequency =
    edges.reduce((s, e) => s + (e.frequencyPerWeek ?? 5), 0) / edges.length;

  if (stopCount === 0 && avgFrequency >= 5) return 'Very Practical';
  if (stopCount <= 1 && airlineCount <= 2 && avgFrequency >= 4) return 'Practical';
  if (stopCount <= 2 && totalScore < 400) return 'Practical';
  if (stopCount <= 2) return 'Riskier';
  return 'High Risk Backup';
}

function buildExplanation(
  airports: string[],
  segments: RouteSegment[],
  stopCount: number,
  totalMinutes: number,
  airlines: Set<string>,
  breakdown: ScoreBreakdown,
  label: PracticalityLabel
): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const route = airports.join(' → ');
  const airlineList = segments.map((s) => s.airlineName).join(', ');
  const stopText = stopCount === 0 ? 'non-stop' : `${stopCount} stop${stopCount > 1 ? 's' : ''}`;

  let reason = `${route} via ${airlineList}. `;
  reason += `${stopText}, estimated total journey ${hours}h ${mins}m. `;

  if (breakdown.detourPenalty > 0) {
    reason += 'Route involves some geographic detour. ';
  }
  if (breakdown.riskPenalty > 40) {
    reason += 'Some segments have lower weekly frequency — allow flexibility. ';
  }
  if (breakdown.stopPenalty === 0) {
    reason += 'Direct routing minimises connection risk for staff travel. ';
  }
  if (airlines.size > 2) {
    reason += 'Multiple airlines involved — ensure each segment is individually ticketed. ';
  }

  reason += `Practicality: ${label}.`;
  return reason;
}
