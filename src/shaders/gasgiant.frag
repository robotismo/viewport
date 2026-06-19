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
uniform float uHasRings;
uniform vec3 uRingNormal;
uniform vec3 uPlanetCenter;
uniform float uRingInner;
uniform float uRingOuter;

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

  // A great storm: a differentially-rotating vortex with a bright collar.
  if (uHasSpot > 0.5) {
    float lon = atan(sp.z, sp.x);
    vec2 d = vec2(lon - 0.7, (sp.y + 0.18) * 2.2);
    float rad = length(d);
    // tighter rotation toward the eye + global drift
    float ang = (0.6 - rad) * 4.0 + t * 1.5;
    float ca = cos(ang), sa = sin(ang);
    vec2 dr = mat2(ca, sa, -sa, ca) * d;
    float turb = ridged(vec3(dr * 5.0, t * 0.3));
    float spot = smoothstep(0.55, 0.06, rad);
    vec3 spotCol = mix(uSpot, uSpot * 1.35, turb);
    albedo = mix(albedo, spotCol, spot);
    // bright high-altitude collar ring just outside the eye
    float collar = smoothstep(0.52, 0.44, rad) * smoothstep(0.36, 0.44, rad);
    albedo += vec3(0.16, 0.11, 0.06) * collar;
  }

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndotl = dot(N, L);
  float light = smoothstep(-0.12, 0.42, ndotl);
  float limb = pow(max(dot(N, V), 0.0), 0.45); // limb darkening

  // Ring shadow on the clouds: trace toward the sun to the equatorial ring
  // plane; if it lands within the annulus, darken by the ringlet density there.
  if (uHasRings > 0.5) {
    float denom = dot(L, uRingNormal);
    if (abs(denom) > 1e-4) {
      float tt = dot(uPlanetCenter - vWorldPos, uRingNormal) / denom;
      if (tt > 0.0) {
        float rr = length((vWorldPos + L * tt) - uPlanetCenter);
        if (rr > uRingInner && rr < uRingOuter) {
          float rn = (rr - uRingInner) / (uRingOuter - uRingInner);
          float dens = 0.55 + 0.45 * sin(rn * 70.0);
          float cassini = smoothstep(0.015, 0.05, abs(rn - 0.46));
          light *= 1.0 - clamp(dens * cassini, 0.0, 1.0) * 0.75;
        }
      }
    }
  }

  vec3 color = albedo * light * limb + albedo * 0.015;
  gl_FragColor = vec4(color, 1.0);
}
