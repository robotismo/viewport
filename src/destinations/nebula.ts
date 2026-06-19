import type { Destination } from '../core/types';

// Deep-space vista: a raymarched emission nebula with a hot young star burning
// at its heart.
export const nebula: Destination = {
  id: 'nebula',
  name: 'THE VEIL',
  tagline: 'emission nebula · stellar nursery',
  intent:
    'No surface, no horizon — just light suspended in gas light-years deep. ' +
    'Magenta hydrogen bleeds into oxygen blue, a newborn star blazes in the core, ' +
    'and the whole structure has volume: parallax slides the foreground wisps ' +
    'against the background as you move. This is the destination that proves the ' +
    'volume is real, not a painted backdrop.',
  light: { position: [0, 0, 0], color: [0.7, 0.8, 1.0], intensity: 1.0, ambient: 0.04 },
  bodies: [
    {
      id: 'nursery-star',
      kind: 'star',
      radius: 2.2,
      position: [0, 0, 0],
      star: {
        color: [0.6, 0.75, 1.0],
        hotColor: [0.95, 0.98, 1.0],
        emissiveIntensity: 1.8,
        granulationScale: 3.5,
        flowSpeed: 0.08,
        coronaColor: [0.6, 0.8, 1.0],
        coronaSize: 0.35,
        flare: true,
      },
    },
  ],
  nebula: {
    enabled: true,
    position: [0, 0, 0],
    radius: 64,
    colorA: [0.85, 0.2, 0.55],
    colorB: [0.25, 0.4, 0.95],
    density: 1.6,
    steps: 44,
    seed: 4,
    starColor: [1.0, 0.85, 0.75],
    starIntensity: 1.4,
  },
  starfield: { starCount: 12000, milkyWay: true, baseSize: 1.8 },
  camera: {
    position: [0, 14, 150],
    target: [0, 0, 0],
    minDistance: 80,
    maxDistance: 320,
    arriveFrom: [40, 60, 420],
    autoRotate: true,
    autoRotateSpeed: 0.05,
  },
  post: { exposure: 1.05, bloomStrength: 0.5, bloomRadius: 0.65, bloomThreshold: 0.72, vignette: 0.55, grain: 0.03, flare: 0.45 },
  background: [0.005, 0.002, 0.01],
};
