#version 300 es

in vec2 aPosition;

out vec2 vTexcoord;

void main() {
  vTexcoord = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
