#version 300 es

precision highp float;

in vec3 aPosition;

uniform mat4 uModel;
uniform mat4 uLightViewProj;

void main() {
  gl_Position = uLightViewProj * (uModel * vec4(aPosition, 1.0));
}

