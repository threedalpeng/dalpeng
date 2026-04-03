#version 300 es
precision highp float;

in vec3 vLocalDir;
uniform samplerCube uEnvironment;
out vec4 outColor;

#include "../include/constants.glsl"

void main() {
  vec3 N = normalize(vLocalDir);

  // Build tangent frame
  vec3 up = abs(N.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 right = normalize(cross(up, N));
  up = cross(N, right);

  vec3 irradiance = vec3(0.0);
  float sampleCount = 0.0;
  float sampleDelta = 0.025;

  for (float phi = 0.0; phi < 2.0 * PI; phi += sampleDelta) {
    for (float theta = 0.0; theta < 0.5 * PI; theta += sampleDelta) {
      // Spherical to cartesian (tangent space)
      vec3 tangentSample = vec3(
        sin(theta) * cos(phi),
        sin(theta) * sin(phi),
        cos(theta)
      );
      // Tangent space to world
      vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * N;

      irradiance += texture(uEnvironment, sampleVec).rgb * cos(theta) * sin(theta);
      sampleCount += 1.0;
    }
  }
  irradiance = PI * irradiance / sampleCount;
  outColor = vec4(irradiance, 1.0);
}
