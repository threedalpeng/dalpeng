# 렌더링 아키텍처

## 렌더 파이프라인

패스 실행 순서: Shadow → Geometry (G-Buffer) → Lighting → Post-processing

| 패스 | FBO | 동작 |
|------|-----|------|
| Shadow | depth-only FBO (DEPTH_COMPONENT24, NEAREST) | 방향광 기준 depth 렌더링. POLYGON_OFFSET_FILL 활성화 |
| Geometry | G-Buffer FBO (4×RGBA16F + DEPTH16) | 월드 좌표/노말/재질 기록. depthWrite=true, blend off |
| Lighting | RGBA16F RT 또는 기본 프레임버퍼 | G-Buffer 샘플링 + PBR 라이팅. additive blend (ONE, ONE) |
| Post | 기본 프레임버퍼 | Reinhard 톤매핑 + 감마. postToneMapping=true일 때만 실행 |

- postToneMapping off이면 Lighting 패스에서 in-shader 감마 후 직접 화면 출력
- EXT_float_blend 미지원 시 Lighting RT는 RGBA8 fallback (LDR)

## 백엔드 추상화

인터페이스: `RendererBackend` (packages/core/src/gfx/RendererBackend.ts)
현재 구현체: `WebGL2Renderer` (단일)

주요 메서드:
- `init`, `resize`, `setViewport`, `getDrawableSize`
- `createProgram`, `createBuffer`, `createVertexArray`, `createTexture`, `createSampler`
- `beginGeometryPass` / `endGeometryPass`
- `beginLightingPass` / `endLightingPass`
- `beginShadowPass` / `endShadowPass`
- `bindShadowMap` / `hasShadowMap`
- `beginPass` / `endPass` — 범용 패스 API
- `drawIndexed` / `drawArrays`
- `debugDumpState`, `debugCheckError`, `debugCollectState`, `debugGetCaps`, `debugGetLastError`

## G-Buffer

포맷: RGBA16F, NEAREST 필터링, `texelFetch` 샘플링 (보간 없음)

| 유닛 | 이름 | 내용 |
|------|------|------|
| TEXTURE0 | gPositionMetallic | 월드 포지션 XYZ + 메탈릭 A |
| TEXTURE1 | gNormalRoughness | 월드 노멀 XYZ + 러프니스 A |
| TEXTURE2 | gAlbedo | 베이스 컬러 RGB |
| TEXTURE3 | gEmissive | 이미시브 RGB |

뎁스: DEPTH_COMPONENT16

## 알려진 구조 문제

- G-Buffer 텍스처가 `(app as any)` 캐스팅으로 Application에 부착됨 → Renderer 내부로 이동 필요
- 포스트 패스 리소스(`_lightingColor`)도 동일한 `as any` 접근
- RendererBackend 모든 메서드가 `app: any` 파라미터 → 타입 안전 인터페이스로 전환 필요
- Application이 셰이더/렌더타깃/섀도우시스템/features/렌더루프를 전부 소유하는 God Object
