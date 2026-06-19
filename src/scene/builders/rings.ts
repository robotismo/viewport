import * as THREE from 'three';
import type { BodyConfig, Vec3 } from '../../core/types';
import type { BodyHandle } from '../bodies';
import ringsVert from '../../shaders/rings.vert';
import ringsFrag from '../../shaders/rings.frag';

const C = (c: Vec3) => new THREE.Color(c[0], c[1], c[2]);

/**
 * Ring disc with procedural ringlets, a Cassini division and an analytic
 * planet-shadow notch. Returned as a mesh to be parented to the planet group
 * (so it inherits the body's position and axial tilt).
 */
export function buildRings(cfg: BodyConfig, sunPosition: THREE.Vector3): BodyHandle {
  const r = cfg.rings!;
  const inner = cfg.radius * r.innerRadius;
  const outer = cfg.radius * r.outerRadius;

  const geo = new THREE.RingGeometry(inner, outer, 256, 6);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSunPos: { value: sunPosition.clone() },
      uColor: { value: C(r.color) },
      uOpacity: { value: r.opacity },
      uInner: { value: inner },
      uOuter: { value: outer },
      uPlanetCenter: { value: new THREE.Vector3(...cfg.position) },
      uPlanetRadius: { value: cfg.radius },
    },
    vertexShader: ringsVert,
    fragmentShader: ringsFrag,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2; // lay flat into the planet's equatorial plane

  return {
    object: mesh,
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
