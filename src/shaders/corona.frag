#include lib/noise.glsl;

uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;

varying vec3 vViewPos;
varying vec3 vNormal;
varying vec3 vLocalPos;

// Additive corona shell: bright at the limb, structured into radial streamers
// and plumes that are anchored in OBJECT space, so they stay fixed to the star
// instead of swimming across the disc as the camera orbits. The limb falloff
// still tracks the view-space silhouette, which is correct.
void main() {
  vec3 V = normalize(-vViewPos);
  float rim = 1.0 - max(dot(normalize(vNormal), V), 0.0);
  float glow = pow(rim, 3.0);

  // Stable direction on the corona shell (object space, never rotated here).
  vec3 dir = normalize(vLocalPos);

  // Coarse magnetic streamers: a few bright radial helmet structures placed by a
  // low-frequency object-space field, sharpened with a power curve so the gaps
  // between plumes read as dark lanes. Slow breathing on uTime.
  float streamers = fbm3(dir * 3.0 + vec3(0.0, 0.0, uTime * 0.05));
  streamers = pow(smoothstep(0.35, 0.85, streamers), 1.6);

  // Fine wisps riding on top, also object-space so they convect with the star
  // rather than the viewer. Slow vertical drift simulates outflow.
  float wisp = fbm(dir * 7.0 + vec3(0.0, uTime * 0.12, 0.0));

  // H-alpha PROMINENCES: bright plasma loops arcing off the limb. Placed by a
  // low-frequency OBJECT-SPACE field so each loop stays anchored to the star and
  // never swims with the camera. Loops are carved into discrete bodies, broken
  // into filament threads, and each erupts/fades on its own slow phase.
  float loopField = fbm3(dir * 5.0 + vec3(7.3, 2.1, 0.0));     // where loops live
  float arcs = smoothstep(0.55, 0.78, loopField);              // discrete loop bodies
  float fil = fbm(dir * 14.0 + vec3(0.0, uTime * 0.25, 0.0));  // thread texture along loops
  arcs *= smoothstep(0.35, 0.70, fil);                         // break into bright threads
  float phase = uTime * 0.06 + loopField * 6.2831;            // per-loop eruption cycle
  float erupt = 0.35 + 0.65 * (0.5 + 0.5 * sin(phase));
  float limbShell = pow(rim, 2.0) * (1.0 - pow(rim, 6.0));    // hug the limb, fade outward
  float prom = arcs * erupt * limbShell;
  vec3 hAlpha = vec3(1.0, 0.16, 0.12);                        // chromospheric H-alpha red

  // Combine: a soft base so the limb never fully gaps, plus structured plumes
  // and the additive H-alpha prominences riding on top.
  float structure = 0.45 + 0.85 * streamers + 0.35 * wisp;
  float a = glow * structure + prom * 0.9;
  vec3 col = uColor * uIntensity * a + hAlpha * uIntensity * prom * 2.2;
  gl_FragColor = vec4(col, a);
}
