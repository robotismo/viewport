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

  // Combine: a soft base so the limb never fully gaps, plus structured plumes.
  float structure = 0.45 + 0.85 * streamers + 0.35 * wisp;
  float a = glow * structure;
  gl_FragColor = vec4(uColor * uIntensity * a, a);
}
