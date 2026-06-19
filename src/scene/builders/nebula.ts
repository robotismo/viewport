import * as THREE from 'three';
import type { NebulaConfig, Vec3 } from '../../core/types';
import type { BodyHandle } from '../bodies';
import nebulaVert from '../../shaders/nebula.vert';
import nebulaFrag from '../../shaders/nebula.frag';

const C = (c: Vec3) => new THREE.Color(c[0], c[1], c[2]);

/** Hero volumetric nebula: a raymarched FBM cloud inside a bounding sphere. */
export function buildNebula(cfg: NebulaConfig): BodyHandle {
  const center = new THREE.Vector3(...cfg.position);
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCenter: { value: center },
      uRadius: { value: cfg.radius },
      uColorA: { value: C(cfg.colorA) },
      uColorB: { value: C(cfg.colorB) },
      uDensity: { value: cfg.density },
      uSteps: { value: cfg.steps ?? 40 },
      uSeed: { value: cfg.seed ?? 0 },
      uStarColor: { value: C(cfg.starColor ?? [1, 0.9, 0.85]) },
      uStarIntensity: { value: cfg.starIntensity ?? 0 },
    },
    vertexShader: nebulaVert,
    fragmentShader: nebulaFrag,
    transparent: true,
    side: THREE.BackSide, // far shell always visible, even flying through
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(center);
  mesh.frustumCulled = false;

  return {
    object: mesh,
    update(_dt, t) {
      mat.uniforms.uTime.value = t;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
