import type { Destination } from '../core/types';

// Colors are authored in linear space (tuned visually against ACES + bloom).
export const sun: Destination = {
  id: 'sun',
  name: 'SOL',
  tagline: 'G2V main sequence · photosphere approach',
  intent:
    'Parked just off the photosphere. The surface is never still — convection ' +
    'cells boil and drift, the limb burns brighter than the disc, and the corona ' +
    'breathes around the edge. Bloom does the rest: the star reads as a light ' +
    'source you instinctively want to shield your eyes from.',
  light: { position: [0, 0, 0], color: [1.0, 0.95, 0.85], intensity: 2.0, ambient: 0.02 },
  bodies: [
    {
      id: 'sol',
      kind: 'star',
      radius: 6,
      position: [0, 0, 0],
      star: {
        color: [1.0, 0.42, 0.08],
        hotColor: [1.0, 0.88, 0.55],
        emissiveIntensity: 1.55,
        granulationScale: 4.0,
        flowSpeed: 0.06,
        coronaColor: [1.0, 0.55, 0.22],
        coronaSize: 0.22,
        flare: true,
      },
    },
  ],
  starfield: { starCount: 7000, milkyWay: true },
  camera: {
    position: [0, 4, 19],
    target: [0, 0, 0],
    minDistance: 9,
    maxDistance: 140,
    arriveFrom: [10, 50, 280],
    autoRotate: true,
    autoRotateSpeed: 0.06,
  },
  post: { exposure: 1.0, bloomStrength: 0.55, bloomRadius: 0.5, bloomThreshold: 0.72, vignette: 0.5, grain: 0.03 },
  background: [0, 0, 0.004],
};
