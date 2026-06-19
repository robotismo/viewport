import * as THREE from 'three';
import type { BodyHandle } from './bodies';
import type { StarfieldConfig } from '../core/types';

const starVert = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vTwinkle;
  uniform float uTime;
  void main() {
    vColor = aColor;
    // slow per-star twinkle from a hash baked into size
    vTwinkle = 0.75 + 0.25 * sin(uTime * 1.5 + aSize * 53.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize;
  }
`;

const starFrag = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.5, 0.0, d);
    float halo = smoothstep(0.5, 0.15, d) * 0.5;
    float a = core + halo;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * vTwinkle, a);
  }
`;

// Luminous Milky Way band — an inward-facing far shell painting a galactic
// plane with fbm mottling, dust lanes, and a warm core / cool arms gradient.
const galaxyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const galaxyFrag = /* glsl */ `
  #include lib/noise.glsl;
  uniform float uIntensity;
  varying vec3 vDir;
  void main() {
    // Rotate the view direction into the galactic frame (0.5 rad tilt about X,
    // matching the star band), then read latitude/longitude.
    float ct = cos(0.5), st = sin(0.5);
    vec3 d = normalize(vDir);
    float gy = d.y * ct + d.z * st;
    float gz = -d.y * st + d.z * ct;
    float lat = asin(clamp(gy, -1.0, 1.0));
    float lon = atan(gz, d.x);

    float band = pow(smoothstep(0.55, 0.0, abs(lat)), 2.2);
    float mottle = 0.45 + 0.55 * fbm(d * 6.0);
    float dust = smoothstep(0.14, 0.0, abs(lat + (fbm(d * 3.0) - 0.5) * 0.12)) * 0.7;
    float v = band * mottle * (1.0 - dust);

    float core = smoothstep(1.4, 0.0, abs(lon)); // brighter toward the core
    vec3 col = mix(vec3(0.55, 0.66, 0.95), vec3(0.95, 0.85, 0.68), core);
    gl_FragColor = vec4(col * v * uIntensity, 1.0);
  }
`;

// Deterministic PRNG so the sky is stable across reloads.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Star color from a rough temperature ramp (blue → white → gold → red).
function starColor(rng: () => number, hueVar: number): [number, number, number] {
  const r = rng();
  if (r < 0.08) return [0.7, 0.8, 1.0]; // hot blue
  if (r < 0.3) return [0.9, 0.95, 1.0]; // blue-white
  if (r < 0.7) return [1.0, 1.0, 0.98]; // white
  if (r < 0.92) return [1.0, 0.92, 0.75]; // gold
  const m = 1 - hueVar * 0.3;
  return [1.0, 0.7 * m, 0.55 * m]; // red
}

/**
 * Procedural starfield on a far shell, with a denser, tilted Milky Way band
 * of fainter stars for the galactic-plane look.
 */
export function createStarfield(cfg: StarfieldConfig): BodyHandle {
  const count = cfg.starCount ?? 6000;
  const radius = 9000;
  const hueVar = cfg.hueVariation ?? 1;
  const baseSize = cfg.baseSize ?? 2.0;
  const rng = mulberry32(1337);

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  // Milky Way band tilt
  const tilt = 0.5;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);

  for (let i = 0; i < count; i++) {
    const inBand = cfg.milkyWay !== false && rng() < 0.45;
    // uniform direction on sphere
    const u = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const su = Math.sqrt(1 - u * u);
    let x = su * Math.cos(theta);
    let y = u;
    let z = su * Math.sin(theta);

    if (inBand) {
      // compress toward the galactic plane (small |y|), then tilt
      y *= 0.10 + rng() * 0.05;
      const len = Math.hypot(x, y, z) || 1;
      x /= len;
      y /= len;
      z /= len;
    }
    // apply band tilt around X axis
    const ty = y * ct - z * st;
    const tz = y * st + z * ct;
    y = ty;
    z = tz;

    positions[i * 3] = x * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = z * radius;

    const c = starColor(rng, hueVar);
    const mag = inBand ? 0.4 + rng() * 0.5 : 0.5 + rng() * 0.5;
    colors[i * 3] = c[0] * mag;
    colors[i * 3 + 1] = c[1] * mag;
    colors[i * 3 + 2] = c[2] * mag;

    const bright = Math.pow(rng(), 6); // few large, many small
    sizes[i] = baseSize * (0.6 + bright * 4.0) * (inBand ? 0.7 : 1.0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: starVert,
    fragmentShader: starFrag,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = -1;

  const group = new THREE.Group();
  group.add(points);

  // Galaxy band shell (behind the stars).
  let galGeo: THREE.SphereGeometry | null = null;
  let galMat: THREE.ShaderMaterial | null = null;
  if (cfg.milkyWay !== false) {
    galGeo = new THREE.SphereGeometry(radius * 1.08, 48, 48);
    galMat = new THREE.ShaderMaterial({
      uniforms: { uIntensity: { value: 0.32 } },
      vertexShader: galaxyVert,
      fragmentShader: galaxyFrag,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const galaxy = new THREE.Mesh(galGeo, galMat);
    galaxy.frustumCulled = false;
    galaxy.renderOrder = -2;
    group.add(galaxy);
  }

  return {
    object: group,
    update(_dt, t) {
      mat.uniforms.uTime.value = t;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      galGeo?.dispose();
      galMat?.dispose();
    },
  };
}
