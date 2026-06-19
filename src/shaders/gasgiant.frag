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
  float lon = atan(sp.z, sp.x);

  // Each zonal jet flows opposite to its neighbours (prograde/retrograde
  // alternation, like Jupiter's belts and zones). Band index from latitude;
  // even/odd picks the flow sign so adjacent bands shear past one another.
  float bandF = (sp.y * 0.5 + 0.5) * uBandScale;
  float jetDir = mod(floor(bandF), 2.0) * 2.0 - 1.0;

  // Poles are calm: damp shear and churn toward the spin axis.
  float polar = smoothstep(0.5, 0.92, abs(sp.y));
  float activity = 1.0 - polar;

  // Sheared domain-warp: advect the warp field along longitude by the jet's own
  // direction so the churn streaks the way that band is moving.
  vec3 wc = sp * uBandScale * 0.4;
  wc.xz += vec2(cos(lon), sin(lon)) * jetDir * t * 1.6;
  float warp = (fbm(wc + vec3(0.0, t * 0.3, 0.0)) - 0.5) * uTurb * (0.25 + 0.75 * activity);

  // Broad pole-to-pole colour zones from the palette.
  float lat = clamp(sp.y * 0.5 + 0.5 + warp * 0.12, 0.0, 1.0);
  vec3 zone = bandPalette(lat);

  // Light/dark zonal stripes. Sharpen the belt↔zone edges with smoothstep
  // instead of a soft sine ramp so the boundaries read as crisp jet edges.
  float fine = (fbm(vec3(sp.x * 7.0 + jetDir * t, sp.y * uBandScale, sp.z * 7.0)) - 0.5) * 0.13;
  float raw = sin((sp.y + warp * 0.22) * uBandScale * 3.14159) * 0.5 + 0.5;
  float stripe = clamp(smoothstep(0.32, 0.68, raw) + fine, 0.0, 1.0);

  // Festoons: scalloped turbulence concentrated at the band boundaries (where
  // raw≈0.5), curled along longitude — the wavy filaments at jet interfaces.
  float boundary = (1.0 - abs(raw - 0.5) * 2.0);
  float festoon = ridged(vec3(lon * uBandScale * 0.5 + jetDir * t * 2.0,
                              sp.y * uBandScale * 2.0, t * 0.5));
  stripe = clamp(stripe + (festoon - 0.5) * boundary * boundary * 0.5 * activity, 0.0, 1.0);

  vec3 albedo = mix(zone * 0.66, zone * 1.14, stripe);

  // Polar hood: high-altitude haze caps the poles — darker, desaturated, calm.
  float hoodLum = dot(albedo, vec3(0.333));
  albedo = mix(albedo, vec3(hoodLum) * 0.62, polar * 0.6);

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
          // Lightweight match of rings.frag zone density so the cast shadow band
          // shows the same crepe / Cassini / Encke structure as the disc.
          float zC = smoothstep(0.0, 0.16, rn) * (1.0 - smoothstep(0.16, 0.30, rn));
          float zB = smoothstep(0.36, 0.44, rn) * (1.0 - smoothstep(0.62, 0.70, rn));
          float zA = smoothstep(0.68, 0.74, rn);
          float enk = 1.0 - (smoothstep(0.80, 0.815, rn) * (1.0 - smoothstep(0.825, 0.84, rn)));
          float dens = (zC * 0.32 + zB * 1.0 + zA * 0.62) * enk;
          light *= 1.0 - clamp(dens, 0.0, 1.0) * 0.75;
        }
      }
    }
  }

  vec3 color = albedo * light * limb + albedo * 0.015;
  gl_FragColor = vec4(color, 1.0);
}
