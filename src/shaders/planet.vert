// Shared planet vertex shader. Surface noise samples vLocalPos (object space,
// rotates with the mesh); lighting uses vWorldNormal/vWorldPos so the
// terminator stays locked to the sun while the surface spins beneath it.
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalPos;

void main() {
  vLocalPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
