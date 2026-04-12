export interface TextureSet {
  baseColor: string; // data URL
  normal: string; // data URL
  metallicRoughness: string; // data URL (G=roughness, B=metallic, glTF convention)
}

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  return [canvas, ctx];
}

// Deterministic hash: two integers → float in [0, 1). Used for per-tile variation.
function hash2(a: number, b: number): number {
  let x = (a * 1619 + b * 31337 + a * b * 3571) & 0x7fffffff;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = (x >> 16) ^ x;
  return (x & 0x7fffffff) / 0x7fffffff;
}

// Converts a grayscale height-map canvas to a normal-map data URL using finite differences.
// Encoding: OpenGL/glTF convention — R=nx*0.5+0.5, G=ny*0.5+0.5, B=nz*0.5+0.5.
function heightToNormalMap(canvas: HTMLCanvasElement, strength: number): string {
  const w = canvas.width;
  const h = canvas.height;
  const srcCtx = canvas.getContext("2d")!;
  const src = srcCtx.getImageData(0, 0, w, h);

  const height = (x: number, y: number): number => {
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

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const i = (y * w + x) * 4;
      out.data[i + 0] = Math.round((nx * 0.5 + 0.5) * 255);
      out.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out.data[i + 3] = 255;
    }
  }

  outCtx.putImageData(out, 0, 0);
  return outCanvas.toDataURL();
}

export function makeBrickTextures(size: number = 512): TextureSet {
  const rows = 8;
  const cols = 4;
  const mortarWidth = Math.max(2, Math.round((size / 512) * 4));

  const rowH = size / rows;
  const colW = size / cols;

  function isMortar(px: number, py: number): boolean {
    const row = Math.floor(py / rowH);
    const offset = row % 2 === 0 ? 0 : colW / 2;

    // Horizontal mortar (top edge of each row)
    const localY = py - row * rowH;
    if (localY < mortarWidth) return true;

    // Vertical mortar
    const relX = (((px - offset) % colW) + colW) % colW;
    if (relX < mortarWidth) return true;

    return false;
  }

  function brickIndex(px: number, py: number): [number, number] {
    const row = Math.floor(py / rowH);
    const offset = row % 2 === 0 ? 0 : colW / 2;
    const col = Math.floor(
      ((((px - offset) % (size + colW)) + (size + colW)) % (size + colW)) / colW
    );
    return [row, col];
  }

  const [bcCanvas, bcCtx] = createCanvas(size);
  const bcImg = bcCtx.createImageData(size, size);

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

  const [mrCanvas, mrCtx] = createCanvas(size);
  const mrImg = mrCtx.createImageData(size, size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      const roughness = isMortar(px, py) ? 0.95 : 0.85;

      mrImg.data[i + 0] = 0;
      mrImg.data[i + 1] = Math.round(roughness * 255); // G=roughness, B=metallic (glTF)
      mrImg.data[i + 2] = 0;
      mrImg.data[i + 3] = 255;
    }
  }
  mrCtx.putImageData(mrImg, 0, 0);
  const metallicRoughness = mrCanvas.toDataURL();

  return { baseColor, normal, metallicRoughness };
}

export function makeWoodTextures(size: number = 512): TextureSet {
  const baseR = 0x8b;
  const baseG = 0x69;
  const baseB = 0x14;

  const [bcCanvas, bcCtx] = createCanvas(size);
  const bcImg = bcCtx.createImageData(size, size);
  const [hmCanvas, hmCtx] = createCanvas(size);
  const hmImg = hmCtx.createImageData(size, size);

  const planks = 4;
  const plankW = size / planks;
  const plankBorder = Math.max(2, Math.round((size / 512) * 3));

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;

      const plankCol = Math.floor(px / plankW);
      const localX = px - plankCol * plankW;
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
        const yf = py / size;
        const grain1 = Math.sin(yf * Math.PI * 2 * 18 + plankCol * 2.7) * 0.5 + 0.5;
        const grain2 = Math.sin(yf * Math.PI * 2 * 42 + plankCol * 5.3) * 0.5 + 0.5;
        const grain3 = Math.sin(yf * Math.PI * 2 * 3 + plankCol * 1.1) * 0.5 + 0.5;
        const grain = grain1 * 0.55 + grain2 * 0.25 + grain3 * 0.2;
        const plankVariation = (hash2(plankCol, 0) - 0.5) * 30;
        const delta = Math.round((grain - 0.5) * 50) + Math.round(plankVariation);

        bcImg.data[i + 0] = Math.max(0, Math.min(255, baseR + delta));
        bcImg.data[i + 1] = Math.max(0, Math.min(255, baseG + Math.round(delta * 0.85)));
        bcImg.data[i + 2] = Math.max(0, Math.min(255, baseB + Math.round(delta * 0.4)));
        bcImg.data[i + 3] = 255;

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

export function makeStoneTileTextures(size: number = 512): TextureSet {
  const tileCount = 4;
  const tileSize = size / tileCount;
  const mortarWidth = Math.max(3, Math.round((size / 512) * 6));

  const stoneR = 0x99;
  const stoneG = 0x99;
  const stoneB = 0x99;

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

        const v = hash2(row * 7 + col, row + col * 13);
        const delta = Math.round((v - 0.5) * 50);

        const localX = px % tileSize;
        const localY = py % tileSize;
        const noiseV = hash2(localX, localY);
        const noise = Math.round((noiseV - 0.5) * 12);

        bcImg.data[i + 0] = Math.max(0, Math.min(255, stoneR + delta + noise));
        bcImg.data[i + 1] = Math.max(0, Math.min(255, stoneG + delta + noise));
        bcImg.data[i + 2] = Math.max(0, Math.min(255, stoneB + delta + noise));
        bcImg.data[i + 3] = 255;

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
    mrImg.data[i + 1] = Math.round(0.9 * 255);
    mrImg.data[i + 2] = 0;
    mrImg.data[i + 3] = 255;
  }
  mrCtx.putImageData(mrImg, 0, 0);
  const metallicRoughness = mrCanvas.toDataURL();

  return { baseColor, normal, metallicRoughness };
}
