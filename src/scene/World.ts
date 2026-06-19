import * as THREE from 'three';
import type { Destination, BuiltWorld, Updatable } from '../core/types';
import type { Engine } from '../core/Engine';
import { buildBody, type BodyHandle } from './bodies';
import { buildNebula } from './builders/nebula';
import { createStarfield } from './Starfield';

/**
 * Builds a Destination into the engine's scene and wires updatables. Returns a
 * handle whose dispose() fully tears the destination down (lazy per-destination
 * lifecycle — nothing from the previous world lingers).
 */
export function buildWorld(dest: Destination, engine: Engine): BuiltWorld {
  const root = new THREE.Group();
  const handles: BodyHandle[] = [];

  const starfield = createStarfield(dest.starfield);
  root.add(starfield.object);
  handles.push(starfield);

  const sunPosition = new THREE.Vector3(
    dest.light.position[0],
    dest.light.position[1],
    dest.light.position[2],
  );
  for (const b of dest.bodies) {
    const h = buildBody(b, sunPosition);
    root.add(h.object);
    handles.push(h);
  }

  if (dest.nebula?.enabled) {
    const neb = buildNebula(dest.nebula);
    root.add(neb.object);
    handles.push(neb);
  }

  const updatables: Updatable[] = handles.filter(
    (h): h is BodyHandle & Updatable => typeof h.update === 'function',
  );

  engine.add(root);
  engine.applyDestination(dest);
  for (const u of updatables) engine.register(u);

  return {
    updatables,
    dispose() {
      for (const u of updatables) engine.unregister(u);
      engine.scene.remove(root);
      for (const h of handles) h.dispose();
    },
  };
}
