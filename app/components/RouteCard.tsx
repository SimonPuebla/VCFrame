'use client';

import { useState } from 'react';
import type { RankedRoute } from '@/types';
import { tagColour, practicalityColour } from '@/lib/scoring/ranker';

interface Props {
  route: RankedRoute;
  expanded?: boolean;
}

function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function PracticalityDot({ label }: { label: string }) {
  const colours: Record<string, string> = {
    'Very Practical': 'bg-green-500',
    'Practical': 'bg-lime-500',
    'Riskier': 'bg-amber-500',
    'High Risk Backup': 'bg-red-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colours[label] ?? 'bg-gray-400'}`} />;
}

export default function RouteCard({ route, expanded: initialExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(initialExpanded);

  const stopLabel =
    route.stopCount === 0 ? 'Non-stop' : `${route.stopCount} stop${route.stopCount > 1 ? 's' : ''}`;

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden hover:border-gray-300 transition-colors">

      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">

          {/* Route and airline sequence */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {route.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-xs font-medium px-2 py-0.5 rounded border ${tagColour(tag)}`}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Airport sequence */}
            <div className="flex items-center gap-1 flex-wrap">
              {route.airportSequence.map((iata, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="font-mono font-bold text-base text-gray-900">{iata}</span>
                  {i < route.airportSequence.length - 1 && (
                    <span className="text-gray-300 text-sm">→</span>
                  )}
                </span>
              ))}
            </div>

            {/* City names */}
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 flex-wrap">
              {route.segments.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span>{seg.originCity}</span>
                  {i === route.segments.length - 1 && (
                    <>
                      <span className="text-gray-300">→</span>
                      <span>{seg.destinationCity}</span>
                    </>
                  )}
                  {i < route.segments.length - 1 && (
                    <span className="text-gray-300">→</span>
                  )}
                </span>
              ))}
            </div>

            {/* Airlines */}
            <div className="mt-2 flex flex-wrap gap-1">
              {route.segments.map((seg, i) => (
                <span
                  key={i}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium"
                >
                  {seg.airlineName}
                </span>
              ))}
            </div>
          </div>

          {/* Stats column */}
          <div className="text-right flex-shrink-0 space-y-1">
            <div className="text-lg font-bold text-gray-900">
              {fmtTime(route.totalDurationMinutes)}
            </div>
            <div className="text-xs text-gray-500">{stopLabel}</div>
            {route.stopCount > 0 && (
              <div className="text-xs text-gray-400">
                +{fmtTime(route.totalLayoverMinutes)} layover
              </div>
            )}
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <PracticalityDot label={route.practicalityLabel} />
              <span
                className={`text-xs px-2 py-0.5 rounded border font-medium ${practicalityColour(route.practicalityLabel)}`}
              >
                {route.practicalityLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Mode badge */}
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs px-2 py-0.5 rounded border font-mono ${
            route.mode === 'live-schedule'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            {route.mode === 'live-schedule' ? '● Live schedule' : '○ Route network'}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            {expanded ? 'Less detail ▲' : 'More detail ▼'}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">

          {/* Segment breakdown */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Segment breakdown
            </div>
            <div className="space-y-2">
              {route.segments.map((seg, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs font-semibold text-gray-400 w-6 text-center">
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-mono font-bold text-gray-900">{seg.originIata}</span>
                    <span className="text-gray-300">→</span>
                    <span className="font-mono font-bold text-gray-900">{seg.destinationIata}</span>
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{seg.airlineName}</span>
                  <span className="text-xs text-gray-400">{fmtTime(seg.durationMinutes)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score breakdown */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Score breakdown (lower = better)
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
              <span className="text-gray-400">Journey duration</span>
              <span>{route.scoreBreakdown.baseDurationPenalty}</span>
              <span className="text-gray-400">Stop penalty</span>
              <span>{route.scoreBreakdown.stopPenalty}</span>
              <span className="text-gray-400">Layover quality</span>
              <span>{route.scoreBreakdown.layoverPenalty}</span>
              <span className="text-gray-400">Detour</span>
              <span>{route.scoreBreakdown.detourPenalty}</span>
              <span className="text-gray-400">Overnight wait</span>
              <span>{route.scoreBreakdown.overnightPenalty}</span>
              <span className="text-gray-400">Risk / low frequency</span>
              <span>{route.scoreBreakdown.riskPenalty}</span>
              <span className="text-gray-400">Multi-airline</span>
              <span>{route.scoreBreakdown.airlineCountPenalty}</span>
              <span className="font-semibold text-gray-700 border-t border-gray-200 pt-1">Total score</span>
              <span className="font-semibold text-gray-900 border-t border-gray-200 pt-1">
                {route.scoreBreakdown.total}
              </span>
            </div>
          </div>

          {/* Explanation */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Why this route ranks here
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{route.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
