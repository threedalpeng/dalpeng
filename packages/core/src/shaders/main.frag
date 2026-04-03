#version 300 es

#include "include/constants.glsl"

precision highp float;
// For debug and manual PCF path we sample raw depth
precision highp sampler2D;
precision highp samplerCube;

uniform vec3 uViewPos;
uniform sampler2D gPositionMetallic;
uniform sampler2D gNormalRoughness;
uniform sampler2D gAlbedo;
uniform sampler2D gEmissive;
uniform int uApplyGamma;
uniform float uGamma;
uniform int uDebugMode; // 0: shaded, 1:N, 2:Albedo, 3:Emissive, 4:Metallic, 5:Roughness, 6:Position
uniform int uShadowDebug; // 0: off, 1: visibility, 2: uv+depth

// Shadows (manual compare PCF)
uniform sampler2D uShadowMapDepth;
uniform mat4 uLightViewProj;
uniform float uShadowBias;        // constant bias (~0.0005 - 0.005)
uniform float uShadowSlopeScale;  // slope-scale factor (~0.0 - 2.0)
uniform float uShadowStrength;    // 0..1

// Ambient light (applied once, not per-light)
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;
uniform int uIsFirstLight;

// IBL (Image-Based Lighting)
uniform int uEnableIBL;
uniform samplerCube uIrradianceMap;    // unit 6
uniform samplerCube uPrefilteredMap;   // unit 7
uniform sampler2D uBrdfLUT;            // unit 8
uniform float uIBLIntensity;

// SSAO
uniform int uEnableSSAO;
uniform sampler2D uSSAOMap;            // unit 5

struct Light {
  vec3 color;
  vec3 pos;
  vec3 direction;
  int type;
  float intensity;
  float cosInnerAngle;
  float cosOuterAngle;
};
const int LIGHT_TYPE_DIRECTIONAL = 0;
const int LIGHT_TYPE_POINT = 1;
const int LIGHT_TYPE_SPOT = 2;

uniform Light uLight;

out vec4 outColor;

