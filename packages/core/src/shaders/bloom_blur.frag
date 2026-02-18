#version 300 es
precision highp float;

// Bloom texture to blur (ping-pong between two half-res RTs)
uniform sampler2D uSource;
// Blur direction: (1.0, 0.0) for horizontal pass, (0.0, 1.0) for vertical pass
uniform vec2 uDirection;
// Reciprocal of the texture dimensions: vec2(1.0 / width, 1.0 / height)
uniform vec2 uTexelSize;

out vec4 outColor;

// 9-tap Gaussian kernel weights (sigma ~3.0).
// Weights are symmetric; index 0 is the center tap.
// Sum of all 9 taps: w[0] + 2*(w[1]+w[2]+w[3]+w[4]) ~= 1.0
const float w[5] = float[](0.227027, 0.194596, 0.121622, 0.054054, 0.016216);

void main() {
  // UV coordinates for the current fragment in [0, 1] space
  vec2 uv = gl_FragCoord.xy * uTexelSize;

  // One texel step in the blur direction
  vec2 step = uDirection * uTexelSize;

  // Center tap
  vec3 result = texture(uSource, uv).rgb * w[0];

  // Symmetric taps — bilinear filtering (texture()) helps blend between texels,
  // which improves quality over nearest-neighbor sampling at no extra cost.
  result += texture(uSource, uv + step * 1.0).rgb * w[1];
  result += texture(uSource, uv - step * 1.0).rgb * w[1];
  result += texture(uSource, uv + step * 2.0).rgb * w[2];
  result += texture(uSource, uv - step * 2.0).rgb * w[2];
  result += texture(uSource, uv + step * 3.0).rgb * w[3];
  result += texture(uSource, uv - step * 3.0).rgb * w[3];
  result += texture(uSource, uv + step * 4.0).rgb * w[4];
  result += texture(uSource, uv - step * 4.0).rgb * w[4];

  outColor = vec4(result, 1.0);
}
