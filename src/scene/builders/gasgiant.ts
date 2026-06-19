import * as THREE from 'three';
import type { BodyConfig, Vec3 } from '../../core/types';
import type { BodyHandle } from '../bodies';
import planetVert from '../../shaders/planet.vert';
import gasFrag from '../../shaders/gasgiant.frag';

const C = (c: Vec3) => new THREE.Color(c[0], c[1], c[2]);

/** Gas giant: domain-warped banded flow, great-spot storm, sun terminator. */
export function buildGasGiant(cfg: BodyConfig, sunPosition: THREE.Vector3): BodyHandle {
  const g = cfg.gasGiant!;
  const group = new THREE.Group();
  group.position.set(...cfg.position);
  group.rotation.z = cfg.axialTilt ?? 0;

  // Pad the band palette to a fixed array length for the uniform.
  const padded: THREE.Color[] = g.bands.map(C);
  while (padded.length < 6) padded.push(padded[padded.length - 1].clone());

  const geo = new THREE.SphereGeometry(cfg.radius, 128, 128);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunPos: { value: sunPosition.clone() },
      uBands: { value: padded },
      uBandCount: { value: Math.min(g.bands.length, 6) },
      uBandScale: { value: g.bandScale },
      uTurb: { value: g.turbulence },
      uFlow: { value: g.flowSpeed },
      uSpot: { value: C(g.spotColor ?? [0.8, 0.3, 0.2]) },
      uHasSpot: { value: g.spotColor ? 1 : 0 },
      uHasRings: { value: cfg.rings ? 1 : 0 },
      uRingNormal: {
        value: new THREE.Vector3(
          -Math.sin(cfg.axialTilt ?? 0),
          Math.cos(cfg.axialTilt ?? 0),
          0,
        ),
      },
      uPlanetCenter: { value: new THREE.Vector3(...cfg.position) },
      uRingInner: { value: cfg.radius * (cfg.rings?.innerRadius ?? 1.3) },
      uRingOuter: { value: cfg.radius * (cfg.rings?.outerRadius ?? 2.3) },
    },
    vertexShader: planetVert,
    fragmentShader: gasFrag,
  });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  const spin = cfg.rotationPeriod ? (Math.PI * 2) / cfg.rotationPeriod : 0.04;
  return {
    object: group,
    update(dt, t) {
      mesh.rotation.y += spin * dt;
      mat.uniforms.uTime.value = t;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
