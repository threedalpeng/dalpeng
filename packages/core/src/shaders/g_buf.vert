#version 300 es

in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexcoord;
in vec4 aTangent;
in vec4 aJoints;
in vec4 aWeights;

out vec3 vPos;
out vec3 vNormal;
out vec2 vTexcoord;
out vec3 vTangent;
out vec3 vBitangent;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

uniform int uSkinned;
const int MAX_JOINTS = 128;
uniform mat4 uJointMatrices[MAX_JOINTS];

void main() {
  vec4 localPos = vec4(aPosition, 1.0);
  vec3 localNormal = aNormal;
  vec4 localTangent = aTangent;

  if (uSkinned != 0) {
    mat4 skinMatrix =
      aWeights.x * uJointMatrices[int(aJoints.x)] +
      aWeights.y * uJointMatrices[int(aJoints.y)] +
      aWeights.z * uJointMatrices[int(aJoints.z)] +
      aWeights.w * uJointMatrices[int(aJoints.w)];
    localPos = skinMatrix * localPos;
    localNormal = mat3(skinMatrix) * localNormal;
    localTangent = vec4(mat3(skinMatrix) * localTangent.xyz, localTangent.w);
  }

  vec4 worldPos = uModel * localPos;
  vPos = vec3(worldPos.xyz) / worldPos.w;
  vec4 ePos = uView * worldPos;

  mat3 normalMatrix = mat3(transpose(inverse(uModel)));
  vNormal = normalize(normalMatrix * localNormal);

  vec3 rawTangent = normalMatrix * localTangent.xyz;
  float tLen = length(rawTangent);
  vTangent = tLen > 0.0 ? rawTangent / tLen : vec3(0.0);
  vBitangent = tLen > 0.0 ? cross(vNormal, vTangent) * localTangent.w : vec3(0.0);

  vTexcoord = aTexcoord;

  gl_Position = uProjection * ePos;
}
