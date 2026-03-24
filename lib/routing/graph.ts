/**
 * Route Graph
 * Builds an adjacency list from Route records.
 * Airports = nodes, Routes = directed edges.
 */

import type { Route } from '@/types';

export interface GraphEdge {
  airlineCode: string;
  destinationIata: string;
  durationMinutes: number;
  frequencyPerWeek: number;
}

export type RouteGraph = Map<string, GraphEdge[]>;

/**
 * Build a directed graph from a flat list of routes.
 * Each node key is the origin IATA; value is an array of outbound edges.
 */
export function buildGraph(routes: Route[]): RouteGraph {
  const graph: RouteGraph = new Map();

  for (const route of routes) {
    const origin = route.originIata.toUpperCase();
    const destination = route.destinationIata.toUpperCase();

    if (!graph.has(origin)) graph.set(origin, []);
    graph.get(origin)!.push({
      airlineCode: route.airlineCode,
      destinationIata: destination,
      durationMinutes: route.typicalDurationMinutes ?? 120,
      frequencyPerWeek: route.frequencyPerWeek ?? 5,
    });
  }

  return graph;
}

/**
 * Return all airport IATA codes present in the graph (both origins and destinations).
 */
export function allAirports(graph: RouteGraph): Set<string> {
  const set = new Set<string>();
  for (const [origin, edges] of graph) {
    set.add(origin);
    for (const e of edges) set.add(e.destinationIata);
  }
  return set;
}
