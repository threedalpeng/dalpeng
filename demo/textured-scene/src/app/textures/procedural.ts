export interface TextureSet {
  baseColor: string; // data URL
  normal: string; // data URL
  metallicRoughness: string; // data URL (G=roughness, B=metallic, glTF convention)
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  return [canvas, ctx];
}

/**
 * Simple deterministic hash that maps two integers to a float in [0, 1).
 * Good enough for per-tile color variation without Math.random().
 */
function hash2(a: number, b: number): number {
  let x = (a * 1619 + b * 31337 + a * b * 3571) & 0x7fffffff;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = (x >> 16) ^ x;
  return (x & 0x7fffffff) / 0x7fffffff;
}

/**
 * Convert a grayscale height-map canvas to a normal-map data URL.
 *
 * For each pixel the gradient is estimated with a Sobel-like finite difference:
 *   dx = height(x+1, y) - height(x-1, y)
 *   dy = height(x, y+1) - height(x, y-1)
 *   normal = normalize(-dx * strength, -dy * strength, 1.0)
 *
 * Encoding follows the OpenGL/glTF convention:
 *   R = normal.x * 0.5 + 0.5
 *   G = normal.y * 0.5 + 0.5
 *   B = normal.z * 0.5 + 0.5   (always >= 0.5, i.e. pointing outward)
 *
 * A flat surface therefore encodes to (128, 128, 255).
 */
function heightToNormalMap(canvas: HTMLCanvasElement, strength: number): string {
  const w = canvas.width;
  const h = canvas.height;
  const srcCtx = canvas.getContext("2d")!;
  const src = srcCtx.getImageData(0, 0, w, h);

  // Helper: sample red channel (used as height)
  const height = (x: number, y: number): number => {
    // Clamp-to-edge wrap
    const cx = Math.max(0, Math.min(w - 1, x));
    const cy = Math.max(0, Math.min(h - 1, y));
    return src.data[(cy * w + cx) * 4] / 255;
  };

  const [outCanvas, outCtx] = createCanvas(w);
  const out = outCtx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = height(x + 1, y) - height(x - 1, y);
      const dy = height(x, y + 1) - height(x, y - 1);

      // Unnormalised normal
      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;

      // Normalise
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const i = (y * w + x) * 4;
      out.data[i + 0] = Math.round((nx * 0.5 + 0.5) * 255); // R
      out.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255); // G
      out.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255); // B
      out.data[i + 3] = 255; // A
    }
  }

  outCtx.putImageData(out, 0, 0);
  return outCanvas.toDataURL();
}

// ---------------------------------------------------------------------------
// Brick wall
// ---------------------------------------------------------------------------

/**
 * Generates a PBR texture set for a brick wall.
 *
 * Layout (at size=512):
 *   8 rows × 4 bricks per row, with alternating row offsets (running bond).
 *   Mortar lines are ~4 px wide.
 *
 * BaseColor  : red-brown bricks (#b35c3a) with row/col hue variation;
 *              gray mortar (#8a8a7a).
 * NormalMap  : derived from a height map where bricks sit at 200 and mortar
 *              at 50, with strength 3.0.
 * MetallicRoughness (glTF): roughness=0.85 (bricks) / 0.95 (mortar),
 *                           metallic=0.0 everywhere.
 *              G = roughness × 255, B = metallic × 255, R = 0.
 */
