#version 300 es
precision highp float;

uniform sampler2D uSource;
uniform vec2 uTexelSize;  // 1.0 / resolution

out vec4 outColor;

// FXAA tuning constants
const float FXAA_REDUCE_MIN = 1.0 / 128.0;
const float FXAA_REDUCE_MUL = 1.0 / 8.0;
const float FXAA_SPAN_MAX   = 8.0;

void main() {
  vec2 uv = gl_FragCoord.xy * uTexelSize;

  vec3 rgbNW = texture(uSource, uv + vec2(-1.0, -1.0) * uTexelSize).rgb;
  vec3 rgbNE = texture(uSource, uv + vec2( 1.0, -1.0) * uTexelSize).rgb;
  vec3 rgbSW = texture(uSource, uv + vec2(-1.0,  1.0) * uTexelSize).rgb;
  vec3 rgbSE = texture(uSource, uv + vec2( 1.0,  1.0) * uTexelSize).rgb;
  vec3 rgbM  = texture(uSource, uv).rgb;

  vec3 luma = vec3(0.299, 0.587, 0.114);
  float lumaNW = dot(rgbNW, luma);
  float lumaNE = dot(rgbNE, luma);
  float lumaSW = dot(rgbSW, luma);
  float lumaSE = dot(rgbSE, luma);
  float lumaM  = dot(rgbM,  luma);

  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

  vec2 dir;
  dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
  dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

  float dirReduce = max(
    (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL),
    FXAA_REDUCE_MIN
  );

  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = min(vec2(FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX), dir * rcpDirMin)) * uTexelSize;

  vec3 rgbA = 0.5 * (
    texture(uSource, uv + dir * (1.0 / 3.0 - 0.5)).rgb +
    texture(uSource, uv + dir * (2.0 / 3.0 - 0.5)).rgb
  );
  vec3 rgbB = rgbA * 0.5 + 0.25 * (
    texture(uSource, uv + dir * -0.5).rgb +
    texture(uSource, uv + dir *  0.5).rgb
  );

  float lumaB = dot(rgbB, luma);

  if (lumaB < lumaMin || lumaB > lumaMax) {
    outColor = vec4(rgbA, 1.0);
  } else {
    outColor = vec4(rgbB, 1.0);
  }
}
