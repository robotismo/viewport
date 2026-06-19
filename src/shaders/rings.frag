#include lib/noise.glsl;

uniform vec3 uSunPos;
uniform vec3 uColor;
uniform float uOpacity;
uniform vec3 uPlanetCenter;
uniform float uPlanetRadius;

varying float vRadial;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

void main() {
  float r = clamp(vRadial, 0.0, 1.0);

  // Concentric ringlets as weighted octaves: a few incommensurate frequencies
  // sum to a non-repeating radial profile, far richer than one sine.
  float ringlets = 0.5
    + 0.26 * sin(r * 70.0)
    + 0.14 * sin(r * 131.0 + 1.3)
    + 0.07 * sin(r * 233.0 + 2.7);
  ringlets = clamp(ringlets, 0.0, 1.0);
  float grain = 0.7 + 0.6 * fbm(vec3(r * 48.0, 7.0, 0.0));

  // Named zones, inner→outer: C (faint inner "crepe"), Cassini division, then
  // the bright B zone, then the A zone with the narrow Encke gap near its edge.
  float zoneC = smoothstep(0.0, 0.16, r) * (1.0 - smoothstep(0.16, 0.30, r)); // crepe
  float cassini = smoothstep(0.30, 0.36, r) * (1.0 - smoothstep(0.44, 0.50, r)); // gap
  float zoneB = smoothstep(0.36, 0.44, r) * (1.0 - smoothstep(0.62, 0.70, r));
  float zoneA = smoothstep(0.68, 0.74, r);
  // Encke gap: a thin division cut out of the A zone.
  float encke = 1.0 - (smoothstep(0.80, 0.815, r) * (1.0 - smoothstep(0.825, 0.84, r)));

  // Per-zone base opacity: the crepe ring is wispy and translucent, B densest.
  float zoneDensity = zoneC * 0.32 + cassini * 0.06 + zoneB * 1.0 + zoneA * 0.62;
  float density = clamp(ringlets * grain * zoneDensity * encke, 0.0, 1.0);

  // Fade both edges so the disc doesn't end on a hard line.
  density *= smoothstep(0.0, 0.05, r) * smoothstep(1.0, 0.94, r);

  // Radius colour tint: cool, dim ice in the inner crepe → warmer, brighter
  // weathered ice outward. Keeps the configured colour as the mid anchor.
  vec3 tint = mix(vec3(0.78, 0.84, 0.95), vec3(1.08, 1.02, 0.9), smoothstep(0.1, 0.85, r));

  // Lit from either face (double-sided debris disc), with a phase function:
  // a Henyey-Greenstein forward lobe so backlit ice glows, plus a narrow
  // opposition surge on the near (anti-sun) arc.
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float cosPhase = dot(-L, V);
  float g = 0.6;
  float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosPhase, 1.5);
  float opp = smoothstep(0.85, 1.0, -cosPhase);
  float lit = mix(0.3, 1.0, abs(dot(N, L))) * (1.0 + hg * 0.5 + opp * 0.6);

  // Planet shadow: cast a ray from this ring fragment toward the sun and test
  // it against the planet sphere. If the planet is in the way, we're in shadow.
  vec3 oc = vWorldPos - uPlanetCenter;
  float b = dot(oc, L);
  float c = dot(oc, oc) - uPlanetRadius * uPlanetRadius;
  float h = b * b - c;
  float shadow = 1.0;
  if (h > 0.0 && (-b - sqrt(h)) > 0.0) {
    shadow = 0.18;
  }

  vec3 color = uColor * tint * lit * shadow;
  gl_FragColor = vec4(color, density * uOpacity);
}
