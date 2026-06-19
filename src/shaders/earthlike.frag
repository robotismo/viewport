#include lib/noise.glsl;

uniform float uTime;
uniform vec3 uSunPos;
uniform vec3 uLand;
uniform vec3 uOcean;
uniform vec3 uIce;
uniform vec3 uNightLights;
uniform float uSeed;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalPos;

void main() {
  vec3 sp = normalize(vLocalPos);
  vec3 p = sp * 2.2 + uSeed;

  // Domain-warped continents → fractal coastlines with peninsulas and inlets,
  // not isotropic amoeba blobs. Cheap fbm3 for the warp; ridged carves the coast.
  float wn = fbm3(p * 0.8);
  vec3 w = vec3(wn, fbm3(p * 0.8 + 4.0), wn * 0.6) - 0.5;
  float continents = fbm6(p * 1.25 + w * 1.5);
  float coast = (ridged(p * 2.2) - 0.5) * 0.12;
  float h = continents + coast;

  float land = smoothstep(0.50, 0.53, h);
  float shelf = smoothstep(0.47, 0.505, h) * (1.0 - land); // shallow water

  // Polar ice, ragged at the edge.
  float lat = abs(sp.y);
  float ice = smoothstep(0.74, 0.9, lat + (fbm(p * 3.0) - 0.5) * 0.25);

  // Vegetation/desert variation on land.
  float biome = fbm(p * 2.5 + 7.0);
  vec3 landCol = mix(uLand * 0.65, uLand, biome);

  vec3 albedo = mix(uOcean, landCol, land);
  albedo = mix(albedo, uOcean * 1.7 + vec3(0.0, 0.06, 0.05), shelf);
  albedo = mix(albedo, uIce, ice);

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndotl = dot(N, L);

  // Soft terminator.
  float lightAmt = smoothstep(-0.08, 0.30, ndotl);
  vec3 color = albedo * lightAmt;

  // Night-side city lights. Two-tier grid: a coarse "civilization" mask picks a
  // few inhabited regions, a fine lattice scatters individual point-lights inside
  // them. Both are biased toward coastlines — land near the shelf/sea (low h just
  // above the shoreline) lights up, deep interiors and ice stay dark.
  float night = smoothstep(0.06, -0.12, ndotl);
  // Broad city-light field: glowing inhabited patches on land, brighter near the
  // coast, with a slow flicker so the constellations feel alive. (Point-lattice
  // dots were sub-pixel at viewing distance; broad patches read far better.)
  float cityCoast = 0.6 + 0.4 * smoothstep(0.6, 0.515, h);
  float cityField = smoothstep(0.56, 0.80, fbm(p * 8.0 + 3.0)) * land * (1.0 - ice) * cityCoast;
  float tw = 0.78 + 0.22 * sin(uTime * 2.0 + fbm(p * 30.0) * 28.0);
  color += uNightLights * cityField * night * tw * 1.9;

  // Polar aurora: faint emissive curtains over the night-side poles. A ragged
  // latitude oval hosts vertical folds that scroll slowly in longitude and
  // shimmer on uTime — a green body with a faint magenta lower fringe. Additive
  // and night-gated, so the lit hemisphere is never touched.
  float auroraOval = smoothstep(0.62, 0.80, lat + (fbm(p * 4.0) - 0.5) * 0.18)
                   * (1.0 - smoothstep(0.86, 0.97, lat));
  float folds = fbm3(vec3(sp.x, sp.z, 0.0) * 9.0 + vec3(uTime * 0.25, 0.0, 0.0));
  float curtain = pow(smoothstep(0.42, 0.78, folds), 1.5);
  float shimmer = 0.7 + 0.3 * sin(uTime * 3.0 + folds * 24.0);
  float aurora = auroraOval * curtain * shimmer * night;
  vec3 auroraCol = mix(vec3(0.10, 0.95, 0.55), vec3(0.65, 0.20, 0.85),
                       smoothstep(0.80, 0.62, lat) * 0.6);
  color += auroraCol * aurora * 1.1;

  // Sun glint off oceans (day side only). Elliptical streak, not a round hotspot:
  // the highlight is stretched along the sun-azimuth (the tangent component of L)
  // so it reads as a reflection of the sun's column on water. Fresnel brightens it
  // toward grazing angles, and a smoothstep on the lobe AAs the edge with no dFdx.
  float ndv = max(dot(N, V), 0.0);
  vec3 Ltv = L - N * ndotl;                // sun direction projected onto surface
  vec3 Lt = Ltv * inversesqrt(max(dot(Ltv, Ltv), 1e-8)); // safe normalize (zero at sub-solar point)
  vec3 R = reflect(-V, N);
  vec3 Rt = R - N * dot(R, N);             // view-reflection tangent component
  float along = dot(Rt, Lt);
  float across = length(Rt - Lt * along);
  // Anisotropic falloff: tight across the streak, loose along it.
  float glint = exp(-(along * along * 14.0 + across * across * 90.0));
  float fresnel = 0.04 + 0.96 * pow(1.0 - ndv, 5.0); // Schlick, water F0≈0.02
  float water = (1.0 - land) * (1.0 - ice);
  color += vec3(1.0, 0.97, 0.88) * glint * fresnel * water * clamp(ndotl, 0.0, 1.0) * 1.3;

  gl_FragColor = vec4(color, 1.0);
}
