#version 300 es
precision highp float;

uniform sampler2D uLighting;
uniform float uExposure;
uniform float uGamma;
uniform int uToneMap;        // 0: gamma only (bypass Reinhard), 1: full tone mapping

// Bloom
uniform int uEnableBloom;
uniform sampler2D uBloom;
uniform float uBloomIntensity;

out vec4 outColor;

vec3 tonemapReinhard(vec3 c) { return c / (1.0 + c); }

void main() {
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);
  vec3 color = texelFetch(uLighting, fragCoord, 0).rgb;

  if (uEnableBloom == 1) {
    ivec2 bloomSize = textureSize(uBloom, 0);
    if (bloomSize.x > 0 && bloomSize.y > 0) {
      vec2 bloomUV = gl_FragCoord.xy / (vec2(bloomSize) * 2.0);
      color += texture(uBloom, bloomUV).rgb * uBloomIntensity;
    }
  }

  // Clamp to non-negative: pow(negative, fractional) is undefined in GLSL → NaN → black
  color = max(color, vec3(0.0));

  vec3 mapped;
  if (uToneMap == 1) {
    mapped = tonemapReinhard(color * max(uExposure, 0.0));
  } else {
    mapped = color;
  }
  outColor = vec4(pow(mapped, vec3(1.0 / max(uGamma, 1e-6))), 1.0);
}
