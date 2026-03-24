'use client';

import { useState, useEffect } from 'react';
import AirportInput from './AirportInput';
import type { SearchRequest, Airline } from '@/types';

interface Props {
  onSearch: (req: SearchRequest) => void;
  loading: boolean;
  initialValues?: Partial<SearchRequest>;
}

export default function SearchForm({ onSearch, loading, initialValues }: Props) {
  const [origin, setOrigin] = useState(initialValues?.origin ?? '');
  const [destination, setDestination] = useState(initialValues?.destination ?? '');
  const [date, setDate] = useState(initialValues?.date ?? '');
  const [maxStops, setMaxStops] = useState<string>(
    initialValues?.maxStops != null ? String(initialValues.maxStops) : '3'
  );
  const [minLayover, setMinLayover] = useState<string>(
    initialValues?.minLayoverMinutes != null ? String(initialValues.minLayoverMinutes) : '45'
  );
  const [maxLayover, setMaxLayover] = useState<string>(
    initialValues?.maxLayoverMinutes != null ? String(initialValues.maxLayoverMinutes) : '480'
  );
  const [preferredAirlines, setPreferredAirlines] = useState<string[]>(
    initialValues?.preferredAirlines ?? []
  );
  const [avoidAirports, setAvoidAirports] = useState(
    (initialValues?.avoidAirports ?? []).join(', ')
  );
  const [avoidCountries, setAvoidCountries] = useState(
    (initialValues?.avoidCountries ?? []).join(', ')
  );
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load eligible airlines for the filter dropdown
  useEffect(() => {
    fetch('/api/airlines')
      .then((r) => r.json())
      .then((data: Airline[]) => setAirlines(data))
      .catch(() => {});
  }, []);

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;

    const req: SearchRequest = {
      origin: origin.trim(),
      destination: destination.trim(),
      date: date || undefined,
      maxStops: maxStops ? parseInt(maxStops) : 3,
      minLayoverMinutes: minLayover ? parseInt(minLayover) : 45,
      maxLayoverMinutes: maxLayover ? parseInt(maxLayover) : 480,
      preferredAirlines: preferredAirlines.length > 0 ? preferredAirlines : undefined,
      avoidAirports: avoidAirports
        ? avoidAirports.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
        : undefined,
      avoidCountries: avoidCountries
        ? avoidCountries.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    };
    onSearch(req);
  };

  const toggleAirline = (code: string) => {
    setPreferredAirlines((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">

      {/* Origin / Destination */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <AirportInput
            id="origin"
            label="From"
            value={origin}
            onChange={setOrigin}
            placeholder="City or IATA (e.g. Buenos Aires, EZE)"
          />
        </div>

        <button
          type="button"
          onClick={swap}
          title="Swap origin and destination"
          className="mb-0.5 p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50
                     hover:text-gray-900 transition-colors flex-shrink-0"
        >
          ⇄
        </button>

        <div className="flex-1">
          <AirportInput
            id="destination"
            label="To"
            value={destination}
            onChange={setDestination}
            placeholder="City or IATA (e.g. Madrid, MAD)"
          />
        </div>
      </div>

      {/* Departure date + Max stops */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Departure date (optional)
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label htmlFor="maxStops" className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Max stops
          </label>
          <select
            id="maxStops"
            value={maxStops}
            onChange={(e) => setMaxStops(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="0">Non-stop only</option>
            <option value="1">Up to 1 stop</option>
            <option value="2">Up to 2 stops</option>
            <option value="3">Up to 3 stops</option>
          </select>
        </div>
      </div>

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-xs text-gray-500 hover:text-gray-900 underline-offset-2 hover:underline transition-colors"
      >
        {showAdvanced ? '▲ Hide advanced options' : '▼ Show advanced options (layover, airlines, avoid)'}
      </button>

      {showAdvanced && (
        <div className="space-y-4 pt-1">
          {/* Layover */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="minLayover" className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Min layover (minutes)
              </label>
              <input
                id="minLayover"
                type="number"
                min="30"
                max="600"
                value={minLayover}
                onChange={(e) => setMinLayover(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label htmlFor="maxLayover" className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Max layover (minutes)
              </label>
              <input
                id="maxLayover"
                type="number"
                min="30"
                max="2880"
                value={maxLayover}
                onChange={(e) => setMaxLayover(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Preferred airlines */}
          {airlines.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Preferred airlines (optional — boosts ranking)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 border border-gray-100 rounded-lg bg-gray-50">
                {airlines.map((a) => (
                  <button
                    key={a.code}
                    type="button"
                    onClick={() => toggleAirline(a.code)}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${
                      preferredAirlines.includes(a.code)
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Avoid airports */}
          <div>
            <label htmlFor="avoidAirports" className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Avoid airports (IATA codes, comma-separated)
            </label>
            <input
              id="avoidAirports"
              type="text"
              value={avoidAirports}
              onChange={(e) => setAvoidAirports(e.target.value)}
              placeholder="e.g. CDG, FCO"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Avoid countries */}
          <div>
            <label htmlFor="avoidCountries" className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Avoid countries (comma-separated)
            </label>
            <input
              id="avoidCountries"
              type="text"
              value={avoidCountries}
              onChange={(e) => setAvoidCountries(e.target.value)}
              placeholder="e.g. Russia, Belarus"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>
      )}

      {/* Search button */}
      <button
        type="submit"
        disabled={loading || !origin.trim() || !destination.trim()}
        className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium
                   hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Searching routes...' : 'Find eligible routes →'}
      </button>
    </form>
  );
}
