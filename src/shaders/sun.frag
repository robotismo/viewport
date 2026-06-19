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

void main() {
  vec3 p = normalize(vLocalPos);
  float t = uTime * uFlow;
  vec3 q = p * uScale;

  // Convective granulation: two scrolling fbm layers.
  float n1 = fbm6(q + vec3(0.0, t * 0.6, 0.0));
  float n2 = fbm(q * 2.3 - vec3(t * 0.4, 0.0, t * 0.2));
  float gran = n1 * 0.65 + n2 * 0.35;

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

  // Light Reinhard knee so granulation and veins survive the bloom threshold
  // instead of clipping to flat white.
  color *= uIntensity;
  color /= (1.0 + 0.07 * color);
  gl_FragColor = vec4(color, 1.0);
}