vec3 getLightFactor(float distance, vec3 lightToPoint) {
  float lightAttenuation = 1.0;
  if(uLight.type != LIGHT_TYPE_DIRECTIONAL) {
    lightAttenuation = 1.0 / pow(distance, 2.0);
  }
  // Spot light cone attenuation
  if(uLight.type == LIGHT_TYPE_SPOT) {
    float cosTheta = dot(normalize(-lightToPoint), uLight.direction);
    float denom = uLight.cosInnerAngle - uLight.cosOuterAngle;
    float spotAtten = clamp((cosTheta - uLight.cosOuterAngle) / max(denom, 1e-6), 0.0, 1.0);
    lightAttenuation *= spotAtten;
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

vec3 Fresnel_Schlick_Roughness(vec3 f0, float cosTheta, float roughness) {
  float x = clamp(1.0 - cosTheta, 0.0, 1.0);
  return f0 + (max(vec3(1.0 - roughness), f0) - f0) * (x*x*x*x*x);
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

  // Energy-conserving: attenuate diffuse by (1 - F)
  return NoL * (Fs + (1.0 - F) * Fd);
}

void main() {
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);
  vec3 pos = texelFetch(gPositionMetallic, fragCoord, 0).rgb;
  vec3 normal = texelFetch(gNormalRoughness, fragCoord, 0).rgb;

  float metallic = texelFetch(gPositionMetallic, fragCoord, 0).a;
  float roughness = max(texelFetch(gNormalRoughness, fragCoord, 0).a, 0.045);
  vec3 baseColor = texelFetch(gAlbedo, fragCoord, 0).rgb;
  float ao = texelFetch(gAlbedo, fragCoord, 0).a;
  vec3 emissive = texelFetch(gEmissive, fragCoord, 0).rgb;

  float normalLen = length(normal);
  vec3 N = normalLen > 1e-6 ? normal / normalLen : vec3(0.0, 0.0, 1.0);

  // Debug outputs
  if (uDebugMode == 1) {
    outColor = vec4(N * 0.5 + 0.5, 1.0);
    return;
  }
  if (uDebugMode == 2) { outColor = vec4(baseColor, 1.0); return; }
  if (uDebugMode == 3) { outColor = vec4(emissive, 1.0); return; }
  if (uDebugMode == 4) { outColor = vec4(vec3(metallic), 1.0); return; }
  if (uDebugMode == 5) { outColor = vec4(vec3(roughness), 1.0); return; }
  if (uDebugMode == 6) { outColor = vec4(pos * 0.05 + 0.5, 1.0); return; }
  if (uDebugMode == 7) {
    float ssaoVal = uEnableSSAO != 0 ? texelFetch(uSSAOMap, fragCoord, 0).r : 1.0;
    outColor = vec4(vec3(ssaoVal), 1.0);
    return;
  }
  if (uDebugMode == 8) {
    float ssaoVal = uEnableSSAO != 0 ? texelFetch(uSSAOMap, fragCoord, 0).r : 1.0;
    outColor = vec4(vec3(ao * ssaoVal), 1.0);
    return;
  }

  vec3 V = normalize(uViewPos - pos);
  vec3 lightToPoint = uLight.pos - pos;
  if(uLight.type == LIGHT_TYPE_DIRECTIONAL) {
    lightToPoint = -uLight.direction;
  }
  vec3 L = normalize(lightToPoint);

  vec3 lightFactor = getLightFactor(length(lightToPoint), lightToPoint);
  vec3 shade = (lightFactor * material(baseColor, metallic, roughness, N, V, L));

  // Shadowing (PCF 3x3).
  // Skip shadow sampling entirely when strength is zero to avoid
  // sampling from an unbound shadow map texture unit.
  float visibility = 1.0;
  bool inBounds = false;
  vec3 suv = vec3(0.0);
  if (uShadowStrength > 0.0) {
    vec4 lpos = uLightViewProj * vec4(pos, 1.0);
    vec3 ndc = lpos.xyz / max(lpos.w, 1e-6);
    suv = ndc * 0.5 + 0.5;
    inBounds = all(greaterThanEqual(suv, vec3(0.0))) && all(lessThanEqual(suv, vec3(1.0)));
    if (inBounds) {
      vec2 texel = 1.0 / vec2(textureSize(uShadowMapDepth, 0));
      float NoL = clamp(dot(N, L), 0.001, 1.0);
      float slopeFactor = sqrt(1.0 - NoL * NoL) / NoL; // tan(acos(NoL))
      float bias = uShadowBias + uShadowSlopeScale * slopeFactor * 0.001;
      bias = clamp(bias, 0.0, 0.01);
      float sum = 0.0;
      float count = 0.0;
      for (int y = -1; y <= 1; ++y) {
        for (int x = -1; x <= 1; ++x) {
          vec2 uv = suv.xy + vec2(x, y) * texel;
          float sd = texture(uShadowMapDepth, uv).r;
          float lit = ((suv.z - bias) <= sd) ? 1.0 : 0.0;
          sum += lit;
          count += 1.0;
        }
      }
      visibility = sum / max(count, 1.0);
    }
    shade *= mix(1.0 - uShadowStrength, 1.0, visibility);
  }

  // Shadow debug views
  if (uShadowDebug == 1) {
    outColor = vec4(vec3(visibility), 1.0);
    return;
  }
  if (uShadowDebug == 2) {
    vec3 dbg = vec3(0.0);
    dbg.r = inBounds ? 0.0 : 1.0;        // red if out-of-bounds
    dbg.g = clamp(length(suv.xy - 0.5) * 2.0, 0.0, 1.0); // uv distance from center
    dbg.b = clamp(suv.z, 0.0, 1.0);      // depth in light clip [0..1]
    outColor = vec4(dbg, 1.0);
    return;
  }
  // Debug 3: Show sampled depth from shadow map
  if (uShadowDebug == 3 && inBounds) {
    float sd = texture(uShadowMapDepth, suv.xy).r;
    outColor = vec4(vec3(sd), 1.0);
    return;
  }

  // Ambient light (added once on first light pass only, modulated by AO)
  vec3 ambient = vec3(0.0);
  if (uIsFirstLight != 0) {
    float finalAO = ao;
    if (uEnableSSAO != 0) {
      finalAO *= texelFetch(uSSAOMap, fragCoord, 0).r;
    }

    if (uEnableIBL != 0) {
      vec3 f0 = mix(vec3(0.04), baseColor.rgb, metallic);
      float NoV = abs(dot(N, V)) + 1e-5;
      vec3 F = Fresnel_Schlick_Roughness(f0, NoV, roughness);
      vec3 kD = (1.0 - F) * (1.0 - metallic);

      // Diffuse IBL
      vec3 irradiance = texture(uIrradianceMap, N).rgb;
      vec3 diffuse = irradiance * baseColor.rgb;

      // Specular IBL (split-sum)
      vec3 R = reflect(-V, N);
      vec3 prefiltered = textureLod(uPrefilteredMap, R, roughness * 4.0).rgb;
      vec2 brdf = texture(uBrdfLUT, vec2(NoV, roughness)).rg;
      vec3 specular = prefiltered * (F * brdf.x + brdf.y);

      ambient = (kD * diffuse + specular) * finalAO * uIBLIntensity;
    } else {
      ambient = uAmbientColor * uAmbientIntensity * baseColor * finalAO;
    }
  }

  vec3 finalColor = shade + emissive + ambient;
  if (uApplyGamma != 0) {
    outColor = vec4(pow(finalColor, vec3(1.0 / max(uGamma, 1e-6))), 1);
  } else {
    outColor = vec4(finalColor, 1);
  }
}
