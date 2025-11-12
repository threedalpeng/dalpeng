#version 300 es
precision highp float;

uniform sampler2D uLighting;
uniform float uExposure;
uniform float uGamma;

out vec4 outColor;

vec3 tonemapReinhard(vec3 c) { return c / (1.0 + c); }

void main() {
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);
  vec3 color = texelFetch(uLighting, fragCoord, 0).rgb;
  vec3 mapped = tonemapReinhard(color * max(uExposure, 0.0));
  outColor = vec4(pow(mapped, vec3(1.0 / max(uGamma, 1e-6))), 1.0);
}

