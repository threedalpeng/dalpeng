#version 300 es

// Per-vertex quad data (2D position, -1 to 1)
in vec2 aPosition;

// Per-instance data
in vec4 aInstancePosSize;  // xyz = world pos, w = size
in vec4 aInstanceColor;    // rgba

uniform mat4 uView;
uniform mat4 uProjection;
uniform mat4 uModel;       // emitter's world transform

out vec4 vColor;
out vec2 vUV;

void main() {
  vec3 worldPos = (uModel * vec4(aInstancePosSize.xyz, 1.0)).xyz;
  float size = aInstancePosSize.w;

  // Billboard: extract right and up from view matrix
  vec3 right = vec3(uView[0][0], uView[1][0], uView[2][0]);
  vec3 up    = vec3(uView[0][1], uView[1][1], uView[2][1]);

  // Offset quad corners by right/up scaled by size
  vec3 pos = worldPos + right * aPosition.x * size + up * aPosition.y * size;

  gl_Position = uProjection * uView * vec4(pos, 1.0);
  vColor = aInstanceColor;
  vUV = aPosition * 0.5 + 0.5;  // map [-1,1] to [0,1]
}
