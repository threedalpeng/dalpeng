#version 300 es
precision highp float;

uniform sampler2D uAtlas;

in vec2 vTexcoord;
in vec4 vTint;

out vec4 outColor;

void main() {
  vec4 texColor = texture(uAtlas, vTexcoord);
  outColor = texColor * vTint;
  if (outColor.a < 0.01) discard;
}
