#version 300 es
precision highp float;

layout(location=0) in vec3 aPosition;

uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vLocalDir;

void main() {
  vLocalDir = aPosition;
  gl_Position = uProjection * uView * vec4(aPosition, 1.0);
}
