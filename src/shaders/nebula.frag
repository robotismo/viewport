#include lib/noise.glsl;

uniform float uTime;
uniform vec3 uCenter;
uniform float uRadius;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uDensity;
uniform float uSteps;
uniform float uSeed;

varying vec3 vWorldPos;

// Lighter 4-octave fbm for the volume march (kept separate from the 5/6-octave
// surface fbm to bound the per-step cost).
float nfbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + 1.7;
    a *= 0.5;
  }
  return s;
}

const int MAXSTEPS = 64;

void main() {
  // Ray from the camera through this fragment; clip to the bounding sphere.
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorldPos - cameraPosition);
  vec3 oc = ro - uCenter;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - uRadius * uRadius;
  float h = b * b - c;
  if (h < 0.0) discard;
  h = sqrt(h);
  float tN = max(-b - h, 0.0);
  float tF = -b + h;
  if (tF <= tN) discard;

  float steps = clamp(uSteps, 8.0, float(MAXSTEPS));
  float dt = (tF - tN) / steps;
  float jitter = hash13(vWorldPos * 13.7 + uTime); // break slice banding
  float t = tN + jitter * dt;

  vec3 col = vec3(0.0);
  float trans = 1.0;

  for (int i = 0; i < MAXSTEPS; i++) {
    if (float(i) >= steps) break;
    vec3 p = ro + rd * t;
    vec3 lp = (p - uCenter) / uRadius;
    float fall = smoothstep(1.0, 0.12, length(lp)); // soft spherical envelope
    if (fall > 0.001) {
      // Threshold + power curve carve filaments and dark lanes out of the fbm.
      float dens = nfbm(lp * 3.2 + uSeed + vec3(0.0, uTime * 0.02, 0.0));
      dens = max(dens - 0.50, 0.0) * fall;
      dens = pow(dens, 1.5) * uDensity;
      if (dens > 0.002) {
        float depth = clamp(length(lp) * 1.1, 0.0, 1.0);
        vec3 emit = mix(uColorB, uColorA, depth);
        col += trans * emit * dens * dt * 0.9;
        trans *= exp(-dens * dt * 1.4);
        if (trans < 0.04) break;
      }
    }
    t += dt;
  }

  gl_FragColor = vec4(col, 1.0); // additive blend; alpha unused
}
