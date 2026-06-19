#include lib/noise.glsl;

uniform float uTime;
uniform vec3 uSunPos;
uniform vec3 uBands[6];
uniform int uBandCount;
uniform float uBandScale;
uniform float uTurb;
uniform float uFlow;
uniform vec3 uSpot;
uniform float uHasSpot;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalPos;

vec3 bandPalette(float t) {
  t = clamp(t, 0.0, 0.9999);
  float f = t * float(uBandCount - 1);
  int i = int(floor(f));
  return mix(uBands[i], uBands[i + 1], fract(f));
}

void main() {
  vec3 sp = normalize(vLocalPos);
  float t = uTime * uFlow;

  // Domain-warp latitude so bands shear and churn like real Jovian flow.
  float warp = (fbm(sp * uBandScale * 0.4 + vec3(t, 0.0, t * 0.4)) - 0.5) * uTurb;

  // Broad pole-to-pole colour zones from the palette.
  float lat = clamp(sp.y * 0.5 + 0.5 + warp * 0.12, 0.0, 1.0);
  vec3 zone = bandPalette(lat);

  // High-contrast light/dark zonal stripes on top of the colour zones.
  float fine = (fbm(vec3(sp.x * 7.0 + t, sp.y * uBandScale, sp.z * 7.0)) - 0.5) * 0.15;
  float stripe = clamp(sin((sp.y + warp * 0.22) * uBandScale * 3.14159) * 0.5 + 0.5 + fine, 0.0, 1.0);
  vec3 albedo = mix(zone * 0.66, zone * 1.14, stripe);

  // A great storm: a warped oval that swirls slowly.
  if (uHasSpot > 0.5) {
    float lon = atan(sp.z, sp.x) + 0.15 * sin(t + sp.y * 4.0);
    vec2 d = vec2(lon - 0.7, (sp.y + 0.18) * 2.2);
    float spot = smoothstep(0.55, 0.08, length(d));
    float swirl = fbm(vec3(d * 6.0, t)) * 0.4;
    albedo = mix(albedo, uSpot, spot * (0.75 + swirl));
  }

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndotl = dot(N, L);
  float light = smoothstep(-0.12, 0.42, ndotl);
  float limb = pow(max(dot(N, V), 0.0), 0.45); // limb darkening

  vec3 color = albedo * light * limb + albedo * 0.015;
  gl_FragColor = vec4(color, 1.0);
}
