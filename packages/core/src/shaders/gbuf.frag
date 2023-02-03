#version 300 es

precision highp float;

in vec3 vPos;
in vec3 vNormal;
in vec2 vTexcoord;

uniform float uMetallic;
uniform float uRoughness;
uniform vec3 uBaseColor;
uniform vec3 uEmissive;

layout(location = 0) out vec4 gPositionMetallic;
layout(location = 1) out vec4 gNormalRoughness;
layout(location = 2) out vec4 gAlbedo;
layout(location = 3) out vec4 gEmissive;

void main() {
  vec2 uv = vTexcoord;
  gPositionMetallic.rgb = vPos;
  gPositionMetallic.a = uMetallic;
  gNormalRoughness.rgb = vNormal;
  gNormalRoughness.a = uRoughness;
  gAlbedo.rgb = uBaseColor.rgb;
  gEmissive.rgb = uEmissive.rgb;
}