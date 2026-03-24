'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { AirportSuggestion } from '@/types';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id: string;
}

export default function AirportInput({ label, value, onChange, placeholder, id }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AirportSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/airports?q=${encodeURIComponent(q)}`);
      const data: AirportSuggestion[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    onChange(q); // keep parent in sync with raw text too
    setOpen(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 220);
  };

  const handleSelect = (s: AirportSuggestion) => {
    const display = `${s.city} (${s.iata})`;
    setQuery(display);
    onChange(s.iata); // pass IATA code to parent for search
    setSuggestions([]);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder ?? 'City or IATA code'}
          autoComplete="off"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                     placeholder:text-gray-400"
        />
        {loading && (
          <span className="absolute right-3 top-3 h-4 w-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li
              key={s.iata}
              onMouseDown={() => handleSelect(s)}
              className="px-3 py-2.5 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {s.iata}
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{s.city}</div>
                  <div className="text-xs text-gray-400">{s.name}, {s.country}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
