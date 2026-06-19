import type { Destination } from '../core/types';

// Ocean-world close-up. Sun thrown to the side so the terminator and the
// atmosphere crescent both read.
export const earthlike: Destination = {
  id: 'ocean-world',
  name: 'KEPLER OCEANIS',
  tagline: 'temperate ocean world · 0.97 g · breathable',
  intent:
    'The shot every astronaut describes and none can quite convey: a living ' +
    'world hanging in the dark. A blue scattering halo rings the day side, the ' +
    'terminator bleeds gold into night, and city-light constellations flicker on ' +
    'across the dark hemisphere. Drag around to chase the sunrise line.',
  light: { position: [42, 9, -4], color: [1.0, 0.97, 0.9], intensity: 2.4, ambient: 0.015 },
  bodies: [
    {
      id: 'oceanis',
      kind: 'earthlike',
      radius: 4,
      position: [0, 0, 0],
      axialTilt: 0.41,
      rotationPeriod: 90,
      surface: {
        landColor: [0.12, 0.34, 0.16],
        oceanColor: [0.02, 0.13, 0.34],
        iceColor: [0.92, 0.96, 1.0],
        seed: 3,
      },
      atmosphere: {
        dayColor: [0.32, 0.55, 1.0],
        twilightColor: [1.0, 0.48, 0.22],
        thickness: 0.06,
        intensity: 1.5,
        nightLights: [1.0, 0.82, 0.45],
      },
      clouds: {
        color: [0.96, 0.97, 1.0],
        coverage: 0.5,
        speed: 0.015,
      },
    },
    {
      // A small cratered moon, off-axis and behind, for scale + a matching crescent.
      id: 'moon',
      kind: 'rocky',
      radius: 0.7,
      position: [-6.5, 2.2, -4],
      rotationPeriod: 200,
      surface: { landColor: [0.46, 0.44, 0.42], iceColor: [0.7, 0.72, 0.78], seed: 11 },
    },
  ],
  starfield: { starCount: 8000, milkyWay: true },
  camera: {
    position: [0, 1.5, 9.6],
    target: [0, 0, 0],
    minDistance: 5.4,
    maxDistance: 70,
    arriveFrom: [4, 8, 24],
    autoRotate: true,
    autoRotateSpeed: 0.06,
  },
  post: { exposure: 1.05, bloomStrength: 0.5, bloomRadius: 0.5, bloomThreshold: 0.82, vignette: 0.55, grain: 0.025 },
  background: [0, 0, 0.004],
};
