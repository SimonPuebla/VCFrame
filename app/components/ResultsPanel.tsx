'use client';

import type { SearchResponse } from '@/types';
import RouteCard from './RouteCard';

interface Props {
  response: SearchResponse;
}

export default function ResultsPanel({ response }: Props) {
  const { routes, mode, totalFound, warning, originAirports, destinationAirports } = response;

  const originLabel = originAirports.length > 0
    ? [...new Set(originAirports.map((a) => a.city))].join(' / ')
    : '?';
  const destLabel = destinationAirports.length > 0
    ? [...new Set(destinationAirports.map((a) => a.city))].join(' / ')
    : '?';

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {originLabel} → {destLabel}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalFound > 0
              ? `${totalFound} paths found, showing top ${routes.length}`
              : 'No eligible routes found'}
            {' · '}
            <span className={`font-mono ${mode === 'live-schedule' ? 'text-blue-600' : 'text-gray-400'}`}>
              {mode === 'live-schedule' ? 'Live schedule mode' : 'Route network mode'}
            </span>
          </p>
        </div>
      </div>

      {/* Warning banner */}
      {warning && (
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 leading-relaxed">
          {warning}
        </div>
      )}

      {/* No results */}
      {routes.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">✈</div>
          <p className="text-sm">No eligible routes found between these airports.</p>
          <p className="text-xs mt-1">Try allowing more stops, or check if a connecting hub is available.</p>
        </div>
      )}

      {/* Route cards — grouped by tag */}
      {routes.length > 0 && (
        <div className="space-y-3">
          {routes.map((route, i) => (
            <RouteCard
              key={route.id}
              route={route}
              expanded={i === 0} // auto-expand best route
            />
          ))}
        </div>
      )}
    </div>
  );
}
