import * as THREE from 'three';
import type { BodyConfig, Vec3 } from '../../core/types';
import type { BodyHandle } from '../bodies';
import planetVert from '../../shaders/planet.vert';
import rockyFrag from '../../shaders/rocky.frag';

const C = (c: Vec3) => new THREE.Color(c[0], c[1], c[2]);

/** Procedural rocky world: fbm rock tones, crater rings, polar frost, terminator. */
export function buildRocky(cfg: BodyConfig, sunPosition: THREE.Vector3): BodyHandle {
  const group = new THREE.Group();
  group.position.set(...cfg.position);
  group.rotation.z = cfg.axialTilt ?? 0;

  const s = cfg.surface ?? {};
  const rockA = s.landColor ?? [0.5, 0.42, 0.36];
  const rockB: Vec3 = [rockA[0] * 0.55, rockA[1] * 0.55, rockA[2] * 0.55];

  const geo = new THREE.SphereGeometry(cfg.radius, 64, 64);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSunPos: { value: sunPosition.clone() },
      uRockA: { value: C(rockA) },
      uRockB: { value: C(rockB) },
      uIce: { value: C(s.iceColor ?? [0.78, 0.78, 0.82]) },
      uSeed: { value: s.seed ?? 0 },
    },
    vertexShader: planetVert,
    fragmentShader: rockyFrag,
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
