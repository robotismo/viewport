#include lib/noise.glsl;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uIntensity;
uniform float uScale;
uniform float uFlow;

varying vec3 vLocalPos;
varying vec3 vViewPos;
varying vec3 vNormal;

// Cheap 3D Worley F1 (cellular). Returns the distance to the nearest feature
// point in a jittered lattice — small inside a granule, large on the lane
// network between cells. Reuses hash33 from lib/noise.glsl. Constant loop
// bounds keep this GLSL ES 1.00 safe.
float worleyF1(vec3 x) {
  vec3 ip = floor(x);
  vec3 fp = fract(x);
  float f1 = 1.0;
  for (int k = -1; k <= 1; k++) {
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec3 g = vec3(float(i), float(j), float(k));
        vec3 o = hash33(ip + g);
        vec3 d = g + o - fp;
        f1 = min(f1, dot(d, d));
      }
    }
  }
  return sqrt(f1);
}

void main() {
  vec3 p = normalize(vLocalPos);
  float t = uTime * uFlow;
  vec3 q = p * uScale;

  // Convective granulation: two scrolling fbm layers.
  float n1 = fbm6(q + vec3(0.0, t * 0.6, 0.0));
  float n2 = fbm(q * 2.3 - vec3(t * 0.4, 0.0, t * 0.2));
  float gran = n1 * 0.65 + n2 * 0.35;

  // Intergranular network: a Worley cellular field at ~granule scale. Cell
  // interiors (small F1) are hot upwelling plasma — brightened and warmed;
  // the boundaries (large F1) are cool down-flow lanes — darkened into a thin
  // polygonal mesh. Slow object-space drift so cells churn in place.
  float cell = worleyF1(q * 1.6 + vec3(0.0, t * 0.5, 0.0));
  float lane = smoothstep(0.34, 0.62, cell);      // 0 in cell, 1 on the lane
  float core = 1.0 - smoothstep(0.0, 0.30, cell); // bright granule interior
  gran = gran + core * 0.10 - lane * 0.14;

  vec3 base = mix(uColor, uHot, smoothstep(0.30, 0.78, gran));
  float veins = pow(max(gran, 0.0), 3.0);
  vec3 color = base + uHot * veins * 0.8;

  // Sparse, slow sunspots (dark umbra).
  float spot = smoothstep(0.60, 0.70, fbm(q * 0.7 + vec3(11.0, t * 0.05, 3.0)));
  color *= 1.0 - spot * 0.6;

  // Limb DARKENING — the photosphere edge is cooler and dimmer. μ = cos(angle to
  // view); the disc centre is brightest. A tight hot rim hints at the chromosphere.
  vec3 V = normalize(-vViewPos);
  float mu = max(dot(normalize(vNormal), V), 0.0);
  color *= 0.66 + 0.34 * mu;
  color += uHot * pow(1.0 - mu, 4.0) * 0.9;

  // H-alpha CHROMOSPHERE: a thin reddish band just inside the limb, broken into
  // spicule-like jets by object-space noise so it flickers in place instead of
  // smearing as the camera orbits. Reuses gran's high frequencies for the jets.
  float band = smoothstep(0.18, 0.0, mu) * smoothstep(0.0, 0.05, mu);
  // Gate the band into discrete jets that reach 0 in the gaps, so the limb reads
  // as a jagged spicule rim rather than a continuous ring. Higher frequency = thin spikes.
  float jets = smoothstep(0.42, 0.72, fbm3(p * (uScale * 3.0) + vec3(0.0, t * 1.5, 0.0)));
  vec3 hAlpha = vec3(1.0, 0.22, 0.16); // linear-ish H-alpha red
  color += hAlpha * band * jets * 1.8;

  // Light Reinhard knee so granulation and veins survive the bloom threshold
  // instead of clipping to flat white.
  color *= uIntensity;
  color /= (1.0 + 0.07 * color);
  gl_FragColor = vec4(color, 1.0);
}
