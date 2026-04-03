#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SCRIPT_DIR/../public/models"

mkdir -p "$OUT_DIR"

echo "Downloading DamagedHelmet.glb..."
curl -L -o "$OUT_DIR/DamagedHelmet.glb" \
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb"

echo "Downloading Box.glb..."
curl -L -o "$OUT_DIR/Box.glb" \
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Box/glTF-Binary/Box.glb"

echo "Done. Models saved to $OUT_DIR"
