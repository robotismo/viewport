import * as THREE from 'three';
import type { BodyConfig } from '../../core/types';
import type { BodyHandle } from '../bodies';
import planetVert from '../../shaders/planet.vert';
import earthFrag from '../../shaders/earthlike.frag';
import atmoFrag from '../../shaders/atmosphere.frag';

const C = (c: [number, number, number]) => new THREE.Color(c[0], c[1], c[2]);

/** Ocean world: procedural surface + day/night terminator + atmosphere shell. */
export function buildEarthlike(cfg: BodyConfig, sunPosition: THREE.Vector3): BodyHandle {
  const group = new THREE.Group();
  group.position.set(...cfg.position);
  group.rotation.z = cfg.axialTilt ?? 0;

  const s = cfg.surface ?? {};
  const surfGeo = new THREE.SphereGeometry(cfg.radius, 128, 128);
  const surfMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunPos: { value: sunPosition.clone() },
      uLand: { value: C(s.landColor ?? [0.13, 0.32, 0.18]) },
      uOcean: { value: C(s.oceanColor ?? [0.03, 0.14, 0.36]) },
      uIce: { value: C(s.iceColor ?? [0.9, 0.95, 1.0]) },
      uNightLights: { value: C(cfg.atmosphere?.nightLights ?? [1.0, 0.8, 0.45]) },
      uSeed: { value: s.seed ?? 0 },
    },
    vertexShader: planetVert,
    fragmentShader: earthFrag,
  });
  const surface = new THREE.Mesh(surfGeo, surfMat);
  group.add(surface);

  let atmoGeo: THREE.SphereGeometry | null = null;
  let atmoMat: THREE.ShaderMaterial | null = null;
  if (cfg.atmosphere) {
    const a = cfg.atmosphere;
    atmoGeo = new THREE.SphereGeometry(
      cfg.radius * (1.0 + Math.max(a.thickness, 0.01) * 1.7),
      96,
      96,
    );
    atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunPos: { value: sunPosition.clone() },
        uDayColor: { value: C(a.dayColor) },
        uTwilightColor: { value: C(a.twilightColor) },
        uIntensity: { value: a.intensity },
      },
      vertexShader: planetVert,
      fragmentShader: atmoFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(atmoGeo, atmoMat));
  }

  const spin = cfg.rotationPeriod ? (Math.PI * 2) / cfg.rotationPeriod : 0.05;
  return {
    object: group,
    update(dt, t) {
      surface.rotation.y += spin * dt;
      surfMat.uniforms.uTime.value = t;
    },
    dispose() {
      surfGeo.dispose();
      surfMat.dispose();
      atmoGeo?.dispose();
      atmoMat?.dispose();
    },
  };
}
