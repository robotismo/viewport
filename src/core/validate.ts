import type { BodyConfig, Destination, Vec3 } from './types';

// Pure data validation for Destination configs — no Three.js, no GL. Catches the
// crash-class mistakes that the data-driven engine would otherwise hit at build
// time (e.g. a gasgiant body with no gasGiant block, inverted ring radii).

const isNum = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n);

function checkVec3(label: string, v: Vec3 | undefined, out: string[]): void {
  if (!v) return;
  if (v.length !== 3 || !v.every(isNum)) {
    out.push(`${label}: expected 3 finite numbers, got ${JSON.stringify(v)}`);
    return;
  }
  if (v.some((c) => c < 0 || c > 8)) {
    out.push(`${label}: components out of sane range [0,8]: ${JSON.stringify(v)}`);
  }
}

function checkBody(b: BodyConfig, out: string[]): void {
  const where = `body "${b.id}"`;
  if (!b.id) out.push('a body is missing an id');
  if (!isNum(b.radius) || b.radius <= 0) out.push(`${where}: radius must be > 0`);
  if (!b.position || b.position.length !== 3 || !b.position.every(isNum)) {
    out.push(`${where}: position must be 3 finite numbers`);
  }
  switch (b.kind) {
    case 'star':
      if (!b.star) out.push(`${where}: kind 'star' requires a star config`);
      else checkVec3(`${where}.star.color`, b.star.color, out);
      break;
    case 'gasgiant':
      if (!b.gasGiant) out.push(`${where}: kind 'gasgiant' requires a gasGiant config`);
      else if (!b.gasGiant.bands?.length) out.push(`${where}: gasGiant needs ≥1 band`);
      break;
    case 'earthlike':
    case 'rocky':
      break;
    default:
      out.push(`${where}: unknown kind '${(b as { kind: string }).kind}'`);
  }
  if (b.rings) {
    if (!(b.rings.innerRadius < b.rings.outerRadius)) {
      out.push(`${where}: ring innerRadius must be < outerRadius`);
    }
    checkVec3(`${where}.rings.color`, b.rings.color, out);
  }
  if (b.atmosphere) {
    checkVec3(`${where}.atmosphere.dayColor`, b.atmosphere.dayColor, out);
    checkVec3(`${where}.atmosphere.twilightColor`, b.atmosphere.twilightColor, out);
  }
}

/** Returns a list of problems; an empty array means the destination is valid. */
export function validateDestination(d: Destination): string[] {
  const out: string[] = [];
  if (!d.id) out.push('missing id');
  if (!d.name) out.push('missing name');
  if (!d.tagline) out.push(`${d.id}: missing tagline`);
  if (!d.intent) out.push(`${d.id}: missing intent`);

  if (!d.bodies?.length) out.push(`${d.id}: needs at least one body`);
  d.bodies?.forEach((b) => checkBody(b, out));

  checkVec3(`${d.id}.light.color`, d.light?.color, out);
  if (!isNum(d.light?.intensity)) out.push(`${d.id}: light.intensity must be finite`);

  const c = d.camera;
  if (!c) out.push(`${d.id}: missing camera`);
  else if (c.minDistance != null && c.maxDistance != null && !(c.minDistance < c.maxDistance)) {
    out.push(`${d.id}: camera minDistance must be < maxDistance`);
  }

  const p = d.post;
  if (!p) out.push(`${d.id}: missing post config`);
  else {
    for (const k of ['exposure', 'bloomStrength', 'bloomRadius', 'bloomThreshold', 'vignette', 'grain'] as const) {
      if (!isNum(p[k]) || p[k] < 0) out.push(`${d.id}: post.${k} must be a non-negative number`);
    }
  }

  if (d.nebula?.enabled) {
    if (!isNum(d.nebula.radius) || d.nebula.radius <= 0) out.push(`${d.id}: nebula.radius must be > 0`);
    checkVec3(`${d.id}.nebula.colorA`, d.nebula.colorA, out);
    checkVec3(`${d.id}.nebula.colorB`, d.nebula.colorB, out);
  }

  return out;
}
