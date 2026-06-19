// ─────────────────────────────────────────────────────────────────────────────
// The contract. A Destination is pure data consumed by one engine.
// Adding a destination is data, not new code paths.
// ─────────────────────────────────────────────────────────────────────────────

export type Vec3 = [number, number, number];

export type BodyKind = 'star' | 'rocky' | 'earthlike' | 'gasgiant';

/** Animated, emissive star surface (photosphere + corona + optional flare). */
export interface StarSurfaceConfig {
  color: Vec3; // base photosphere
  hotColor: Vec3; // granule highlight / hotter tone
  emissiveIntensity: number; // HDR multiplier (drives bloom)
  granulationScale: number; // surface noise frequency
  flowSpeed: number;
  coronaColor: Vec3;
  coronaSize: number; // corona extent as fraction of radius
  flare?: boolean; // screen-space lens flare
}

/** Analytic atmospheric scattering + day/night terminator. */
export interface AtmosphereConfig {
  dayColor: Vec3; // rayleigh tint (sky color)
  twilightColor: Vec3; // terminator / sunset band
  thickness: number; // shell thickness as fraction of radius
  intensity: number;
  nightLights?: Vec3; // city-light glow on the dark side (earthlike)
}

/** Domain-warped banded flow for gas giants. */
export interface GasGiantConfig {
  bands: Vec3[]; // band palette (top→bottom)
  bandScale: number; // latitude band frequency
  turbulence: number; // domain-warp strength
  flowSpeed: number;
  spotColor?: Vec3; // great-spot storm tint
}

/** Ring system with analytic planet↔ring shadowing. */
export interface RingConfig {
  innerRadius: number; // in body radii
  outerRadius: number; // in body radii
  color: Vec3;
  opacity: number;
  tilt?: number; // radians; defaults to body axialTilt
}

/** Procedural rocky / ocean surface params. */
export interface SurfaceConfig {
  landColor?: Vec3;
  oceanColor?: Vec3;
  iceColor?: Vec3;
  roughness?: number;
  noiseScale?: number;
  seed?: number;
}

/** Animated cloud shell (earthlike). */
export interface CloudConfig {
  color: Vec3;
  coverage: number; // 0..1 — fraction of the globe under cloud
  speed: number;
}

export interface BodyConfig {
  id: string;
  kind: BodyKind;
  radius: number; // engine units
  position: Vec3; // engine units (compressed scale)
  rotationPeriod?: number; // seconds per full spin (visual)
  axialTilt?: number; // radians
  star?: StarSurfaceConfig;
  atmosphere?: AtmosphereConfig;
  gasGiant?: GasGiantConfig;
  rings?: RingConfig;
  surface?: SurfaceConfig;
  clouds?: CloudConfig;
}

export interface StarfieldConfig {
  starCount?: number;
  milkyWay?: boolean;
  hueVariation?: number;
  baseSize?: number;
}

/** Hero volumetric nebula (raymarched at full composer resolution — the
 *  most expensive shader in any scene; tune `steps` per destination). */
export interface NebulaConfig {
  enabled: boolean;
  position: Vec3;
  radius: number;
  colorA: Vec3;
  colorB: Vec3;
  density: number;
  steps?: number;
  seed?: number;
  starColor?: Vec3; // embedded-star in-scatter tint
  starIntensity?: number;
}

export interface CameraConfig {
  position: Vec3; // resting position
  target: Vec3; // look-at
  minDistance?: number;
  maxDistance?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  arriveFrom?: Vec3; // cinematic arrival start (warp-in)
}

export interface PostConfig {
  exposure: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  vignette: number; // 0..1
  grain: number; // 0..1
  flare?: number; // screen-space lens flare intensity (0 = off)
}

export interface LightConfig {
  position: Vec3; // dominant star light
  color: Vec3;
  intensity: number;
  ambient: number; // near-black fill
}

export interface Destination {
  id: string;
  name: string;
  tagline: string;
  /** "Why this feels like being there" — art intent, surfaced in the HUD. */
  intent: string;
  light: LightConfig;
  bodies: BodyConfig[];
  starfield: StarfieldConfig;
  nebula?: NebulaConfig;
  camera: CameraConfig;
  post: PostConfig;
  background?: Vec3;
}

export interface Updatable {
  update(dt: number, elapsed: number): void;
}

/** A built destination: objects added to the scene + how to tear it down. */
export interface BuiltWorld {
  updatables: Updatable[];
  dispose(): void;
}
