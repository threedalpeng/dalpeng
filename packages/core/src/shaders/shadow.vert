#version 300 es

precision highp float;

in vec3 aPosition;
in vec4 aJoints;
in vec4 aWeights;

uniform mat4 uModel;
uniform mat4 uLightViewProj;

uniform int uSkinned;
const int MAX_JOINTS = 128;
uniform mat4 uJointMatrices[MAX_JOINTS];

void main() {
  vec4 localPos = vec4(aPosition, 1.0);
  if (uSkinned != 0) {
    mat4 skinMatrix =
      aWeights.x * uJointMatrices[int(aJoints.x)] +
      aWeights.y * uJointMatrices[int(aJoints.y)] +
      aWeights.z * uJointMatrices[int(aJoints.z)] +
      aWeights.w * uJointMatrices[int(aJoints.w)];
    localPos = skinMatrix * localPos;
  }
  gl_Position = uLightViewProj * (uModel * localPos);
}
