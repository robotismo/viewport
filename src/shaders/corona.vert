varying vec3 vViewPos;
varying vec3 vNormal;
varying vec3 vLocalPos; // object-space dir — corona structure that doesn't swim with the camera

void main() {
  vLocalPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
