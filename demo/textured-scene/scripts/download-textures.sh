#!/usr/bin/env bash
# Downloads CC0 PBR textures from Poly Haven for the textured-scene demo.
# Usage: cd demo/textured-scene && bash scripts/download-textures.sh

set -euo pipefail

BASE="https://dl.polyhaven.org/file/ph-assets/Textures"
RES="1k"

download() {
  local name=$1 dir=$2
  local prefix="${BASE}/jpg/${RES}/${name}/${name}"
  mkdir -p "public/textures/${dir}"
  echo "Downloading ${name} → public/textures/${dir}/"
  curl -fSL "${prefix}_diff_${RES}.jpg"    -o "public/textures/${dir}/baseColor.jpg"
  curl -fSL "${prefix}_nor_gl_${RES}.jpg"  -o "public/textures/${dir}/normal.jpg"
  curl -fSL "${prefix}_rough_${RES}.jpg"   -o "public/textures/${dir}/roughness.jpg" || true
  curl -fSL "${prefix}_arm_${RES}.jpg"     -o "public/textures/${dir}/arm.jpg" || true
  echo "  Done."
}

download "brick_wall_006" "brick"
download "wood_planks"    "wood"
download "stone_floor"    "stone"

echo "All textures downloaded."
