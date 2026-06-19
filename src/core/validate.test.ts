import { describe, it, expect } from 'vitest';
import {
  destinations,
  getDestination,
  hasDestination,
  DEFAULT_DESTINATION,
} from '../destinations/registry';
import { validateDestination } from './validate';

describe('destination registry', () => {
  it('has destinations', () => {
    expect(destinations.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = destinations.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('default destination exists', () => {
    expect(hasDestination(DEFAULT_DESTINATION)).toBe(true);
  });

  it('getDestination throws on unknown id', () => {
    expect(() => getDestination('does-not-exist')).toThrow();
  });
});

describe('destination configs are valid', () => {
  for (const d of destinations) {
    it(`${d.name} (${d.id}) passes validation`, () => {
      expect(validateDestination(d)).toEqual([]);
    });
  }
});

describe('validateDestination catches bad configs', () => {
  it('flags a gasgiant body with no gasGiant block', () => {
    const bad = {
      ...destinations[0],
      bodies: [{ id: 'x', kind: 'gasgiant', radius: 1, position: [0, 0, 0] }],
    } as (typeof destinations)[number];
    expect(validateDestination(bad).length).toBeGreaterThan(0);
  });

  it('flags inverted ring radii', () => {
    const bad = {
      ...destinations[0],
      bodies: [
        {
          id: 'x',
          kind: 'rocky',
          radius: 1,
          position: [0, 0, 0],
          rings: { innerRadius: 2, outerRadius: 1, color: [1, 1, 1], opacity: 0.5 },
        },
      ],
    } as (typeof destinations)[number];
    expect(validateDestination(bad).some((m) => m.includes('innerRadius'))).toBe(true);
  });
});
