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
  // Bloom RT is half-resolution, so each bloom fragment covers a 2x2 block
  // in the full-resolution lighting texture.
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);
  ivec2 srcCoord = fragCoord * 2;

  // Downsample: average a 2x2 block for better quality and fewer aliasing artifacts
  vec3 c00 = texelFetch(uLighting, srcCoord,                    0).rgb;
  vec3 c10 = texelFetch(uLighting, srcCoord + ivec2(1, 0),     0).rgb;
  vec3 c01 = texelFetch(uLighting, srcCoord + ivec2(0, 1),     0).rgb;
  vec3 c11 = texelFetch(uLighting, srcCoord + ivec2(1, 1),     0).rgb;
  vec3 color = (c00 + c10 + c01 + c11) * 0.25;

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
