# 엔진 레퍼런스

## 수학 컨벤션

행렬 저장: row-major (Float32Array, `_ij` = row i, col j)

GPU 업로드: `uniformMatrix4fv(loc, false, data)` — GLSL은 column-major로 해석하므로, CPU 행렬이 자동 전치되어 GLSL에 전달됨.

결과적으로:
- CPU: `a.mul(b)` = GLSL에서 `a * b` (곱셈 순서 보존)
- CPU: `ortho.mul(view)` → GLSL: `P * V` (projection * view)
- GLSL: `M * v` (column-vector 곱) — 표준 OpenGL 셰이더 컨벤션

좌표계: 오른손계 — forward=`-Z`, up=`+Y`, right=`+X`

`Vec3`: immutable — `add`, `sub`, `muli`, `cross` 등 모두 새 벡터 반환
`Mat4` 주요 팩토리: `identity`, `translate`, `rotate`, `scale`, `compose`, `view`, `perspective`, `orthographic`, `mul`, `inverse`, `transpose`

## Transform

- 속성: `position` (Vec3), `rotation` (Quaternion), `scale` (Vec3)
- 로컬 행렬: TRS 순서 — `T * R * S`
- 월드 행렬: 부모 계층 누적 (`parent.worldMatrix * localMatrix`)
- Dirty checking: 속성 변경 시 플래그 세팅, 필요 시 재계산
- 파생 속성: `forward` (-Z), `up` (+Y), `right` (+X) — 회전 적용된 방향

## 카메라

- 속성: `isOrthographic`, `size`, `fovy` (라디안), `dNear`, `dFar`, `aspectRatio`
- View 행렬: `Mat4.view(eye, at, up)` — Transform 월드 위치/방향에서 산출
- Projection:
  - Perspective: `Mat4.perspective(fovy, aspect, near, far)`
  - Orthographic: `Mat4.orthographic(xmag, ymag, near, far)` — xmag/ymag는 반너비
- Geometry pass: `uView`, `uProjection` 유니폼 설정
- Lighting pass: `uViewPos` 유니폼 설정

## Composable API

- `defineGameEntity(fn)`: 엔티티 정의 — `fn` 내에서 `addComponent`로 컴포넌트 추가
- `defineScene(fn)`: 씬 정의 — 엔티티/그룹 계층 구조 반환
- `onUpdate(fn)`: 매 프레임 호출되는 업데이트 훅
- `useComponent(Type)`: 현재 엔티티에서 컴포넌트 조회
- `withName(name)`: 엔티티/그룹에 디버그용 이름 부여
- `Time`: 경과 시간 접근 (`Time.delta`, `Time.elapsed`)
- `Input`: 키보드/마우스 입력 상태 조회
