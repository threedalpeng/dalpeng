#version 300 es

precision highp float;

in vec3 vPos;
in vec3 vNormal;
in vec2 vTexcoord;
in vec3 vTangent;
in vec3 vBitangent;

uniform float uMetallic;
uniform float uRoughness;
uniform vec3 uBaseColor;
uniform vec3 uEmissive;

uniform int uTexFlags;
uniform sampler2D uBaseColorMap;
uniform sampler2D uNormalMap;
uniform sampler2D uMetallicRoughnessMap;
uniform sampler2D uEmissiveMap;
uniform sampler2D uOcclusionMap;
uniform float uOcclusionStrength;

// Alpha masking
uniform int uAlphaMode;    // 0 = OPAQUE, 1 = MASK
uniform float uAlphaCutoff;

// KHR_materials_unlit
uniform int uUnlit;

// KHR_texture_transform
uniform mat3 uTexTransform;

layout(location = 0) out vec4 gPositionMetallic;
layout(location = 1) out vec4 gNormalRoughness;
layout(location = 2) out vec4 gAlbedo;
layout(location = 3) out vec4 gEmissive;

// Derivative-based TBN for normal mapping without vertex tangents
vec3 perturbNormal(vec3 N, vec3 worldPos, vec2 uv) {
  vec3 dp1 = dFdx(worldPos);
  vec3 dp2 = dFdy(worldPos);
  vec2 duv1 = dFdx(uv);
  vec2 duv2 = dFdy(uv);

  vec3 dp2perp = cross(dp2, N);
  vec3 dp1perp = cross(N, dp1);
  vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
  vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;

  float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
  mat3 TBN = mat3(T * invmax, B * invmax, N);

  vec3 mapN = texture(uNormalMap, uv).rgb * 2.0 - 1.0;
  return normalize(TBN * mapN);
}

void main() {
  vec2 uv = (uTexTransform * vec3(vTexcoord, 1.0)).xy;

  // Base color (sample vec4 for alpha channel)
  vec3 albedo = uBaseColor;
  float alpha = 1.0;
  if ((uTexFlags & 1) != 0) {
    vec4 bcTex = texture(uBaseColorMap, uv);
    albedo *= bcTex.rgb;
    alpha = bcTex.a;
  }

  // Alpha MASK discard
  if (uAlphaMode == 1 && alpha < uAlphaCutoff) {
    discard;
  }

  // Metallic / Roughness
  float metallic = uMetallic;
  float roughness = uRoughness;
  if ((uTexFlags & 4) != 0) {
    vec4 mr = texture(uMetallicRoughnessMap, uv);
    roughness *= mr.g;
    metallic *= mr.b;
  }

  // Normal
  vec3 N = normalize(vNormal);
  if ((uTexFlags & 2) != 0) {
    if ((uTexFlags & 16) != 0) {
      // Tangent-based TBN (from vertex attributes)
      vec3 T = normalize(vTangent);
      vec3 B = normalize(vBitangent);
      mat3 TBN = mat3(T, B, N);
      vec3 mapN = texture(uNormalMap, uv).rgb * 2.0 - 1.0;
      N = normalize(TBN * mapN);
    } else {
      // Derivative-based fallback (for procedural meshes without tangents)
      N = perturbNormal(N, vPos, uv);
    }
  }

  // Emissive
  vec3 emissive = uEmissive;
  if ((uTexFlags & 8) != 0) {
    emissive *= texture(uEmissiveMap, uv).rgb;
  }

  // Ambient occlusion → gAlbedo.a
  float ao = 1.0;
  if ((uTexFlags & 32) != 0) {
    float aoSample = texture(uOcclusionMap, uv).r;
    ao = mix(1.0, aoSample, uOcclusionStrength);
  }

  // KHR_materials_unlit: write albedo as emissive, zero normal so lighting contributes nothing
  if (uUnlit != 0) {
    gPositionMetallic.rgb = vPos;
    gPositionMetallic.a = 0.0;
    gNormalRoughness.rgb = vec3(0.0);
    gNormalRoughness.a = 1.0;
    gAlbedo.rgb = vec3(0.0);
    gAlbedo.a = 1.0;
    gEmissive.rgb = albedo;
    return;
  }

  gPositionMetallic.rgb = vPos;
  gPositionMetallic.a = metallic;
  gNormalRoughness.rgb = N;
  gNormalRoughness.a = roughness;
  gAlbedo.rgb = albedo;
  gAlbedo.a = ao;
  gEmissive.rgb = emissive;
}
