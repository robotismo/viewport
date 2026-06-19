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

// Henyey-Greenstein phase: forward-peaked for g>0. Used as a cheap Mie lobe so
// the limb pointing toward the sun blooms (forward scatter) instead of glowing
// uniformly around the disc.
float hg(float mu, float g) {
  float g2 = g * g;
  float d = 1.0 + g2 - 2.0 * g * mu;
  return (1.0 - g2) / (12.566370614 * pow(max(d, 1e-3), 1.5));
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunPos - vWorldPos);

  float ndotl = dot(N, L);
  float vdotl = dot(V, L); // forward-scatter axis (camera looking toward sun)
  float fres = 1.0 - max(dot(N, V), 0.0);

  // Two scale heights: Rayleigh is broad/soft (blue sky), Mie is a thin bright
  // line right at the limb (haze).
  float rimRay = pow(fres, 3.0);
  float rimMie = pow(fres, 6.0);

  // Day mask drives all illumination; nothing lights past the terminator.
  float day = smoothstep(-0.10, 0.45, ndotl);

  // Twilight: a NARROW signed band on the lit side of the terminator only, so the
  // warm sunset hugs the day edge as a thin rim and never leaks onto the night.
  float twi = smoothstep(0.16, 0.0, ndotl) * smoothstep(-0.10, 0.05, ndotl);

  // Rayleigh ~ blue, broad; Mie ~ warm, forward-scattered. cosθ = dot(-L,V), so
  // the Mie lobe peaks on the sun-facing limb (matches rings.frag convention).
  float mieF = hg(-vdotl, 0.76);
  vec3 rayleigh = uDayColor * rimRay * day;
  vec3 mie = mix(uDayColor, uTwilightColor, 0.6) * rimMie * day * (0.3 + mieF * 1.0);
  vec3 sunset = uTwilightColor * rimRay * twi * 0.9; // limb-gated thin sunset rim

  vec3 col = rayleigh + mie + sunset;
  float a = (rimRay * day + rimMie * day * (0.15 + mieF * 0.6) + rimRay * twi * 0.9) * uIntensity;
  a = clamp(a, 0.0, 1.0);
  gl_FragColor = vec4(col * uIntensity, a);
}
