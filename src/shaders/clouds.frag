#include lib/noise.glsl;

uniform float uTime;
uniform vec3 uSunPos;
uniform vec3 uColor;
uniform float uCoverage;
uniform float uSpeed;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalPos;

void main() {
  vec3 sp = normalize(vLocalPos);
  float t = uTime * uSpeed;

  // Domain-warped fbm coverage; the noise domain drifts so weather decouples
  // from the (faster-spinning) cloud mesh and from the continents below.
  vec3 q = sp * 2.6 + vec3(t, 0.0, t * 0.5);
  float wn = fbm3(q * 0.7);
  vec3 warp = vec3(wn, fbm3(q * 0.7 + 5.0), wn * 0.6) - 0.5;
  float cov = fbm(q + warp * 1.3);
  float edge = 1.0 - uCoverage;
  float clouds = smoothstep(edge, edge + 0.22, cov);
  // wispy thinning at cloud edges
  clouds *= 0.6 + 0.4 * smoothstep(edge + 0.05, edge + 0.3, cov);

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunPos - vWorldPos);
  float ndotl = dot(N, L);
  float day = smoothstep(-0.12, 0.30, ndotl);
  float twilight = smoothstep(0.25, 0.0, abs(ndotl));

  // Tops catch warm light at the terminator; near-invisible on the night side.
  vec3 col = uColor * (0.18 + 0.82 * day);
  col = mix(col, col * vec3(1.2, 0.8, 0.6), twilight * 0.5);

  float a = clouds * (0.15 + 0.85 * day);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}
