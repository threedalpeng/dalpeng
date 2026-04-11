#version 300 es

in vec2 aPosition;

in vec2 aInstPos;
in vec2 aInstSize;
in vec4 aInstUV;
in vec4 aInstTint;
in float aInstDepth;

uniform mat4 uViewProjection;

out vec2 vTexcoord;
out vec4 vTint;

void main() {
  vec2 uv = aPosition * vec2(0.5, -0.5) + 0.5;
  vTexcoord = aInstUV.xy + uv * aInstUV.zw;
  vTint = aInstTint;

  vec2 worldPos = aInstPos + aPosition * aInstSize * 0.5;
  gl_Position = uViewProjection * vec4(worldPos, aInstDepth, 1.0);
}
