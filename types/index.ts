// ============================================================
// CORE DATA TYPES — ZED Route Finder
// ============================================================

/** An airline eligible (or ineligible) under the ZED package */
export interface Airline {
  code: string;          // IATA 2-letter carrier code
  name: string;          // Canonical display name
  aliases: string[];     // Alternative spellings / names for normalization
  active: boolean;       // Whether currently in the agreement
  eligible: boolean;     // Eligible for ZED routing
  hub?: string[];        // Main hub airports (IATA)
  notes?: string;
}

/** An airport node in the route graph */
export interface Airport {
  iata: string;
  icao?: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;  // ISO 2-letter
  latitude: number;
  longitude: number;
  timezone?: string;
  isHub?: boolean;
}

/** A route edge: one airline operating one city-pair */
export interface Route {
  airlineCode: string;
  originIata: string;
  destinationIata: string;
  frequencyPerWeek?: number;    // 1–7, or 0 if seasonal only
  seasonal: boolean;
  typicalDurationMinutes?: number;  // estimated flight time
  source: 'static' | 'api' | 'manual';
}

/** A concrete flight option with schedule data */
export interface FlightOption {
  airlineCode: string;
  flightNumber: string;
  originIata: string;
  destinationIata: string;
  departureTime: string;  // HH:MM local
  arrivalTime: string;    // HH:MM local
  operatingDays: number[]; // 1=Mon … 7=Sun
  durationMinutes: number;
  source: 'static' | 'api';
}

/** Config entry for an eligible airline (editable without code changes) */
export interface EligibleAirlineConfig {
  name: string;
  code: string;
  aliases: string[];
  active: boolean;
  notes?: string;
}

// ============================================================
// SEARCH
// ============================================================

export interface SearchRequest {
  origin: string;              // IATA code or city name
  destination: string;         // IATA code or city name
  date?: string;               // YYYY-MM-DD (optional)
  maxStops?: number;           // default 3
  minLayoverMinutes?: number;  // default 45
  maxLayoverMinutes?: number;  // default 1440 (24h)
  preferredAirlines?: string[]; // airline codes or names
  avoidAirports?: string[];    // IATA codes
  avoidCountries?: string[];   // ISO country codes
}

export type SearchMode = 'route-network' | 'live-schedule';

// ============================================================
// ROUTING
// ============================================================

export interface RouteSegment {
  airlineCode: string;
  airlineName: string;
  originIata: string;
  destinationIata: string;
  originCity: string;
  destinationCity: string;
  durationMinutes: number;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
}

export type PracticalityLabel =
  | 'Very Practical'
  | 'Practical'
  | 'Riskier'
  | 'High Risk Backup';

export type RouteTag = 'Best Overall' | 'Most Direct' | 'Lowest Connection Risk' | 'Backup Option';

export interface RankedRoute {
  id: string;
  segments: RouteSegment[];
  airportSequence: string[];      // IATA codes
  airlineSequence: string[];      // airline codes
  stopCount: number;
  totalDurationMinutes: number;
  totalLayoverMinutes: number;
  mode: SearchMode;
  score: number;                  // lower = better (penalty-based)
  practicalityLabel: PracticalityLabel;
  tags: RouteTag[];
  explanation: string;
  scoreBreakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  baseDurationPenalty: number;
  stopPenalty: number;
  layoverPenalty: number;
  detourPenalty: number;
  overnightPenalty: number;
  riskPenalty: number;
  airlineCountPenalty: number;
  total: number;
}

// ============================================================
// API RESPONSE SHAPES
// ============================================================

export interface SearchResponse {
  mode: SearchMode;
  originAirports: Airport[];
  destinationAirports: Airport[];
  routes: RankedRoute[];
  totalFound: number;
  warning: string;
  searchedAt: string;
}

export interface AirportSuggestion {
  iata: string;
  name: string;
  city: string;
  country: string;
}
