import type { Destination } from '../core/types';

// Home view. Artistically compressed distances + readable relative sizes.
export const sol: Destination = {
  id: 'sol-system',
  name: 'SOL SYSTEM',
  tagline: 'home star · five worlds · compressed scale',
  intent:
    'The establishing shot: the family of worlds laid out around their star so ' +
    'you can read the system at a glance. Distances are compressed and sizes ' +
    'nudged toward legibility — true scale would leave you staring at black with ' +
    'a few invisible specks. This is the map you depart from.',
  light: { position: [0, 0, 0], color: [1.0, 0.96, 0.88], intensity: 2.2, ambient: 0.03 },
  bodies: [
    {
      id: 'star',
      kind: 'star',
      radius: 4,
      position: [0, 0, 0],
      star: {
        color: [1.0, 0.62, 0.34],
        hotColor: [1.0, 0.94, 0.84],
        emissiveIntensity: 2.4,
        granulationScale: 3.6,
        flowSpeed: 0.05,
        coronaColor: [1.0, 0.6, 0.26],
        coronaSize: 0.28,
        flare: true,
      },
    },
    {
      id: 'inner-rock',
      kind: 'rocky',
      radius: 0.55,
      position: [9, 0, 0],
      rotationPeriod: 40,
      surface: { landColor: [0.5, 0.42, 0.34], roughness: 0.95, seed: 1 },
    },
    {
      id: 'ocean-world',
      kind: 'earthlike',
      radius: 0.95,
      position: [15, 0, 4],
      axialTilt: 0.41,
      rotationPeriod: 24,
      surface: { landColor: [0.15, 0.35, 0.2], oceanColor: [0.05, 0.18, 0.4], iceColor: [0.9, 0.95, 1.0] },
      atmosphere: { dayColor: [0.3, 0.5, 1.0], twilightColor: [1.0, 0.5, 0.25], thickness: 0.04, intensity: 1.0, nightLights: [1.0, 0.8, 0.4] },
    },
    {
      id: 'red-rock',
      kind: 'rocky',
      radius: 0.62,
      position: [22, 0, -5],
      rotationPeriod: 26,
      surface: { landColor: [0.6, 0.28, 0.16], roughness: 0.95, seed: 5 },
    },
    {
      id: 'gas-giant',
      kind: 'gasgiant',
      radius: 2.3,
      position: [34, 0, 9],
      axialTilt: 0.05,
      rotationPeriod: 12,
      gasGiant: {
        bands: [[0.85, 0.72, 0.55], [0.7, 0.55, 0.4], [0.9, 0.82, 0.7], [0.6, 0.45, 0.35]],
        bandScale: 9.0,
        turbulence: 0.6,
        flowSpeed: 0.04,
        spotColor: [0.8, 0.3, 0.2],
      },
      rings: { innerRadius: 1.4, outerRadius: 2.3, color: [0.8, 0.75, 0.65], opacity: 0.6 },
    },
    {
      id: 'ice-giant',
      kind: 'gasgiant',
      radius: 1.6,
      position: [46, 0, -12],
      axialTilt: 0.3,
      rotationPeriod: 16,
      gasGiant: { bands: [[0.4, 0.6, 0.8], [0.3, 0.5, 0.75], [0.55, 0.7, 0.85]], bandScale: 7.0, turbulence: 0.35, flowSpeed: 0.03 },
    },
  ],
  starfield: { starCount: 8000, milkyWay: true },
  camera: {
    position: [12, 20, 64],
    target: [20, 0, 0],
    minDistance: 8,
    maxDistance: 320,
    arriveFrom: [28, 60, 150],
    autoRotate: true,
    autoRotateSpeed: 0.04,
  },
  post: { exposure: 1.0, bloomStrength: 0.6, bloomRadius: 0.55, bloomThreshold: 0.78, vignette: 0.5, grain: 0.025, flare: 0.25 },
  background: [0, 0, 0.004],
};