export function makeBrickTextures(size: number = 512): TextureSet {
  const rows = 8;
  const cols = 4;
  const mortarWidth = Math.max(2, Math.round((size / 512) * 4));

  const rowH = size / rows;
  const colW = size / cols;

  // Helper: is pixel (px, py) inside mortar?
  function isMortar(px: number, py: number): boolean {
    const row = Math.floor(py / rowH);
    const offset = row % 2 === 0 ? 0 : colW / 2;

    // Horizontal mortar (top edge of each row)
    const localY = py - row * rowH;
    if (localY < mortarWidth) return true;

    // Vertical mortar
    const relX = ((px - offset) % colW + colW) % colW;
    if (relX < mortarWidth) return true;

    return false;
  }

  // Helper: brick index at pixel (px, py)
  function brickIndex(px: number, py: number): [number, number] {
    const row = Math.floor(py / rowH);
    const offset = row % 2 === 0 ? 0 : colW / 2;
    const col = Math.floor(((px - offset) % (size + colW) + (size + colW)) % (size + colW) / colW);
    return [row, col];
  }

  // --- BaseColor ---
  const [bcCanvas, bcCtx] = createCanvas(size);
  const bcImg = bcCtx.createImageData(size, size);

  // Base brick colour in RGB
  const brickR = 0xb3;
  const brickG = 0x5c;
  const brickB = 0x3a;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;

      if (isMortar(px, py)) {
        bcImg.data[i + 0] = 0x8a;
        bcImg.data[i + 1] = 0x8a;
        bcImg.data[i + 2] = 0x7a;
      } else {
        const [row, col] = brickIndex(px, py);
        // Deterministic per-brick variation: ±20 on each channel
        const v = hash2(row, col);
        const delta = Math.round((v - 0.5) * 40);

        bcImg.data[i + 0] = Math.max(0, Math.min(255, brickR + delta));
        bcImg.data[i + 1] = Math.max(0, Math.min(255, brickG + Math.round(delta * 0.5)));
        bcImg.data[i + 2] = Math.max(0, Math.min(255, brickB + Math.round(delta * 0.3)));
      }
      bcImg.data[i + 3] = 255;
    }
  }
  bcCtx.putImageData(bcImg, 0, 0);
  const baseColor = bcCanvas.toDataURL();

  // --- Height map (for normal) ---
  const [hmCanvas, hmCtx] = createCanvas(size);
  const hmImg = hmCtx.createImageData(size, size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      const h = isMortar(px, py) ? 50 : 200;
      hmImg.data[i + 0] = h;
      hmImg.data[i + 1] = h;
      hmImg.data[i + 2] = h;
      hmImg.data[i + 3] = 255;
    }
  }
  hmCtx.putImageData(hmImg, 0, 0);
  const normal = heightToNormalMap(hmCanvas, 3.0);

  // --- MetallicRoughness ---
  const [mrCanvas, mrCtx] = createCanvas(size);
  const mrImg = mrCtx.createImageData(size, size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      const roughness = isMortar(px, py) ? 0.95 : 0.85;

      mrImg.data[i + 0] = 0; // R unused
      mrImg.data[i + 1] = Math.round(roughness * 255); // G = roughness
      mrImg.data[i + 2] = 0; // B = metallic (0)
      mrImg.data[i + 3] = 255;
    }
  }
  mrCtx.putImageData(mrImg, 0, 0);
  const metallicRoughness = mrCanvas.toDataURL();

  return { baseColor, normal, metallicRoughness };
}

// ---------------------------------------------------------------------------
// Wood planks
// ---------------------------------------------------------------------------

/**
 * Generates a PBR texture set for a wood plank surface.
 *
 * BaseColor  : warm brown (#8B6914) base with horizontal grain bands
 *              expressed as slightly lighter/darker sine-wave stripes.
 * NormalMap  : derived from a height map that elevates grain peaks slightly,
 *              with strength 1.5 (subtle).
 * MetallicRoughness: roughness ~0.75, metallic = 0.0 everywhere.
 */
export function makeWoodTextures(size: number = 512): TextureSet {
  // Base colour components
  const baseR = 0x8b;
  const baseG = 0x69;
  const baseB = 0x14;

  // --- BaseColor + HeightMap built together ---
  const [bcCanvas, bcCtx] = createCanvas(size);
  const bcImg = bcCtx.createImageData(size, size);
  const [hmCanvas, hmCtx] = createCanvas(size);
  const hmImg = hmCtx.createImageData(size, size);

  // Plank boundaries: 4 vertical planks
  const planks = 4;
  const plankW = size / planks;
  const plankBorder = Math.max(2, Math.round((size / 512) * 3));

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;

      // Which plank column?
      const plankCol = Math.floor(px / plankW);
      const localX = px - plankCol * plankW;

      // Is this a plank gap?
      const isGap = localX < plankBorder;

      if (isGap) {
        // Dark gap
        bcImg.data[i + 0] = 0x3a;
        bcImg.data[i + 1] = 0x28;
        bcImg.data[i + 2] = 0x08;
        bcImg.data[i + 3] = 255;

        const h = 30;
        hmImg.data[i + 0] = h;
        hmImg.data[i + 1] = h;
        hmImg.data[i + 2] = h;
        hmImg.data[i + 3] = 255;
      } else {
        // Wood grain: multiple overlapping sine waves along Y axis
        const yf = py / size;

        // Primary grain
        const grain1 = Math.sin(yf * Math.PI * 2 * 18 + plankCol * 2.7) * 0.5 + 0.5;
        // Secondary grain (finer)
        const grain2 = Math.sin(yf * Math.PI * 2 * 42 + plankCol * 5.3) * 0.5 + 0.5;
        // Subtle long-wave variation
        const grain3 = Math.sin(yf * Math.PI * 2 * 3 + plankCol * 1.1) * 0.5 + 0.5;

        // Combine: weight towards primary grain
        const grain = grain1 * 0.55 + grain2 * 0.25 + grain3 * 0.20;

        // Per-plank colour offset for variety
        const plankVariation = (hash2(plankCol, 0) - 0.5) * 30;

        // Map grain to ±25 brightness delta
        const delta = Math.round((grain - 0.5) * 50) + Math.round(plankVariation);

        bcImg.data[i + 0] = Math.max(0, Math.min(255, baseR + delta));
        bcImg.data[i + 1] = Math.max(0, Math.min(255, baseG + Math.round(delta * 0.85)));
        bcImg.data[i + 2] = Math.max(0, Math.min(255, baseB + Math.round(delta * 0.4)));
        bcImg.data[i + 3] = 255;

        // Height: grain peaks are slightly raised
        const h = Math.round(120 + grain * 80);
        hmImg.data[i + 0] = h;
        hmImg.data[i + 1] = h;
        hmImg.data[i + 2] = h;
        hmImg.data[i + 3] = 255;
      }
    }
  }

  bcCtx.putImageData(bcImg, 0, 0);
  hmCtx.putImageData(hmImg, 0, 0);

  const baseColor = bcCanvas.toDataURL();
  const normal = heightToNormalMap(hmCanvas, 1.5);

  // --- MetallicRoughness ---
  const [mrCanvas, mrCtx] = createCanvas(size);
  const mrImg = mrCtx.createImageData(size, size);
  const roughness = 0.75;

  for (let i = 0; i < size * size * 4; i += 4) {
    mrImg.data[i + 0] = 0;
    mrImg.data[i + 1] = Math.round(roughness * 255);
    mrImg.data[i + 2] = 0;
    mrImg.data[i + 3] = 255;
  }
  mrCtx.putImageData(mrImg, 0, 0);
  const metallicRoughness = mrCanvas.toDataURL();

  return { baseColor, normal, metallicRoughness };
}

