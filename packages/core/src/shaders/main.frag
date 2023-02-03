#version 300 es

#define PI (3.1415926538)

precision highp float;

uniform vec3 uViewPos;
uniform sampler2D gPositionMetallic;
uniform sampler2D gNormalRoughness;
uniform sampler2D gAlbedo;
uniform sampler2D gEmissive;

struct Light {
  vec3 color;
  vec3 pos;
  vec3 direction;
  int type;
  float intensity;
};
const int LIGHT_TYPE_DIRECTIONAL = 0;
const int LIGHT_TYPE_POINT = 1;
const int LIGHT_TYPE_SPOT = 2;

uniform Light uLight;

out vec4 outColor;

vec3 getLightFactor(float distance) {
  float lightAttenuation = 1.0;
  if(uLight.type != LIGHT_TYPE_DIRECTIONAL) {
    lightAttenuation = 1.0 / pow(distance, 2.0);
  }
  return (lightAttenuation * uLight.intensity) * uLight.color;
}

/*** Fresnel */
vec3 Fresnel_Schlick(vec3 f0, float VoH) {
  float x = clamp(1.0 - VoH, 0.0, 1.0);
  float x2 = x * x;
  float x5 = x * x2 * x2;
  return f0 + (1.0 - f0) * x5;
}

vec3 material(vec3 baseColor, float metallic, float roughness, vec3 N, vec3 V, vec3 L) {

  vec3 H = normalize(L + V);
  float NoV = abs(dot(N, V)) + 1e-5;
  float NoH = clamp(dot(N, H), 0.0, 1.0);
  float NoL = clamp(dot(N, L), 0.0, 1.0);
  float VoH = clamp(dot(V, H), 0.0, 1.0);

  /* Specular */
  float alpha = roughness * roughness;
  float alpha2 = alpha * alpha;

  /*** Distribution */
  float f = (NoH * NoH) * (alpha2 - 1.0) + 1.0;
  float D = alpha2 / (PI * f * f);

  /*** Visibility */
  float GV = NoL * sqrt(NoV * NoV * (1.0 - alpha2) + alpha2);
  float GL = NoV * sqrt(NoL * NoL * (1.0 - alpha2) + alpha2);
  float Vis = 0.5 / (GV + GL);

  /*** Fresnel */
  vec3 f0 = mix(vec3(0.04), baseColor.rgb, metallic);
  vec3 F = Fresnel_Schlick(f0, VoH);

  vec3 Fs = (D * Vis) * F;

  /* Diffuse */
  vec3 cDiff = mix(baseColor.rgb, vec3(0.0), metallic);
  vec3 Fd = (cDiff / PI);

  // return 3.0 * NoL * mix(Fd, Fs, F);
  return NoL * (Fs + Fd);
}

void main() {
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);
  vec3 pos = texelFetch(gPositionMetallic, fragCoord, 0).rgb;
  vec3 normal = texelFetch(gNormalRoughness, fragCoord, 0).rgb;

  float metallic = texelFetch(gPositionMetallic, fragCoord, 0).a;
  float roughness = max(texelFetch(gNormalRoughness, fragCoord, 0).a, 0.045);
  vec3 baseColor = texelFetch(gAlbedo, fragCoord, 0).rgb;
  vec3 emissive = texelFetch(gEmissive, fragCoord, 0).rgb;

  vec3 N = normalize(normal);
  vec3 V = normalize(uViewPos);
  vec3 lightToPoint = uLight.pos - pos;
  if(uLight.type == LIGHT_TYPE_DIRECTIONAL) {
    lightToPoint = -uLight.direction;
  }
  vec3 L = normalize(lightToPoint);

  // outColor = vec4(vec3(N * 0.5 + 0.5), 1);
  float gamma = 2.2;//2.2;

  vec3 lightFactor = getLightFactor(length(lightToPoint));
  vec3 finalColor = (lightFactor * material(baseColor, metallic, roughness, N, V, L)) + emissive;
  outColor = vec4(pow(finalColor, vec3(1.0 / gamma)), 1);
}