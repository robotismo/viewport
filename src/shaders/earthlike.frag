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

  // Night-side city lights, clustered on land away from ice.
  float night = smoothstep(0.06, -0.12, ndotl);
  float cities = smoothstep(0.62, 0.80, fbm(p * 9.0 + 3.0)) * land * (1.0 - ice);
  color += uNightLights * cities * night * 1.6;

  // Tight specular glint off oceans (day side only).
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 260.0) * (1.0 - land) * (1.0 - ice);
  color += vec3(1.0, 0.97, 0.88) * spec * clamp(ndotl, 0.0, 1.0) * 0.4;

  gl_FragColor = vec4(color, 1.0);
}
