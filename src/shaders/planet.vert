// Shared planet vertex shader. Surface noise samples vLocalPos (object space,
// rotates with the mesh); lighting uses vWorldNormal/vWorldPos so the
// terminator stays locked to the sun while the surface spins beneath it.
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalPos;
varying vec3 vViewPos;
varying vec2 vUv;

void main() {
  vUv = uv;
  vLocalPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
