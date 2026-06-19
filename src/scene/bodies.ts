import * as THREE from 'three';
import type { BodyConfig } from '../core/types';
import { buildEarthlike } from './builders/earthlike';
import { buildGasGiant } from './builders/gasgiant';
import { buildRings } from './builders/rings';
import sunVert from '../shaders/sun.vert';
import sunFrag from '../shaders/sun.frag';
import coronaVert from '../shaders/corona.vert';
import coronaFrag from '../shaders/corona.frag';

export interface BodyHandle {
  object: THREE.Object3D;
  update?(dt: number, elapsed: number): void;
  dispose(): void;
}

const C = (c: [number, number, number]) => new THREE.Color(c[0], c[1], c[2]);

/** Animated emissive star: photosphere shader + additive corona shell. */
export function buildStar(cfg: BodyConfig): BodyHandle {
  const s = cfg.star!;
  const group = new THREE.Group();
  group.position.set(...cfg.position);

  const geo = new THREE.SphereGeometry(cfg.radius, 96, 96);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: C(s.color) },
      uHot: { value: C(s.hotColor) },
      uIntensity: { value: s.emissiveIntensity },
      uScale: { value: s.granulationScale },
      uFlow: { value: s.flowSpeed },
    },
    vertexShader: sunVert,
    fragmentShader: sunFrag,
  });
  const sun = new THREE.Mesh(geo, mat);
  group.add(sun);

  const coronaGeo = new THREE.SphereGeometry(cfg.radius * (1.0 + s.coronaSize), 64, 64);
  const coronaMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: C(s.coronaColor) },
      uIntensity: { value: s.emissiveIntensity * 0.5 },
    },
    vertexShader: coronaVert,
    fragmentShader: coronaFrag,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const corona = new THREE.Mesh(coronaGeo, coronaMat);
  group.add(corona);

  return {
    object: group,
    update(_dt, t) {
      mat.uniforms.uTime.value = t;
      coronaMat.uniforms.uTime.value = t;
      sun.rotation.y = t * 0.02;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      coronaGeo.dispose();
      coronaMat.dispose();
    },
  };
}

/** Placeholder lit body (rocky worlds) using a standard material. */
export function buildSimplePlanet(cfg: BodyConfig): BodyHandle {
  const group = new THREE.Group();
  group.position.set(...cfg.position);
  group.rotation.z = cfg.axialTilt ?? 0;

  const geo = new THREE.SphereGeometry(cfg.radius, 64, 64);
  const base =
    cfg.surface?.landColor ?? cfg.gasGiant?.bands?.[0] ?? [0.5, 0.5, 0.55];
  const mat = new THREE.MeshStandardMaterial({
    color: C(base),
    roughness: cfg.surface?.roughness ?? 0.9,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  const spin = cfg.rotationPeriod ? (Math.PI * 2) / cfg.rotationPeriod : 0.05;
  return {
    object: group,
    update(dt) {
      mesh.rotation.y += spin * dt;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

function buildBaseBody(cfg: BodyConfig, sunPosition: THREE.Vector3): BodyHandle {
  switch (cfg.kind) {
    case 'star':
      return buildStar(cfg);
    case 'earthlike':
      return buildEarthlike(cfg, sunPosition);
    case 'gasgiant':
      return buildGasGiant(cfg, sunPosition);
    default:
      return buildSimplePlanet(cfg);
  }
}

/** Builds a body and composes a ring system onto it when configured. */
export function buildBody(cfg: BodyConfig, sunPosition: THREE.Vector3): BodyHandle {
  const base = buildBaseBody(cfg, sunPosition);
  if (!cfg.rings || cfg.kind === 'star') return base;

  const rings = buildRings(cfg, sunPosition);
  base.object.add(rings.object);
  return {
    object: base.object,
    update(dt, t) {
      base.update?.(dt, t);
      rings.update?.(dt, t);
    },
    dispose() {
      base.dispose();
      rings.dispose();
    },
  };
}
