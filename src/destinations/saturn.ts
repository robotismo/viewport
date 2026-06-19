import type { Destination } from '../core/types';

// Ringed gas giant. Sun high and to the side so the rings cast a shadow band
// across the planet and the planet's shadow notches the rings.
export const saturn: Destination = {
  id: 'ringed-giant',
  name: 'AURELIA',
  tagline: 'ringed gas giant · ice-debris ring system',
  intent:
    'The crowd-pleaser. A banded gold world wearing a disc of a billion ice ' +
    'shards, lit edge-on so the ring shadow lies across the clouds and the ' +
    "planet bites a curved notch out of the rings. It's a structure that looks " +
    'impossible until you are floating beside it.',
  light: { position: [54, 22, 8], color: [1.0, 0.96, 0.86], intensity: 2.3, ambient: 0.02 },
  bodies: [
    {
      id: 'aurelia',
      kind: 'gasgiant',
      radius: 5,
      position: [0, 0, 0],
      axialTilt: 0.47,
      rotationPeriod: 34,
      gasGiant: {
        bands: [
          [0.96, 0.88, 0.7],
          [0.62, 0.5, 0.34],
          [0.92, 0.82, 0.62],
          [0.54, 0.43, 0.3],
          [0.88, 0.78, 0.58],
        ],
        bandScale: 16.0,
        turbulence: 0.6,
        flowSpeed: 0.035,
      },
      rings: { innerRadius: 1.28, outerRadius: 2.35, color: [0.84, 0.78, 0.66], opacity: 0.85 },
    },
  ],
  starfield: { starCount: 8000, milkyWay: true },
  camera: {
    position: [9.5, 4.2, 11],
    target: [0, 0, 0],
    minDistance: 8,
    maxDistance: 90,
    arriveFrom: [44, 30, 150],
    autoRotate: true,
    autoRotateSpeed: 0.05,
  },
  post: { exposure: 1.0, bloomStrength: 0.45, bloomRadius: 0.5, bloomThreshold: 0.85, vignette: 0.55, grain: 0.025 },
  background: [0, 0, 0.004],
};
