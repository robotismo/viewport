#include lib/noise.glsl;

uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;

varying vec3 vViewPos;
varying vec3 vNormal;

// Additive corona shell: bright at the limb, wispy, fading outward.
void main() {
  vec3 V = normalize(-vViewPos);
  float rim = 1.0 - max(dot(normalize(vNormal), V), 0.0);
  float glow = pow(rim, 3.0);
  float wisp = 0.7 + 0.6 * fbm(vNormal * 6.0 + vec3(0.0, uTime * 0.15, 0.0));
  float a = glow * wisp;
  gl_FragColor = vec4(uColor * uIntensity * a, a);
}