// ---------------------------------------------------------------------------
// Stone tile floor
// ---------------------------------------------------------------------------

/**
 * Generates a PBR texture set for a stone tile floor.
 *
 * Layout: 4×4 grid of tiles with mortar gaps.
 *
 * BaseColor  : gray stone (#999999) with per-tile colour variation;
 *              dark mortar (#555555).
 * NormalMap  : from height map (tiles raised, mortar lower), strength 2.0.
 * MetallicRoughness: roughness ~0.9, metallic ~0.0.
 */
export function makeStoneTileTextures(size: number = 512): TextureSet {
  const tileCount = 4; // tiles per row/column
  const tileSize = size / tileCount;
  const mortarWidth = Math.max(3, Math.round((size / 512) * 6));

  // Base stone colour
  const stoneR = 0x99;
  const stoneG = 0x99;
  const stoneB = 0x99;

  // Mortar colour
  const mortarR = 0x55;
  const mortarG = 0x55;
  const mortarB = 0x55;

  function isMortar(px: number, py: number): boolean {
    const localX = px % tileSize;
    const localY = py % tileSize;
    return localX < mortarWidth || localY < mortarWidth;
  }

  function tileIndex(px: number, py: number): [number, number] {
    return [Math.floor(py / tileSize), Math.floor(px / tileSize)];
  }

  const [bcCanvas, bcCtx] = createCanvas(size);
  const bcImg = bcCtx.createImageData(size, size);
  const [hmCanvas, hmCtx] = createCanvas(size);
  const hmImg = hmCtx.createImageData(size, size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;

      if (isMortar(px, py)) {
        bcImg.data[i + 0] = mortarR;
        bcImg.data[i + 1] = mortarG;
        bcImg.data[i + 2] = mortarB;
        bcImg.data[i + 3] = 255;

        const h = 40;
        hmImg.data[i + 0] = h;
        hmImg.data[i + 1] = h;
        hmImg.data[i + 2] = h;
        hmImg.data[i + 3] = 255;
      } else {
        const [row, col] = tileIndex(px, py);

        // Per-tile colour variation: ±25 on all channels
        const v = hash2(row * 7 + col, row + col * 13);
        const delta = Math.round((v - 0.5) * 50);

        // Subtle intra-tile noise based on position within tile
        const localX = px % tileSize;
        const localY = py % tileSize;
        const noiseV = hash2(localX, localY);
        const noise = Math.round((noiseV - 0.5) * 12);

        bcImg.data[i + 0] = Math.max(0, Math.min(255, stoneR + delta + noise));
        bcImg.data[i + 1] = Math.max(0, Math.min(255, stoneG + delta + noise));
        bcImg.data[i + 2] = Math.max(0, Math.min(255, stoneB + delta + noise));
        bcImg.data[i + 3] = 255;

        // Height: tile surface with slight surface noise
        const h = Math.round(180 + noise * 0.5);
        hmImg.data[i + 0] = h;
        hmImg.data[i + 1] = h;
        hmImg.data[i + 2] = h;
        hmImg.data[i + 3] = 255;
      }
    }
  }

  bcCtx.putImageData(bcImg, 0, 0);
  hmCtx.putImageData(hmImg, 0, 0);

  const baseColor = bcCanvas.toDataURL();
  const normal = heightToNormalMap(hmCanvas, 2.0);

  // --- MetallicRoughness ---
  const [mrCanvas, mrCtx] = createCanvas(size);
  const mrImg = mrCtx.createImageData(size, size);

  for (let i = 0; i < size * size * 4; i += 4) {
    mrImg.data[i + 0] = 0;
    mrImg.data[i + 1] = Math.round(0.9 * 255); // roughness = 0.9
    mrImg.data[i + 2] = 0; // metallic = 0.0
    mrImg.data[i + 3] = 255;
  }
  mrCtx.putImageData(mrImg, 0, 0);
  const metallicRoughness = mrCanvas.toDataURL();

  return { baseColor, normal, metallicRoughness };
}
