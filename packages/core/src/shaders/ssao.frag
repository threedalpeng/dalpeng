#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D gPositionMetallic;
uniform sampler2D gNormalRoughness;
uniform sampler2D uNoiseTex;

uniform vec3 uSamples[64];
uniform int uKernelSize;      // actual kernel size (16, 32, or 64)
uniform float uRadius;        // world-space radius (default 0.5)
uniform float uBias;          // depth bias (default 0.025)
uniform mat4 uView;
uniform mat4 uProjection;
uniform vec2 uNoiseScale;     // screen_size / 4.0 (for tiling the 4x4 noise)

out vec4 outColor;

void main() {
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);

  vec3 fragPos = texelFetch(gPositionMetallic, fragCoord, 0).rgb;
  vec3 normal = texelFetch(gNormalRoughness, fragCoord, 0).rgb;
  float normalLen = length(normal);
  if (normalLen < 1e-6) {
    outColor = vec4(1.0);
    return;
  }
  vec3 N = normal / normalLen;

  // Random rotation from noise texture (tiled)
  vec2 noiseUV = vec2(fragCoord) / 4.0;
  vec3 randomVec = vec3(texture(uNoiseTex, noiseUV).rg, 0.0);

  // Build TBN matrix using Gram-Schmidt
  vec3 tangent = normalize(randomVec - N * dot(randomVec, N));
  vec3 bitangent = cross(N, tangent);
  mat3 TBN = mat3(tangent, bitangent, N);

  float occlusion = 0.0;
  for (int i = 0; i < uKernelSize; i++) {
    // World-space sample position
    vec3 samplePos = fragPos + TBN * uSamples[i] * uRadius;

    // Project sample to screen space for depth comparison
    vec4 offset = uProjection * uView * vec4(samplePos, 1.0);
    offset.xyz /= offset.w;
    offset.xyz = offset.xyz * 0.5 + 0.5;

    // Fetch scene depth at sample's screen position
    ivec2 sampleCoord = ivec2(offset.xy * vec2(textureSize(gPositionMetallic, 0)));
    vec3 scenePos = texelFetch(gPositionMetallic, sampleCoord, 0).rgb;

    // View-space depth comparison
    float sampleDepth = (uView * vec4(samplePos, 1.0)).z;
    float sceneDepth = (uView * vec4(scenePos, 1.0)).z;

    // Range check to avoid far-away occlusion
    float rangeCheck = smoothstep(0.0, 1.0, uRadius / max(abs(sampleDepth - sceneDepth), 1e-6));
    occlusion += ((sceneDepth >= sampleDepth + uBias) ? 1.0 : 0.0) * rangeCheck;
  }

  occlusion = 1.0 - (occlusion / float(uKernelSize));
  outColor = vec4(occlusion, occlusion, occlusion, 1.0);
}
