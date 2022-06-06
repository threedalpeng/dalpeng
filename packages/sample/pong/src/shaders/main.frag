#version 300 es

precision highp float;

in vec3 v_color;

out vec4 outColor;

void main() {
  outColor = vec4(v_color, 1);
}