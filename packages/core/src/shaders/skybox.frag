#version 300 es
precision highp float;
precision highp samplerCube;

in vec3 vLocalDir;

uniform samplerCube uSkybox;
uniform float uExposure;

out vec4 outColor;

void main() {
  vec3 color = texture(uSkybox, vLocalDir).rgb * uExposure;
  outColor = vec4(color, 1.0);
}
