# 렌더링

## PBR 셰이딩

- BRDF: GGX Distribution (D) + Smith Visibility (Vis) + Schlick Fresnel (F)
- Specular: `D * Vis * F`, Diffuse: `(1 - F) * baseColor / π` (에너지 보존)
- Roughness 최솟값 0.045, NoV에 1e-5 더해 수치 안정성 확보
- 현재 직접 조명만 지원 (IBL, AO 미구현)

## 라이트

- 종류: directional(0), point(1), spot(2, 미구현)
- 유니폼: `uLight` struct (color, pos, direction, type, intensity) — **단일 라이트만**
- 감쇠: directional=없음, point=1/d²
- 조명 패스: 라이트당 풀스크린 쿼드, additive blend
- 디버그 모드(uDebugMode): 0=shaded, 1=normals, 2=albedo, 3=emissive, 4=metallic, 5=roughness, 6=position

한계: 단일 `uLight` struct이므로 라이트 수만큼 풀스크린 쿼드를 반복 드로우. 5+ 라이트에서 오버드로우 문제.

## 섀도우

방향광(Directional Light) 전용. 포인트/스팟/CSM 미구현.

파이프라인: Shadow pass (depth-only FBO) → Geometry pass → Lighting pass
- Bounding sphere frustum fitting (카메라 frustum 8코너 → centroid + radius)
- 텍셀 크기 반올림으로 카메라 회전 시 shadow shimmer 감소
- NEAREST 필터 + `main.frag` 내 3×3 수동 PCF
- 섀도우 맵: TEXTURE4에 바인딩
- 바이어스: constant + slope-scale (`tan(acos(NoL))`)
- POLYGON_OFFSET_FILL로 하드웨어 depth bias 추가 적용

설정 항목:

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `shadows` | false | 섀도우 활성화 여부 |
| `shadowBias` | 0.005 | 상수 depth bias |
| `shadowSlopeScale` | 1.0 | slope-scale bias 계수 |
| `shadowStrength` | 1.0 | 섀도우 강도 (0-1) |
| `shadowMapSize` | 1024 | 섀도우 맵 해상도 |
| `shadowDistance` | camera far | 섀도우 최대 거리 |
| `shadowOffsetFactor` | 1.1 | glPolygonOffset factor |
| `shadowOffsetUnits` | 4.0 | glPolygonOffset units |
| `shadowDebug` | 0 | 디버그 모드 (0:off, 1:visibility, 2:UV+depth, 3:sampled depth) |

## 포스트프로세싱

- 기능 플래그: `app.features.postToneMapping` (기본값: off)
- **on**: Lighting → RGBA16F RT → Post 패스(Reinhard + gamma) → 화면
- **off**: Lighting에서 in-shader gamma 후 직접 화면 출력
- EXT_float_blend 미지원 시 RGBA8 fallback
- 설정: `toneExposure` (기본 1.0), `toneGamma` (기본 2.2)
