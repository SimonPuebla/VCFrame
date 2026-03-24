# ZED Route Finder

An intelligent, constrained route planner for staff travel / ZED interline tickets.

**This is not a booking engine.** It finds the smartest way to get from A to B using *only* the airlines eligible under your ZED/staff-travel package.

---

## What it does

Given an origin and destination, it searches all possible routes across the eligible airline network, scores them, and returns ranked options with:

- Airport sequence
- Airline per segment
- Estimated total journey time
- Stop count and layover details
- Route quality score and breakdown
- Staff-travel practicality label (Very Practical → High Risk Backup)
- Why a route ranks where it does

---

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No API keys or database setup required.

---

## How it works

### Architecture overview

```
User input (city/IATA)
      │
      ▼
AirportResolver (normalization/airportResolver.ts)
      │  Resolves city names and IATA codes → Airport records
      │
      ▼
RouteDataProvider (providers/routeDataProvider.ts)
      │  Loads eligible routes (currently from /data/routes.json)
      │
      ▼
Graph Builder (routing/graph.ts)
      │  Airports = nodes, routes = directed weighted edges
      │
      ▼
Pathfinder (routing/pathfinder.ts)
      │  DFS/BFS with depth limit, layover constraints, avoid filters
      │
      ▼
Scorer (scoring/scorer.ts)
      │  Penalty-based scoring per path
      │
      ▼
Ranker (scoring/ranker.ts)
      │  Sorts paths, assigns tags: Best Overall / Most Direct / etc.
      │
      ▼
API response → ResultsPanel UI
```

### Operational modes

| Mode | Description |
|------|-------------|
| **Route Network Mode** | Works from static route data. No live schedule needed. Returns valid theoretical routes. Always available. |
| **Live Schedule Mode** | Activated when a real FlightScheduleProvider returns data. Shows actual flights for a date. Falls back to Route Network Mode automatically. |

The current implementation runs in **Route Network Mode** (static data, no API keys needed).

---

## Route ranking model

All routes are scored with a **penalty system** — lower score = better route. Components:

| Component | What it penalises |
|-----------|------------------|
| Duration penalty | Total journey time (flight + layover) |
| Stop penalty | Each connection beyond the first |
| Layover penalty | Connections below 60 min (risky) or above 8 h (overnight) |
| Detour penalty | Routes 40%+ longer than great-circle distance |
| Overnight penalty | Layovers implying an overnight wait |
| Risk penalty | Low-frequency routes (< 3×/week) |
| Multi-airline penalty | Each additional airline beyond the first |

Preferred airlines receive a **score reward** (negative penalty) that boosts them in ranking without excluding other routes.

### Practicality labels

| Label | Meaning |
|-------|---------|
| Very Practical | Non-stop, frequent, single airline |
| Practical | 1 stop, ≤ 2 airlines, good frequency |
| Riskier | 2 stops or weaker connections |
| High Risk Backup | 3+ stops or complex multi-airline routing |

---

## What data is mock / static

| File | Contents | Real in production? |
|------|----------|---------------------|
| `/data/airports.json` | ~100 major airports with coordinates | Replace with full IATA database |
| `/data/routes.json` | ~200 hand-curated routes for eligible carriers | Replace with OAG/Cirium schedules |
| `/config/eligible-airlines.json` | 42 ZED-eligible airlines with codes and aliases | **Edit this file** to update the agreement |

---

## Where to plug APIs later

### 1. Full airport database

In `lib/normalization/airportResolver.ts`, replace the `require('@/data/airports.json')` with a call to an airport API (e.g. AviationStack `/airports`, OAG Airport Search). The function signature (`resolveAirports(query) → Airport[]`) stays the same.

### 2. Live route network

In `lib/providers/routeDataProvider.ts`, implement `RouteDataProviderInterface`:

```typescript
class LiveRouteProvider implements RouteDataProviderInterface {
  async getRoutes(): Promise<Route[]> {
    // Call OAG Schedules, Cirium, or FlightAware API
    // Map response to Route[] type
  }
  isLive() { return true; }
}

export const routeDataProvider = new LiveRouteProvider();
```

### 3. Live flight schedules (date-specific)

In `lib/providers/flightScheduleProvider.ts`, implement `FlightScheduleProviderInterface`:

```typescript
class LiveScheduleProvider implements FlightScheduleProviderInterface {
  async getFlights(origin, destination, date): Promise<FlightOption[]> {
    // Call AviationStack, OAG, or Amadeus Schedules API
  }
  isLive() { return true; }
}
```

When this returns data, the search engine automatically switches to **Live Schedule Mode** and shows actual flight times.

### 4. Seat availability probability (future)

A future `AvailabilityProvider` interface can be added to `lib/providers/`. It would accept an airline code + flight number + date and return a probability score. The scoring engine already has a `riskPenalty` slot where this can be wired in.

---

## Updating the eligible airlines list

Edit `/config/eligible-airlines.json` — no code changes needed:

```json
{
  "airlines": [
    {
      "code": "IB",
      "name": "Iberia",
      "aliases": ["Iberia", "Ibéria", "Iberia Airlines"],
      "active": true,
      "notes": "Spanish flag carrier, hub MAD"
    }
  ]
}
```

- Set `"active": false` to remove an airline from eligible routing without deleting it
- Add new entries when airlines join the agreement
- `aliases` are used for fuzzy name matching in search filters

---

## Project structure

```
/app
  /api/search          POST — main route search endpoint
  /api/airports        GET  — airport autocomplete
  /api/airlines        GET  — eligible airline list
  /components
    AirportInput.tsx   Autocomplete input with debounced API calls
    SearchForm.tsx     Main search form with all filters
    RouteCard.tsx      Single route result card with score breakdown
    ResultsPanel.tsx   Results list with summary header
    ZedInfoBox.tsx     ZED rules info panel (collapsible)
  page.tsx             Main page (search + results)
  layout.tsx           App shell

/lib
  /normalization
    airlineNormalizer.ts   Fuzzy airline name/code resolver
    airportResolver.ts     Airport search + haversine distance
  /providers
    routeDataProvider.ts      Route edge data (static → pluggable)
    flightScheduleProvider.ts Flight schedule data (noop → pluggable)
  /routing
    graph.ts           Build adjacency list from Route[]
    pathfinder.ts      DFS path enumeration with constraints
    searchEngine.ts    Search orchestrator

/lib/scoring
  scorer.ts     Score a raw path → RankedRoute
  ranker.ts     Sort + tag routes; UI badge colours

/types/index.ts        All shared TypeScript types
/config
  eligible-airlines.json   ZED airline agreement (edit to update)
/data
  airports.json   Static airport database
  routes.json     Static route network
```

---

## ZED package rules (informational)

- Unlimited nominative tickets valid 1 year from issuance
- Non-transferable — personal use only
- 23 kg checked baggage per ticket
- Flights subject to available space
- User pays only taxes and carrier fees
- Self-issued via myIDTravel platform
- Tickets changeable (date/flight) within 3 months of issuance
- Tickets cancellable within 1 month of issuance
- Airlines may enter/leave the agreement without notice
- Courtesy protocol and dress code required

---

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** — minimal utility-first styling
- **No database** — static JSON data, designed to swap in a DB layer later
- **No external APIs** — fully offline-capable in Route Network Mode
