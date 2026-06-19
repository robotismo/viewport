import type { Destination } from '../core/types';
import { sol } from './sol';
import { sun } from './sun';
import { earthlike } from './earthlike';
import { saturn } from './saturn';
import { nebula } from './nebula';

// Ordered for the nav console.
export const destinations: Destination[] = [sol, sun, earthlike, saturn, nebula];

const byId = new Map(destinations.map((d) => [d.id, d]));

export function getDestination(id: string): Destination {
  const d = byId.get(id);
  if (!d) throw new Error(`Unknown destination: ${id}`);
  return d;
}

export function hasDestination(id: string): boolean {
  return byId.has(id);
}

export const DEFAULT_DESTINATION = sol.id;
