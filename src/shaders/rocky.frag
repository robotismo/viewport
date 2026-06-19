#include lib/noise.glsl;

uniform vec3 uSunPos;
uniform vec3 uRockA;
uniform vec3 uRockB;
uniform vec3 uIce;
uniform float uSeed;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalPos;

void main() {
  vec3 sp = normalize(vLocalPos);
  vec3 p = sp * 2.4 + uSeed;

  // Two rock tones over fbm, plus fine speckle.
  float a1 = fbm6(p * 1.3);
  vec3 albedo = mix(uRockB, uRockA, smoothstep(0.35, 0.65, a1));
  albedo *= 0.88 + 0.24 * fbm3(p * 9.0);

  // Crater rings: a thin annulus where the mid-freq field crosses a threshold.
  float cr = fbm(p * 4.0 + 9.0);
  float crater = smoothstep(0.60, 0.64, cr) * (1.0 - smoothstep(0.64, 0.70, cr));
  albedo *= 1.0 - crater * 0.45;

  // Optional polar frost.
  float ice = smoothstep(0.84, 0.96, abs(sp.y));
  albedo = mix(albedo, uIce, ice * 0.6);

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndotl = dot(N, L);
  float light = smoothstep(-0.1, 0.35, ndotl);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 4.0) * 0.12;

  vec3 color = albedo * light + albedo * 0.02 + uRockA * rim * light;
  gl_FragColor = vec4(color, 1.0);
}
