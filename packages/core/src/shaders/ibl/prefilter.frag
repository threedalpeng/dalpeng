#version 300 es
precision highp float;

in vec3 vLocalDir;
uniform samplerCube uEnvironment;
uniform float uRoughness;
out vec4 outColor;

#include "../include/constants.glsl"
#include "../include/sampling.glsl"

void main() {
  vec3 N = normalize(vLocalDir);
  vec3 R = N;
  vec3 V = R;

  float totalWeight = 0.0;
  vec3 prefilteredColor = vec3(0.0);

  for (uint i = 0u; i < SAMPLE_COUNT; i++) {
    vec2 Xi = Hammersley(i, SAMPLE_COUNT);
    vec3 H = ImportanceSampleGGX(Xi, N, uRoughness);
    vec3 L = normalize(2.0 * dot(V, H) * H - V);

    float NdotL = max(dot(N, L), 0.0);
    if (NdotL > 0.0) {
      prefilteredColor += texture(uEnvironment, L).rgb * NdotL;
      totalWeight += NdotL;
    }
  }
  prefilteredColor /= max(totalWeight, 0.001);
  outColor = vec4(prefilteredColor, 1.0);
}
