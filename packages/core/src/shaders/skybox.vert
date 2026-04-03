#version 300 es
precision highp float;

layout(location=0) in vec3 aPosition;

uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vLocalDir;

void main() {
  vLocalDir = aPosition;
  mat4 rotView = mat4(mat3(uView)); // strip translation
  vec4 pos = uProjection * rotView * vec4(aPosition, 1.0);
  gl_Position = pos.xyww; // depth = w/w = 1.0
}
