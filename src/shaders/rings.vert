uniform float uInner;
uniform float uOuter;

varying float vRadial; // 0 at inner edge → 1 at outer edge
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

void main() {
  float r = length(position.xy); // RingGeometry lies in the XY plane
  vRadial = (r - uInner) / (uOuter - uInner);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
