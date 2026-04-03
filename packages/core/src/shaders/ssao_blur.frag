#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D uSSAORaw;
out vec4 outColor;

void main() {
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);
  float result = 0.0;
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      result += texelFetch(uSSAORaw, fragCoord + ivec2(x, y), 0).r;
    }
  }
  result /= 25.0;
  outColor = vec4(result, result, result, 1.0);
}
