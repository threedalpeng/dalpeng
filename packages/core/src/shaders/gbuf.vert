#version 300 es

in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexcoord;

out vec3 vPos;
out vec3 vNormal;
out vec2 vTexcoord;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1);
  vPos = vec3(worldPos.xyz) / worldPos.w;
  vec4 ePos = uView * worldPos;

  // vNormal = aNormal;
  vNormal = normalize(mat3(transpose(inverse(uModel))) * aNormal);

  vTexcoord = aTexcoord;

  gl_Position = uProjection * ePos;
}