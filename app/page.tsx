'use client';

import { useState } from 'react';
import SearchForm from './components/SearchForm';
import ResultsPanel from './components/ResultsPanel';
import ZedInfoBox from './components/ZedInfoBox';
import type { SearchRequest, SearchResponse } from '@/types';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (req: SearchRequest) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Search failed. Please try again.');
        return;
      }

      const data: SearchResponse = await res.json();
      setResponse(data);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            ZED Route Finder
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Find the best routes using only your eligible ZED / staff-travel airlines.
          </p>
        </div>

        {/* Search form */}
        <SearchForm onSearch={handleSearch} loading={loading} />

        {/* ZED info box */}
        <ZedInfoBox />

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                    <div className="h-5 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-6 bg-gray-200 rounded w-16 ml-auto" />
                    <div className="h-3 bg-gray-200 rounded w-12 ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && response && <ResultsPanel response={response} />}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 pb-4">
          ZED Route Finder · Staff travel route planning tool ·{' '}
          Route Network Mode · Not a booking engine
        </footer>
      </div>
    </div>
  );
}
