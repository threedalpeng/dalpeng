#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vUV;

out vec4 outColor;

void main() {
  // Soft circle: distance from center
  float dist = length(vUV - 0.5) * 2.0;
  float alpha = smoothstep(1.0, 0.0, dist);

  outColor = vec4(vColor.rgb, vColor.a * alpha);
}
