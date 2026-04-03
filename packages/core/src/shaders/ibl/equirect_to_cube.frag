#version 300 es
precision highp float;

in vec3 vLocalDir;
uniform sampler2D uEquirect;
out vec4 outColor;

#include "../include/constants.glsl"
const vec2 invAtan = vec2(0.1591, 0.3183); // 1/(2*PI), 1/PI

void main() {
  vec3 d = normalize(vLocalDir);
  vec2 uv = vec2(atan(d.z, d.x), asin(d.y));
  uv *= invAtan;
  uv += 0.5;
  uv.y = 1.0 - uv.y; // HDR data is top-first, WebGL textures are bottom-first
  outColor = vec4(texture(uEquirect, uv).rgb, 1.0);
}
