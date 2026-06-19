// Analytic atmospheric shell. Rendered FrontSide so the Fresnel limb term falls
// off cleanly (≈0 at disc centre → ≈1 at the limb), giving an airglow ring that
// hugs the planet edge. Gated by the sun so it only lights the day side, warming
// to a narrow sunset band across the terminator.
uniform vec3 uSunPos;
uniform vec3 uDayColor;
uniform vec3 uTwilightColor;
uniform float uIntensity;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunPos - vWorldPos);

  float ndotl = dot(N, L);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.5);
  float day = smoothstep(-0.12, 0.45, ndotl);
  float twi = smoothstep(0.30, 0.0, abs(ndotl)); // narrow terminator band

  vec3 col = mix(uDayColor, uTwilightColor, twi);
  float a = rim * (day + twi * 0.6) * uIntensity;
  gl_FragColor = vec4(col * a, clamp(a, 0.0, 1.0));
}
