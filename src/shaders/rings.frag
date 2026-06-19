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

  // Concentric ringlets + a wide Cassini-style division around mid-radius.
  float ringlets = 0.55 + 0.45 * sin(r * 70.0);
  float cassini = smoothstep(0.015, 0.05, abs(r - 0.46));
  float grain = 0.7 + 0.6 * fbm(vec3(r * 48.0, 7.0, 0.0));
  float density = clamp(ringlets * cassini * grain, 0.0, 1.0);

  // Fade both edges so the disc doesn't end on a hard line.
  density *= smoothstep(0.0, 0.05, r) * smoothstep(1.0, 0.94, r);

  // Lit from either face (double-sided debris disc).
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunPos - vWorldPos);
  float lit = mix(0.35, 1.0, abs(dot(N, L)));

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

  vec3 color = uColor * lit * shadow;
  gl_FragColor = vec4(color, density * uOpacity);
}
