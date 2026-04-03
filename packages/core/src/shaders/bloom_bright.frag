#version 300 es
precision highp float;

// Full-resolution lighting texture from the lighting pass
uniform sampler2D uLighting;
// Brightness threshold — pixels with luminance above this value contribute to bloom
uniform float uThreshold;
// Soft knee width as a fraction of the threshold (e.g. 0.5 = 50% of threshold)
uniform float uSoftKnee;

out vec4 outColor;

void main() {
  // Bloom RT is half-resolution — use bilinear-filtered 13-tap tent downsample
  // for stable results during camera motion (avoids texelFetch aliasing).
  vec2 texSize = vec2(textureSize(uLighting, 0));
  vec2 texel = 1.0 / texSize;
  vec2 uv = (gl_FragCoord.xy * 2.0 + 1.0) / texSize; // center of 2x2 source block

  // 9-tap tent filter: center(4) + edges(2) + corners(1) = 16 weights
  vec3 a = texture(uLighting, uv).rgb * 4.0;
  vec3 b = texture(uLighting, uv + vec2(-texel.x,  0.0)).rgb * 2.0;
  vec3 c = texture(uLighting, uv + vec2( texel.x,  0.0)).rgb * 2.0;
  vec3 d = texture(uLighting, uv + vec2( 0.0, -texel.y)).rgb * 2.0;
  vec3 e = texture(uLighting, uv + vec2( 0.0,  texel.y)).rgb * 2.0;
  vec3 f = texture(uLighting, uv + vec2(-texel.x, -texel.y)).rgb;
  vec3 g = texture(uLighting, uv + vec2( texel.x, -texel.y)).rgb;
  vec3 h = texture(uLighting, uv + vec2(-texel.x,  texel.y)).rgb;
  vec3 i = texture(uLighting, uv + vec2( texel.x,  texel.y)).rgb;
  vec3 color = (a + b + c + d + e + f + g + h + i) / 16.0;

  // Perceptual luminance (BT.709 coefficients)
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Soft knee: smooth transition around the threshold to avoid harsh cutoffs.
  // The transition region spans [threshold - knee, threshold + knee].
  float knee = uThreshold * uSoftKnee;
  float soft = lum - uThreshold + knee;
  soft = clamp(soft / (2.0 * knee + 1e-6), 0.0, 1.0);
  soft = soft * soft;

  // Hard threshold: 1.0 when lum >= uThreshold, 0.0 otherwise.
  // Take the max so pixels above threshold get full contribution and pixels
  // in the knee region get a smooth partial contribution.
  float contribution = max(soft, step(uThreshold, lum));

  outColor = vec4(color * contribution, 1.0);
}
