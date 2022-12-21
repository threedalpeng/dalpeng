#version 300 es

in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexcoord;

out vec4 vPos;
out vec4 vEpos;
out vec3 vNormal;
out vec2 vTexcoord;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1);
  vEpos = uView * worldPos;
  vPos = uProjection * vEpos;
  gl_Position = vPos;

  vNormal = normalize(mat3(uView * uModel) * aNormal);
  vTexcoord = aTexcoord;
}