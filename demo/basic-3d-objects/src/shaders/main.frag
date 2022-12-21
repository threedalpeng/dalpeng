#version 300 es

precision highp float;

uniform vec4 uBaseColor;

in vec3 vNormal;
in vec2 vTexcoord;

out vec4 outColor;

void main() {
  vNormal;
  vTexcoord;
  outColor = uBaseColor;
}