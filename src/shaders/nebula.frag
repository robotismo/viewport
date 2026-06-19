#include lib/noise.glsl;

uniform float uTime;
uniform vec3 uCenter;
uniform float uRadius;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uDensity;
uniform float uSteps;
uniform float uSeed;
uniform vec3 uStarColor;
uniform float uStarIntensity;

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
    if (trans < 0.04) break; // ray saturated (by dust OR gas) — nothing further is visible
    vec3 p = ro + rd * t;
    vec3 lp = (p - uCenter) / uRadius;
    float fall = smoothstep(1.0, 0.12, length(lp)); // soft spherical envelope
    if (fall > 0.001) {
      // Opaque dark dust knots (Bok globules) absorb BEFORE emission, so they
      // silhouette the gas behind them — the contrast anchors the structure.
      float dust = smoothstep(0.55, 0.78, nfbm(lp * 2.0 + 13.0)) * fall;
      trans *= exp(-dust * 9.0 * dt);

      // Threshold + power curve carve filaments and dark lanes out of the fbm.
      float dens = nfbm(lp * 3.2 + uSeed + vec3(0.0, uTime * 0.02, 0.0));
      dens = max(dens - 0.50, 0.0) * fall;
      dens = pow(dens, 1.5) * uDensity;
      if (dens > 0.002) {
        float distC = length(lp);
        float depth = clamp(distC * 1.1, 0.0, 1.0);
        vec3 emit = mix(uColorB, uColorA, depth);

        // SECOND EMISSION REGION — an O-III oxygen-teal ionization front. O-III is
        // emitted by the most highly-ionised gas, so it's biased toward the core
        // near the hot star and broken up by its own object-space field; the
        // magenta H-alpha then dominates the outer envelope. Two interleaved
        // colours + a distinct structure, not one radial gradient. One cheap
        // 3-octave fbm bounds the per-step cost.
        float oxyField = vnoise(lp * 2.4 - vec3(7.0, uTime * 0.015, 2.0));
        float oxyCore = smoothstep(0.85, 0.15, distC); // strong toward the centre
        float oxy = smoothstep(0.38, 0.72, oxyField) * oxyCore;
        vec3 oiii = vec3(0.10, 0.85, 0.78); // teal O-III
        emit = mix(emit, oiii, clamp(oxy * 1.15, 0.0, 0.92));
        // Ionised edge glow where the O-III front breaks into the H-alpha gas.
        emit += oiii * smoothstep(0.30, 0.45, oxy) * (1.0 - smoothstep(0.45, 0.7, oxy)) * 0.5;

        // THIRD EMISSION TIER — S-II deep-red/gold from the least-ionised gas on
        // the OUTER envelope (the spatial complement of the core-biased O-III),
        // broken by its own object-space field. Completes the SHO palette so the
        // rim glows warm instead of fading to flat magenta.
        float sulfField = vnoise(lp * 1.9 + vec3(3.0, uTime * 0.012, 8.0));
        float sulfShell = smoothstep(0.45, 0.95, distC); // strong toward the rim
        float sulf = smoothstep(0.40, 0.74, sulfField) * sulfShell;
        vec3 sii = vec3(0.95, 0.28, 0.16); // deep-red S-II
        emit = mix(emit, sii, clamp(sulf * 0.85, 0.0, 0.7));

        // Analytic in-scatter from the embedded star: warm core falling off into
        // the magenta/blue gas, with a forward-scatter phase along the ray.
        float glow = exp(-distC * 4.0);
        float phase = 0.5 + 0.5 * dot(rd, normalize(uCenter - p + 1e-5));
        emit += uStarColor * uStarIntensity * glow * (0.4 + 0.6 * phase);
        col += trans * emit * dens * dt * 0.9;
        trans *= exp(-dens * dt * 1.4);
        if (trans < 0.04) break;
      }
    }
    t += dt;
  }

  gl_FragColor = vec4(col, 1.0); // additive blend; alpha unused
}
