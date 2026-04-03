#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/../public"
MODELS_DIR="$PUBLIC_DIR/models"
HDRI_DIR="$PUBLIC_DIR/hdri"

mkdir -p "$MODELS_DIR" "$HDRI_DIR"

echo "Downloading Fox.glb..."
curl -fSL \
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb" \
  -o "$MODELS_DIR/Fox.glb"

echo "Downloading meadow_1k.hdr..."
curl -fSL \
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/meadow_1k.hdr" \
  -o "$HDRI_DIR/meadow_1k.hdr"

echo "Done. Assets saved to $PUBLIC_DIR"
