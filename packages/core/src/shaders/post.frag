#version 300 es
precision highp float;

uniform sampler2D uLighting;

out vec4 outColor;

vec3 tonemapReinhard(vec3 c) { return c / (1.0 + c); }

void main() {
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);
  vec3 color = texelFetch(uLighting, fragCoord, 0).rgb;
  vec3 mapped = tonemapReinhard(color);
  float gamma = 2.2;
  outColor = vec4(pow(mapped, vec3(1.0 / gamma)), 1.0);
}

