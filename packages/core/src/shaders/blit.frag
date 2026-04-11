#version 300 es
precision highp float;

uniform sampler2D uSource;

in vec2 vTexcoord;

out vec4 outColor;

void main() {
  outColor = texture(uSource, vTexcoord);
}
