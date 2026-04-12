import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// --- CRC32 ---
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// --- PNG builder ---
function createPNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = width * 4;
  const rawData = Buffer.alloc(height * (1 + rowSize));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + rowSize)] = 0; // filter: none
    pixels.copy(rawData, y * (1 + rowSize) + 1, y * rowSize, (y + 1) * rowSize);
  }
  const compressed = deflateSync(rawData);

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, "ascii");
    const buf = Buffer.alloc(4 + typeBuf.length + data.length + 4);
    buf.writeUInt32BE(data.length, 0);
    typeBuf.copy(buf, 4);
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + data.length));
    buf.writeUInt32BE(crc, 8 + data.length);
    return buf;
  }

  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Color helpers ---
function hexToRgb(hex) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

function setPixel(pixels, width, x, y, r, g, b, a = 255) {
  const idx = (y * width + x) * 4;
  pixels[idx] = r;
  pixels[idx + 1] = g;
  pixels[idx + 2] = b;
  pixels[idx + 3] = a;
}

function fillRect(pixels, imgWidth, x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(pixels, imgWidth, x + dx, y + dy, r, g, b, a);
    }
  }
}

// Blend src color over existing pixel (alpha composite)
function blendPixel(pixels, imgWidth, x, y, r, g, b, alpha) {
  const idx = (y * imgWidth + x) * 4;
  const a = alpha / 255;
  const ia = 1 - a;
  pixels[idx] = Math.round(pixels[idx] * ia + r * a);
  pixels[idx + 1] = Math.round(pixels[idx + 1] * ia + g * a);
  pixels[idx + 2] = Math.round(pixels[idx + 2] * ia + b * a);
  pixels[idx + 3] = 255;
}

// Seeded LCG random — returns value in [0, 1), advances seed
function makeRng(initSeed) {
  let seed = initSeed & 0x7fffffff || 1;
  return {
    next() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    },
    nextInt(lo, hi) {
      // inclusive
      return lo + Math.floor(this.next() * (hi - lo + 1));
    },
  };
}

function clamp(v, lo = 0, hi = 255) {
  return Math.max(lo, Math.min(hi, v));
}

// =====================================================================
// TILE DRAWING FUNCTIONS (32x32)
// =====================================================================

const T = 32; // tile size

function drawGrass(pixels, imgWidth, tx, ty, rng, dark = false) {
  const baseR = dark ? 0x28 : 0x44;
  const baseG = dark ? 0x88 : 0xaa;
  const baseB = dark ? 0x33 : 0x44;

  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const noise = rng.nextInt(-8, 8);
      setPixel(
        pixels,
        imgWidth,
        tx + x,
        ty + y,
        clamp(baseR + noise),
        clamp(baseG + noise),
        clamp(baseB + noise)
      );
    }
  }

  // Grass blades — 3-5px tall vertical lines
  const bladeCount = 24;
  for (let i = 0; i < bladeCount; i++) {
    const bx = rng.nextInt(0, T - 1);
    const by = rng.nextInt(1, T - 6);
    const bh = rng.nextInt(3, 5);
    const bright = rng.next() > 0.5;
    const br = bright ? clamp(baseR + 20) : clamp(baseR - 20);
    const bg = bright ? clamp(baseG + 30) : clamp(baseG - 20);
    const bb = bright ? clamp(baseB + 5) : clamp(baseB - 10);
    for (let dy = 0; dy < bh; dy++) {
      setPixel(pixels, imgWidth, tx + bx, ty + by + dy, br, bg, bb);
    }
  }

  if (dark) {
    // Bushes with highlight/shadow
    const bushCount = rng.nextInt(2, 4);
    for (let i = 0; i < bushCount; i++) {
      const bx = tx + rng.nextInt(2, T - 8);
      const by = ty + rng.nextInt(2, T - 8);
      fillRect(pixels, imgWidth, bx, by, 5, 3, 0x22, 0x77, 0x22);
      fillRect(pixels, imgWidth, bx + 1, by, 3, 1, 0x33, 0x99, 0x33); // highlight
      fillRect(pixels, imgWidth, bx + 2, by + 3, 1, 2, 0x55, 0x44, 0x22); // stem
    }
    // Mushrooms
    const mushCount = rng.nextInt(0, 2);
    for (let i = 0; i < mushCount; i++) {
      const mx = tx + rng.nextInt(2, T - 5);
      const my = ty + rng.nextInt(4, T - 6);
      fillRect(pixels, imgWidth, mx, my, 3, 2, 0xcc, 0x44, 0x33); // cap
      setPixel(pixels, imgWidth, mx + 1, my, 0xff, 0xff, 0xff); // spot
      fillRect(pixels, imgWidth, mx + 1, my + 2, 1, 2, 0xee, 0xdd, 0xbb); // stem
    }
  } else {
    // Flower clusters
    const clusterCount = rng.nextInt(2, 4);
    for (let i = 0; i < clusterCount; i++) {
      const cx = rng.nextInt(1, T - 4);
      const cy = rng.nextInt(1, T - 4);
      const colors = [
        [0xff, 0xee, 0x22],
        [0xff, 0x88, 0xaa],
        [0xff, 0xff, 0xff],
      ];
      const col = colors[rng.nextInt(0, 2)];
      setPixel(pixels, imgWidth, tx + cx, ty + cy, col[0], col[1], col[2]);
      setPixel(pixels, imgWidth, tx + cx + 1, ty + cy, col[0], col[1], col[2]);
      setPixel(pixels, imgWidth, tx + cx, ty + cy + 1, col[0], col[1], col[2]);
      // Green center
      setPixel(pixels, imgWidth, tx + cx + 1, ty + cy + 1, 0x55, 0xbb, 0x44);
    }
  }
}

function drawDirt(pixels, imgWidth, tx, ty, rng) {
  const baseR = 0xcc,
    baseG = 0xaa,
    baseB = 0x88;

  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const centerBoost = y >= 12 && y <= 19 ? -6 : 0;
      const noise = rng.nextInt(-6, 6);
      setPixel(
        pixels,
        imgWidth,
        tx + x,
        ty + y,
        clamp(baseR + noise + centerBoost),
        clamp(baseG + noise + centerBoost),
        clamp(baseB + noise + centerBoost)
      );
    }
  }

  // Pebbles — larger and more detailed
  const pebbleCount = rng.nextInt(10, 18);
  for (let i = 0; i < pebbleCount; i++) {
    const px = rng.nextInt(0, T - 3);
    const py = rng.nextInt(0, T - 3);
    const pSize = rng.next() > 0.5 ? 2 : 1;
    const pr = clamp(baseR - 30 + rng.nextInt(-8, 8));
    const pg = clamp(baseG - 25 + rng.nextInt(-8, 8));
    const pb = clamp(baseB - 15 + rng.nextInt(-8, 8));
    fillRect(pixels, imgWidth, tx + px, ty + py, pSize, pSize, pr, pg, pb);
  }

  // Footprint marks — subtle darker ovals
  const fpCount = rng.nextInt(1, 3);
  for (let i = 0; i < fpCount; i++) {
    const fx = rng.nextInt(3, T - 8);
    const fy = rng.nextInt(3, T - 8);
    fillRect(
      pixels,
      imgWidth,
      tx + fx,
      ty + fy,
      3,
      2,
      clamp(baseR - 18),
      clamp(baseG - 15),
      clamp(baseB - 12)
    );
    fillRect(
      pixels,
      imgWidth,
      tx + fx + 1,
      ty + fy + 3,
      3,
      2,
      clamp(baseR - 18),
      clamp(baseG - 15),
      clamp(baseB - 12)
    );
  }

  // Worn lines
  for (let y = 5; y < T; y += 7) {
    for (let x = 0; x < T; x++) {
      if (rng.next() > 0.5) {
        blendPixel(
          pixels,
          imgWidth,
          tx + x,
          ty + y,
          clamp(baseR - 15),
          clamp(baseG - 12),
          clamp(baseB - 8),
          80
        );
      }
    }
  }
}

function drawStoneWall(pixels, imgWidth, tx, ty, rng) {
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const noise = rng.nextInt(-10, 10);
      const base = 0x88 + noise;
      setPixel(pixels, imgWidth, tx + x, ty + y, clamp(base), clamp(base), clamp(base));
    }
  }

  const mortarR = 0x55,
    mortarG = 0x55,
    mortarB = 0x55;
  // 3 rows of stones: mortar at y=10, y=21
  for (let x = 0; x < T; x++) {
    setPixel(pixels, imgWidth, tx + x, ty + 10, mortarR, mortarG, mortarB);
    setPixel(pixels, imgWidth, tx + x, ty + 21, mortarR, mortarG, mortarB);
  }

  // Vertical mortar — brick offset pattern
  const brickRows = [
    { yStart: 0, yEnd: 9, xs: [16] },
    { yStart: 11, yEnd: 20, xs: [8, 24] },
    { yStart: 22, yEnd: 31, xs: [16] },
  ];
  for (const { yStart, yEnd, xs } of brickRows) {
    for (const vx of xs) {
      for (let y = yStart; y <= yEnd; y++) {
        if (vx < T) setPixel(pixels, imgWidth, tx + vx, ty + y, mortarR, mortarG, mortarB);
      }
    }
  }

  // Highlight on top-left of each stone
  const hlR = 0xaa,
    hlG = 0xaa,
    hlB = 0xaa;
  for (const bx of [1, 17]) {
    for (let dx = 0; dx < 3; dx++) {
      if (bx + dx < T) setPixel(pixels, imgWidth, tx + bx + dx, ty + 1, hlR, hlG, hlB);
    }
  }
  for (const bx of [1, 9, 25]) {
    for (let dx = 0; dx < 2; dx++) {
      if (bx + dx < T) setPixel(pixels, imgWidth, tx + bx + dx, ty + 12, hlR, hlG, hlB);
    }
  }
}

function drawWater(pixels, imgWidth, tx, ty, rng) {
  const baseR = 0x22,
    baseG = 0x66,
    baseB = 0xcc;

  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      // Deeper color variation
      const depthShift = Math.sin(x * 0.3 + y * 0.2) * 8;
      const noise = rng.nextInt(-8, 8);
      setPixel(
        pixels,
        imgWidth,
        tx + x,
        ty + y,
        clamp(baseR + noise + depthShift),
        clamp(baseG + noise + depthShift),
        clamp(baseB + noise)
      );
    }
  }

  // Animated wave lines at y=7, y=15, y=23
  const waveOffsets = [
    0, 0, 1, 1, 0, -1, -1, 0, 0, 1, 1, 0, -1, -1, 0, 0, 0, 1, 1, 0, -1, -1, 0, 0, 1, 1, 0, -1, -1,
    0, 0, 0,
  ];
  for (const waveY of [7, 15, 23]) {
    for (let x = 0; x < T; x++) {
      const wy = waveY + (waveOffsets[x] || 0);
      if (wy >= 0 && wy < T) {
        setPixel(pixels, imgWidth, tx + x, ty + wy, 0x88, 0xbb, 0xff);
      }
    }
  }

  // Foam edges — lighter blue near top/bottom
  for (let x = 0; x < T; x++) {
    if (rng.next() > 0.4) {
      blendPixel(pixels, imgWidth, tx + x, ty + 0, 0xaa, 0xdd, 0xff, 100);
      blendPixel(pixels, imgWidth, tx + x, ty + T - 1, 0xaa, 0xdd, 0xff, 80);
    }
  }

  // White sparkle dots
  const sparkleCount = rng.nextInt(5, 10);
  for (let i = 0; i < sparkleCount; i++) {
    const sx = rng.nextInt(0, T - 1);
    const sy = rng.nextInt(0, T - 1);
    setPixel(pixels, imgWidth, tx + sx, ty + sy, 0xff, 0xff, 0xff);
  }
}

function drawSand(pixels, imgWidth, tx, ty, rng) {
  const baseR = 0xdd,
    baseG = 0xcc,
    baseB = 0x88;

  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const noise = rng.nextInt(-6, 6);
      setPixel(
        pixels,
        imgWidth,
        tx + x,
        ty + y,
        clamp(baseR + noise),
        clamp(baseG + noise),
        clamp(baseB + noise)
      );
    }
  }

  // Shell fragments
  const shellCount = rng.nextInt(2, 5);
  for (let i = 0; i < shellCount; i++) {
    const sx = rng.nextInt(2, T - 5);
    const sy = rng.nextInt(2, T - 4);
    const shellColor = rng.next() > 0.5 ? [0xee, 0xdd, 0xcc] : [0xcc, 0xbb, 0xaa];
    fillRect(pixels, imgWidth, tx + sx, ty + sy, 3, 2, shellColor[0], shellColor[1], shellColor[2]);
    setPixel(
      pixels,
      imgWidth,
      tx + sx + 1,
      ty + sy,
      clamp(shellColor[0] + 20),
      clamp(shellColor[1] + 20),
      clamp(shellColor[2] + 20)
    );
  }

  // Ripple patterns — curved lines
  const rippleCount = rng.nextInt(3, 6);
  for (let i = 0; i < rippleCount; i++) {
    const ry = rng.nextInt(3, T - 4);
    const rx = rng.nextInt(0, T - 10);
    const rl = rng.nextInt(6, 12);
    for (let dx = 0; dx < rl && rx + dx < T; dx++) {
      const curveY = ry + Math.round(Math.sin(dx * 0.5) * 1);
      if (curveY >= 0 && curveY < T) {
        blendPixel(
          pixels,
          imgWidth,
          tx + rx + dx,
          ty + curveY,
          clamp(baseR - 25),
          clamp(baseG - 22),
          clamp(baseB - 18),
          100
        );
      }
    }
  }

  // Dot texture
  const dotCount = rng.nextInt(12, 20);
  for (let i = 0; i < dotCount; i++) {
    const dx = rng.nextInt(0, T - 1);
    const dy = rng.nextInt(0, T - 1);
    setPixel(
      pixels,
      imgWidth,
      tx + dx,
      ty + dy,
      clamp(baseR - 20),
      clamp(baseG - 18),
      clamp(baseB - 15)
    );
  }
}

function drawWoodFloor(pixels, imgWidth, tx, ty, rng) {
  const baseR = 0xaa,
    baseG = 0x77,
    baseB = 0x44;

  for (let y = 0; y < T; y++) {
    const plankRow = Math.floor(y / 8);
    const intraY = y % 8;
    const plankShade = intraY === 0 ? 15 : intraY === 1 ? 8 : intraY === 2 ? 3 : 0;
    for (let x = 0; x < T; x++) {
      const noise = rng.nextInt(-5, 5);
      setPixel(
        pixels,
        imgWidth,
        tx + x,
        ty + y,
        clamp(baseR + noise + plankShade),
        clamp(baseG + noise + plankShade),
        clamp(baseB + noise + plankShade)
      );
    }
  }

  // Plank divider lines
  for (const lineY of [0, 8, 16, 24]) {
    for (let x = 0; x < T; x++) {
      if (lineY < T)
        setPixel(
          pixels,
          imgWidth,
          tx + x,
          ty + lineY,
          clamp(baseR - 35),
          clamp(baseG - 30),
          clamp(baseB - 20)
        );
    }
  }

  // Clear grain lines
  for (let plank = 0; plank < 4; plank++) {
    const py = plank * 8;
    for (const [dy, alpha] of [
      [3, 60],
      [4, 40],
      [5, 50],
      [6, 30],
    ]) {
      if (py + dy < T) {
        for (let x = 0; x < T; x++) {
          if (rng.next() > 0.35) {
            blendPixel(
              pixels,
              imgWidth,
              tx + x,
              ty + py + dy,
              clamp(baseR - 18),
              clamp(baseG - 14),
              clamp(baseB - 10),
              alpha
            );
          }
        }
      }
    }
  }

  // Knots
  for (const knotX of [7, 15, 23]) {
    for (const knotY of [4, 12, 20, 28]) {
      if (knotX < T && knotY < T) {
        setPixel(
          pixels,
          imgWidth,
          tx + knotX,
          ty + knotY,
          clamp(baseR - 40),
          clamp(baseG - 35),
          clamp(baseB - 25)
        );
        if (knotX + 1 < T)
          setPixel(
            pixels,
            imgWidth,
            tx + knotX + 1,
            ty + knotY,
            clamp(baseR - 35),
            clamp(baseG - 30),
            clamp(baseB - 20)
          );
      }
    }
  }

  // Nail details
  for (const nx of [3, 19]) {
    for (const ny of [2, 10, 18, 26]) {
      if (nx < T && ny < T) {
        setPixel(pixels, imgWidth, tx + nx, ty + ny, 0x66, 0x66, 0x66);
      }
    }
  }
}

function drawBrick(pixels, imgWidth, tx, ty, rng) {
  const baseR = 0xaa,
    baseG = 0x55,
    baseB = 0x33;
  const mortarR = 0x88,
    mortarG = 0x77,
    mortarB = 0x66;

  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const noise = rng.nextInt(-8, 8);
      setPixel(
        pixels,
        imgWidth,
        tx + x,
        ty + y,
        clamp(baseR + noise),
        clamp(baseG + noise),
        clamp(baseB + noise)
      );
    }
  }

  // 4 rows of bricks — mortar at y=0, y=8, y=16, y=24
  for (const lineY of [0, 8, 16, 24]) {
    if (lineY < T) {
      for (let x = 0; x < T; x++) {
        setPixel(pixels, imgWidth, tx + x, ty + lineY, mortarR, mortarG, mortarB);
      }
    }
  }

  // Vertical mortar — alternating offset per brick row
  // Row 0: 1-7 at x=16
  for (let y = 1; y <= 7; y++) {
    setPixel(pixels, imgWidth, tx + 16, ty + y, mortarR, mortarG, mortarB);
  }
  // Row 1: 9-15 at x=8 and x=24
  for (let y = 9; y <= 15; y++) {
    setPixel(pixels, imgWidth, tx + 8, ty + y, mortarR, mortarG, mortarB);
    if (24 < T) setPixel(pixels, imgWidth, tx + 24, ty + y, mortarR, mortarG, mortarB);
  }
  // Row 2: 17-23 at x=16
  for (let y = 17; y <= 23; y++) {
    setPixel(pixels, imgWidth, tx + 16, ty + y, mortarR, mortarG, mortarB);
  }
  // Row 3: 25-31 at x=8 and x=24
  for (let y = 25; y <= 31; y++) {
    setPixel(pixels, imgWidth, tx + 8, ty + y, mortarR, mortarG, mortarB);
    if (24 < T) setPixel(pixels, imgWidth, tx + 24, ty + y, mortarR, mortarG, mortarB);
  }

  // Highlight — top-left of each brick
  const hlR = clamp(baseR + 25),
    hlG = clamp(baseG + 20),
    hlB = clamp(baseB + 15);
  for (const bx of [1, 17]) {
    setPixel(pixels, imgWidth, tx + bx, ty + 1, hlR, hlG, hlB);
    setPixel(pixels, imgWidth, tx + bx + 1, ty + 1, hlR, hlG, hlB);
  }
  for (const bx of [1, 9, 25]) {
    if (bx < T) {
      setPixel(pixels, imgWidth, tx + bx, ty + 9, hlR, hlG, hlB);
      if (bx + 1 < T) setPixel(pixels, imgWidth, tx + bx + 1, ty + 9, hlR, hlG, hlB);
    }
  }

  // Cracks
  const crackCount = rng.nextInt(1, 3);
  for (let i = 0; i < crackCount; i++) {
    let cx = rng.nextInt(2, T - 4);
    let cy = rng.nextInt(2, T - 4);
    const cl = rng.nextInt(3, 6);
    for (let s = 0; s < cl; s++) {
      if (cx >= 0 && cx < T && cy >= 0 && cy < T) {
        blendPixel(pixels, imgWidth, tx + cx, ty + cy, 0x44, 0x22, 0x11, 120);
      }
      cx += rng.nextInt(-1, 1);
      cy += rng.nextInt(0, 1);
    }
  }
}

// =====================================================================
// TILESET GENERATION (32x32 tiles, 256x256 total)
// =====================================================================

const BASE_TILE_COLORS = [
  [0x44, 0xaa, 0x44], // 0: grass
  [0xcc, 0xaa, 0x88], // 1: path/dirt
  [0x77, 0x77, 0x77], // 2: stone wall
  [0x44, 0x88, 0xcc], // 3: water
  [0x28, 0x88, 0x33], // 4: dark grass
  [0xdd, 0xcc, 0x88], // 5: sand
  [0xaa, 0x77, 0x44], // 6: wood floor
  [0xaa, 0x55, 0x33], // 7: brick
];

const HUE_SHIFTS = [
  [0, 0, 0], // row 0: original
  [20, -10, -20], // row 1: warmer
  [-20, 20, 10], // row 2: cooler
  [10, 10, -15], // row 3: golden
  [-10, -5, 20], // row 4: bluish
  [15, -15, 5], // row 5: reddish
  [-15, 15, -10], // row 6: greenish
  [0, 10, 20], // row 7: teal
];

function drawDetailedTile(pixels, imgWidth, tx, ty, tileType, seed) {
  const rng = makeRng(seed * 7919 + tileType * 31 + tx * 3 + ty * 17);

  switch (tileType) {
    case 0:
      drawGrass(pixels, imgWidth, tx, ty, rng, false);
      break;
    case 1:
      drawDirt(pixels, imgWidth, tx, ty, rng);
      break;
    case 2:
      drawStoneWall(pixels, imgWidth, tx, ty, rng);
      break;
    case 3:
      drawWater(pixels, imgWidth, tx, ty, rng);
      break;
    case 4:
      drawGrass(pixels, imgWidth, tx, ty, rng, true);
      break;
    case 5:
      drawSand(pixels, imgWidth, tx, ty, rng);
      break;
    case 6:
      drawWoodFloor(pixels, imgWidth, tx, ty, rng);
      break;
    case 7:
      drawBrick(pixels, imgWidth, tx, ty, rng);
      break;
  }
}

function tintTile(pixels, imgWidth, tx, ty, dr, dg, db) {
  if (dr === 0 && dg === 0 && db === 0) return;
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const idx = ((ty + y) * imgWidth + (tx + x)) * 4;
      pixels[idx] = clamp(pixels[idx] + dr);
      pixels[idx + 1] = clamp(pixels[idx + 1] + dg);
      pixels[idx + 2] = clamp(pixels[idx + 2] + db);
    }
  }
}

function generateTileset() {
  const width = 256;
  const height = 256;
  const pixels = Buffer.alloc(width * height * 4);

  const TILE_SIZE = T;
  const COLS = 8;
  const ROWS = 8;

  for (let row = 0; row < ROWS; row++) {
    const [hdr, hdg, hdb] = HUE_SHIFTS[row];
    for (let col = 0; col < COLS; col++) {
      const tileType = col;
      const tx = col * TILE_SIZE;
      const ty = row * TILE_SIZE;
      drawDetailedTile(pixels, width, tx, ty, tileType, row * 100 + col);
      if (row > 0) {
        tintTile(pixels, width, tx, ty, hdr, hdg, hdb);
      }
    }
  }

  return createPNG(width, height, pixels);
}

// =====================================================================
// CHARACTER SPRITE GENERATION
// 32x48 JRPG-style sprites (FF6 / Chrono Trigger / RPG Maker MV proportions)
// 4 columns (walk cycle) x 4 rows (down/up/left/right) = 128x192 sheet
// =====================================================================

// Palette — anime girl, white & blue dress with pink hair
const OUTLINE = [0x22, 0x11, 0x33];
const HAIR = [0xf0, 0x95, 0xb5];
const HAIR_SH = [0xc5, 0x67, 0x89];
const HAIR_HL = [0xff, 0xb8, 0xd0];
const HAIR_RIM = [0xff, 0xff, 0xff];
const SKIN = [0xff, 0xe4, 0xd0];
const SKIN_SH = [0xf0, 0xc8, 0xb0];
const EYE_W = [0xff, 0xff, 0xff];
const EYE_IRIS = [0x55, 0x88, 0xdd];
const EYE_D = [0x22, 0x22, 0x44];
const EYE_HL = [0xff, 0xff, 0xff];
const BLUSH = [0xff, 0xb0, 0xb0];
const MOUTH = [0xc0, 0x60, 0x70];
const WHITE = [0xff, 0xff, 0xff];
const WHITE_SH = [0xdd, 0xdd, 0xee];
const BLUE = [0x55, 0x77, 0xcc];
const BLUE_SH = [0x33, 0x55, 0xaa];
const BLUE_HL = [0x88, 0xaa, 0xee];
const RIBBON = [0xff, 0x66, 0x88];
const RIBBON_SH = [0xc8, 0x44, 0x66];
const BOOT = [0x55, 0x33, 0x22];
const BOOT_SH = [0x33, 0x11, 0x00];
const STOCK = [0xf0, 0xf0, 0xf0];
const STOCK_SH = [0xc8, 0xc8, 0xd8];

const FRAME_W = 32;
const FRAME_H = 48;
const SHEET_W = 128;
const SHEET_H = 192;
const F = FRAME_W; // legacy alias used by sp()

function sp(pixels, w, fx, fy, x, y, col, a = 255) {
  if (x < 0 || x >= FRAME_W || y < 0 || y >= FRAME_H) return;
  if (a < 255) {
    blendPixel(pixels, w, fx + x, fy + y, col[0], col[1], col[2], a);
  } else {
    setPixel(pixels, w, fx + x, fy + y, col[0], col[1], col[2], a);
  }
}

function spRect(pixels, w, fx, fy, x, y, rw, rh, col) {
  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      sp(pixels, w, fx, fy, x + dx, y + dy, col);
    }
  }
}

// ---------------------------------------------------------------------
// Layout reference (32x48 frame, character centered around x=15..16)
//   y  0..3   hair top / antenna
//   y  4..15  head (12 tall, ~14 wide  → x≈9..22)
//   y 16..19  neck / shoulders
//   y 20..32  torso + skirt (~14 wide)
//   y 33..44  legs / stockings
//   y 45..47  boots / shadow
// Walk phases: 0=neutral, 1=left fwd (bob up), 2=neutral, 3=right fwd (bob up)
// ---------------------------------------------------------------------

// Outline a filled rect by drawing 1px outline only where there is no fill
// (used to add silhouette outline after fill is in place).
function outlineSilhouette(pixels, w, fx, fy) {
  // Walk every pixel, if it's transparent and any 4-neighbor inside the
  // frame is opaque (non-outline), set this to OUTLINE.
  const get = (x, y) => {
    if (x < 0 || x >= FRAME_W || y < 0 || y >= FRAME_H) return 0;
    return pixels[((fy + y) * w + (fx + x)) * 4 + 3];
  };
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      if (get(x, y) !== 0) continue;
      if (get(x - 1, y) > 0 || get(x + 1, y) > 0 || get(x, y - 1) > 0 || get(x, y + 1) > 0) {
        sp(pixels, w, fx, fy, x, y, OUTLINE);
      }
    }
  }
}

// Soft drop shadow under the feet (semi-transparent ellipse-ish)
function drawShadow(pixels, w, fx, fy) {
  // Centered ellipse at y=46
  sp(pixels, w, fx, fy, 11, 46, OUTLINE, 90);
  sp(pixels, w, fx, fy, 12, 46, OUTLINE, 110);
  sp(pixels, w, fx, fy, 13, 46, OUTLINE, 130);
  sp(pixels, w, fx, fy, 14, 46, OUTLINE, 140);
  sp(pixels, w, fx, fy, 15, 46, OUTLINE, 140);
  sp(pixels, w, fx, fy, 16, 46, OUTLINE, 140);
  sp(pixels, w, fx, fy, 17, 46, OUTLINE, 140);
  sp(pixels, w, fx, fy, 18, 46, OUTLINE, 140);
  sp(pixels, w, fx, fy, 19, 46, OUTLINE, 130);
  sp(pixels, w, fx, fy, 20, 46, OUTLINE, 110);
  sp(pixels, w, fx, fy, 21, 46, OUTLINE, 90);
}

// =====================================================================
// DOWN (front view)
// =====================================================================
function drawDown(pixels, w, fx, fy, phase) {
  const bob = phase === 1 || phase === 3 ? -1 : 0; // body bobs UP on step

  // ============ HEAD (skin base, y=4..15) ============
  // Round head shape, 14 wide, 12 tall, centered
  // y= 4: x=11..20 (10w)
  // y= 5: x=10..21 (12w)
  // y= 6..12: x= 9..22 (14w)
  // y=13: x=10..21 (12w)
  // y=14: x=11..20 (10w)
  // y=15: x=12..19 (chin, 8w)
  spRect(pixels, w, fx, fy, 11, 4 + bob, 10, 1, SKIN);
  spRect(pixels, w, fx, fy, 10, 5 + bob, 12, 1, SKIN);
  for (let y = 6; y <= 12; y++) {
    spRect(pixels, w, fx, fy, 9, y + bob, 14, 1, SKIN);
  }
  spRect(pixels, w, fx, fy, 10, 13 + bob, 12, 1, SKIN);
  spRect(pixels, w, fx, fy, 11, 14 + bob, 10, 1, SKIN);
  spRect(pixels, w, fx, fy, 12, 15 + bob, 8, 1, SKIN);

  // Jaw shading
  sp(pixels, w, fx, fy, 11, 13 + bob, SKIN_SH);
  sp(pixels, w, fx, fy, 20, 13 + bob, SKIN_SH);
  sp(pixels, w, fx, fy, 12, 14 + bob, SKIN_SH);
  sp(pixels, w, fx, fy, 19, 14 + bob, SKIN_SH);

  // ============ HAIR (back layer — long flowing) ============
  // Side curtains down to y=20-ish (mid-back length when seen front)
  for (let y = 6; y <= 20; y++) {
    sp(pixels, w, fx, fy, 7, y + bob, HAIR_SH);
    sp(pixels, w, fx, fy, 8, y + bob, HAIR);
    sp(pixels, w, fx, fy, 23, y + bob, HAIR);
    sp(pixels, w, fx, fy, 24, y + bob, HAIR_SH);
  }
  // Hair tip taper
  sp(pixels, w, fx, fy, 8, 21 + bob, HAIR_SH);
  sp(pixels, w, fx, fy, 23, 21 + bob, HAIR_SH);

  // ============ HAIR top / antenna (y=0..3) ============
  // Center crown ahoge
  sp(pixels, w, fx, fy, 15, 0 + bob, HAIR);
  sp(pixels, w, fx, fy, 16, 0 + bob, HAIR);
  spRect(pixels, w, fx, fy, 13, 1 + bob, 6, 1, HAIR);
  spRect(pixels, w, fx, fy, 12, 2 + bob, 8, 1, HAIR);
  spRect(pixels, w, fx, fy, 11, 3 + bob, 10, 1, HAIR);

  // ============ BANGS (y=4..7, covering forehead) ============
  // Two front bang clumps with parted center
  spRect(pixels, w, fx, fy, 10, 4 + bob, 12, 1, HAIR);
  // y=5: leave a 2px center skin gap (parted bangs)
  spRect(pixels, w, fx, fy, 9, 5 + bob, 4, 1, HAIR); // x9..12
  spRect(pixels, w, fx, fy, 19, 5 + bob, 4, 1, HAIR); // x19..22
  sp(pixels, w, fx, fy, 13, 5 + bob, HAIR);
  sp(pixels, w, fx, fy, 18, 5 + bob, HAIR);
  // y=6: bang fringe lower
  sp(pixels, w, fx, fy, 9, 6 + bob, HAIR);
  sp(pixels, w, fx, fy, 10, 6 + bob, HAIR);
  sp(pixels, w, fx, fy, 21, 6 + bob, HAIR);
  sp(pixels, w, fx, fy, 22, 6 + bob, HAIR);
  // y=7: side temple hair (next to eyes)
  sp(pixels, w, fx, fy, 9, 7 + bob, HAIR);
  sp(pixels, w, fx, fy, 22, 7 + bob, HAIR);

  // Hair highlights on top crown
  sp(pixels, w, fx, fy, 14, 2 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 15, 3 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 16, 3 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 17, 2 + bob, HAIR_HL);
  // Bang highlights
  sp(pixels, w, fx, fy, 11, 4 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 20, 4 + bob, HAIR_HL);
  // Side lock highlights
  sp(pixels, w, fx, fy, 8, 9 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 23, 9 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 8, 14 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 23, 14 + bob, HAIR_HL);

  // ============ EYES (large, y=8..10) ============
  // Left eye x=11..13 (3w), Right eye x=18..20 (3w)
  // Eye lash row (dark)
  sp(pixels, w, fx, fy, 11, 8 + bob, OUTLINE);
  sp(pixels, w, fx, fy, 12, 8 + bob, OUTLINE);
  sp(pixels, w, fx, fy, 13, 8 + bob, OUTLINE);
  sp(pixels, w, fx, fy, 18, 8 + bob, OUTLINE);
  sp(pixels, w, fx, fy, 19, 8 + bob, OUTLINE);
  sp(pixels, w, fx, fy, 20, 8 + bob, OUTLINE);
  // Iris row
  sp(pixels, w, fx, fy, 11, 9 + bob, EYE_IRIS);
  sp(pixels, w, fx, fy, 12, 9 + bob, EYE_D);
  sp(pixels, w, fx, fy, 13, 9 + bob, EYE_IRIS);
  sp(pixels, w, fx, fy, 18, 9 + bob, EYE_IRIS);
  sp(pixels, w, fx, fy, 19, 9 + bob, EYE_D);
  sp(pixels, w, fx, fy, 20, 9 + bob, EYE_IRIS);
  // Lower iris / sclera + highlight
  sp(pixels, w, fx, fy, 11, 10 + bob, EYE_W);
  sp(pixels, w, fx, fy, 12, 10 + bob, EYE_IRIS);
  sp(pixels, w, fx, fy, 13, 10 + bob, EYE_HL);
  sp(pixels, w, fx, fy, 18, 10 + bob, EYE_W);
  sp(pixels, w, fx, fy, 19, 10 + bob, EYE_IRIS);
  sp(pixels, w, fx, fy, 20, 10 + bob, EYE_HL);

  // ============ NOSE & MOUTH ============
  sp(pixels, w, fx, fy, 15, 11 + bob, SKIN_SH); // nose dot
  sp(pixels, w, fx, fy, 16, 11 + bob, SKIN_SH);
  sp(pixels, w, fx, fy, 15, 13 + bob, MOUTH); // small mouth
  sp(pixels, w, fx, fy, 16, 13 + bob, MOUTH);

  // ============ BLUSH ============
  sp(pixels, w, fx, fy, 10, 12 + bob, BLUSH, 140);
  sp(pixels, w, fx, fy, 11, 12 + bob, BLUSH, 110);
  sp(pixels, w, fx, fy, 20, 12 + bob, BLUSH, 110);
  sp(pixels, w, fx, fy, 21, 12 + bob, BLUSH, 140);

  // ============ NECK (y=16..17) ============
  spRect(pixels, w, fx, fy, 14, 16 + bob, 4, 1, SKIN);
  spRect(pixels, w, fx, fy, 14, 17 + bob, 4, 1, SKIN_SH);

  // ============ TORSO / DRESS (y=18..32) ============
  // Body does NOT bob to keep feet planted; only head/torso top bob.
  // Shoulders y=18 (wider)
  spRect(pixels, w, fx, fy, 10, 18, 12, 1, WHITE);
  // Blue collar/sailor flap y=18..19
  sp(pixels, w, fx, fy, 13, 18, BLUE);
  sp(pixels, w, fx, fy, 14, 18, BLUE);
  sp(pixels, w, fx, fy, 17, 18, BLUE);
  sp(pixels, w, fx, fy, 18, 18, BLUE);
  sp(pixels, w, fx, fy, 13, 19, BLUE);
  sp(pixels, w, fx, fy, 18, 19, BLUE);
  // White blouse y=19..23
  spRect(pixels, w, fx, fy, 11, 19, 10, 1, WHITE);
  // Cut out for collar V at center
  sp(pixels, w, fx, fy, 15, 19, SKIN_SH);
  sp(pixels, w, fx, fy, 16, 19, SKIN_SH);
  spRect(pixels, w, fx, fy, 11, 20, 10, 1, WHITE);
  spRect(pixels, w, fx, fy, 11, 21, 10, 1, WHITE);
  spRect(pixels, w, fx, fy, 11, 22, 10, 1, WHITE);
  // Blouse shading
  for (let y = 19; y <= 22; y++) {
    sp(pixels, w, fx, fy, 11, y, WHITE_SH);
    sp(pixels, w, fx, fy, 20, y, WHITE_SH);
  }
  // Pink ribbon at chest
  sp(pixels, w, fx, fy, 14, 21, RIBBON);
  sp(pixels, w, fx, fy, 15, 21, RIBBON);
  sp(pixels, w, fx, fy, 16, 21, RIBBON);
  sp(pixels, w, fx, fy, 17, 21, RIBBON);
  sp(pixels, w, fx, fy, 14, 22, RIBBON_SH);
  sp(pixels, w, fx, fy, 17, 22, RIBBON_SH);
  sp(pixels, w, fx, fy, 15, 22, RIBBON);
  sp(pixels, w, fx, fy, 16, 22, RIBBON);

  // Waist line (y=23) — slight pinch
  spRect(pixels, w, fx, fy, 12, 23, 8, 1, BLUE_SH);

  // Skirt y=24..32 (flared)
  spRect(pixels, w, fx, fy, 11, 24, 10, 1, BLUE);
  spRect(pixels, w, fx, fy, 11, 25, 10, 1, BLUE);
  spRect(pixels, w, fx, fy, 10, 26, 12, 1, BLUE);
  spRect(pixels, w, fx, fy, 10, 27, 12, 1, BLUE);
  spRect(pixels, w, fx, fy, 9, 28, 14, 1, BLUE);
  spRect(pixels, w, fx, fy, 9, 29, 14, 1, BLUE);
  spRect(pixels, w, fx, fy, 8, 30, 16, 1, BLUE);
  spRect(pixels, w, fx, fy, 8, 31, 16, 1, BLUE);
  // Skirt hem (slightly darker)
  spRect(pixels, w, fx, fy, 8, 32, 16, 1, BLUE_SH);

  // Skirt highlights (vertical center pleat) and shading edges
  for (let y = 24; y <= 31; y++) {
    sp(pixels, w, fx, fy, 15, y, BLUE_HL);
  }
  // Skirt edge shadows (left side)
  sp(pixels, w, fx, fy, 11, 24, BLUE_SH);
  sp(pixels, w, fx, fy, 11, 25, BLUE_SH);
  sp(pixels, w, fx, fy, 10, 26, BLUE_SH);
  sp(pixels, w, fx, fy, 10, 27, BLUE_SH);
  sp(pixels, w, fx, fy, 9, 28, BLUE_SH);
  sp(pixels, w, fx, fy, 9, 29, BLUE_SH);
  sp(pixels, w, fx, fy, 8, 30, BLUE_SH);
  sp(pixels, w, fx, fy, 8, 31, BLUE_SH);

  // ============ ARMS (hanging at sides, y=19..25) ============
  const armLOff = phase === 1 ? 1 : phase === 3 ? -1 : 0;
  const armROff = phase === 3 ? 1 : phase === 1 ? -1 : 0;
  // Left arm (white sleeve y=19..21, skin y=22..24)
  sp(pixels, w, fx, fy, 10, 19 + armLOff, WHITE);
  sp(pixels, w, fx, fy, 10, 20 + armLOff, WHITE_SH);
  sp(pixels, w, fx, fy, 10, 21 + armLOff, WHITE_SH);
  sp(pixels, w, fx, fy, 10, 22 + armLOff, SKIN);
  sp(pixels, w, fx, fy, 10, 23 + armLOff, SKIN);
  sp(pixels, w, fx, fy, 10, 24 + armLOff, SKIN_SH); // hand
  // Right arm
  sp(pixels, w, fx, fy, 21, 19 + armROff, WHITE);
  sp(pixels, w, fx, fy, 21, 20 + armROff, WHITE_SH);
  sp(pixels, w, fx, fy, 21, 21 + armROff, WHITE_SH);
  sp(pixels, w, fx, fy, 21, 22 + armROff, SKIN);
  sp(pixels, w, fx, fy, 21, 23 + armROff, SKIN);
  sp(pixels, w, fx, fy, 21, 24 + armROff, SKIN_SH); // hand

  // ============ LEGS / STOCKINGS (y=33..42) ============
  // Stockings y=33..40 (white)
  // Left leg x=12..14, Right leg x=17..19
  const stepL = phase === 1 ? -1 : phase === 3 ? 1 : 0;
  const stepR = phase === 3 ? -1 : phase === 1 ? 1 : 0;

  for (let y = 33; y <= 40; y++) {
    sp(pixels, w, fx, fy, 12, y, STOCK);
    sp(pixels, w, fx, fy, 13, y, STOCK);
    sp(pixels, w, fx, fy, 14, y, STOCK_SH);

    sp(pixels, w, fx, fy, 17, y, STOCK);
    sp(pixels, w, fx, fy, 18, y, STOCK);
    sp(pixels, w, fx, fy, 19, y, STOCK_SH);
  }

  // ============ BOOTS (y=41..45) ============
  // Left boot
  for (let y = 41; y <= 44; y++) {
    sp(pixels, w, fx, fy, 11, y, BOOT);
    sp(pixels, w, fx, fy, 12, y, BOOT);
    sp(pixels, w, fx, fy, 13, y, BOOT);
    sp(pixels, w, fx, fy, 14, y, BOOT_SH);
  }
  // Left boot sole
  sp(pixels, w, fx, fy, 11, 45 + stepL, BOOT_SH);
  sp(pixels, w, fx, fy, 12, 45 + stepL, BOOT_SH);
  sp(pixels, w, fx, fy, 13, 45 + stepL, BOOT_SH);
  sp(pixels, w, fx, fy, 14, 45 + stepL, BOOT_SH);

  // Right boot
  for (let y = 41; y <= 44; y++) {
    sp(pixels, w, fx, fy, 17, y, BOOT);
    sp(pixels, w, fx, fy, 18, y, BOOT);
    sp(pixels, w, fx, fy, 19, y, BOOT);
    sp(pixels, w, fx, fy, 20, y, BOOT_SH);
  }
  sp(pixels, w, fx, fy, 17, 45 + stepR, BOOT_SH);
  sp(pixels, w, fx, fy, 18, 45 + stepR, BOOT_SH);
  sp(pixels, w, fx, fy, 19, 45 + stepR, BOOT_SH);
  sp(pixels, w, fx, fy, 20, 45 + stepR, BOOT_SH);

  drawShadow(pixels, w, fx, fy);
  outlineSilhouette(pixels, w, fx, fy);
}

// =====================================================================
// UP (back view — all hair, no face)
// =====================================================================
function drawUp(pixels, w, fx, fy, phase) {
  const bob = phase === 1 || phase === 3 ? -1 : 0;

  // ============ HAIR back of head (y=0..15) ============
  // Crown ahoge
  sp(pixels, w, fx, fy, 15, 0 + bob, HAIR);
  sp(pixels, w, fx, fy, 16, 0 + bob, HAIR);
  spRect(pixels, w, fx, fy, 13, 1 + bob, 6, 1, HAIR);
  spRect(pixels, w, fx, fy, 12, 2 + bob, 8, 1, HAIR);
  spRect(pixels, w, fx, fy, 11, 3 + bob, 10, 1, HAIR);

  // Full back of head — all hair
  spRect(pixels, w, fx, fy, 10, 4 + bob, 12, 1, HAIR);
  spRect(pixels, w, fx, fy, 9, 5 + bob, 14, 1, HAIR);
  for (let y = 6; y <= 13; y++) {
    spRect(pixels, w, fx, fy, 9, y + bob, 14, 1, HAIR);
  }
  spRect(pixels, w, fx, fy, 10, 14 + bob, 12, 1, HAIR);
  spRect(pixels, w, fx, fy, 11, 15 + bob, 10, 1, HAIR);

  // Side hair down to mid-back, longer than the head
  for (let y = 6; y <= 22; y++) {
    sp(pixels, w, fx, fy, 7, y + bob, HAIR_SH);
    sp(pixels, w, fx, fy, 8, y + bob, HAIR);
    sp(pixels, w, fx, fy, 23, y + bob, HAIR);
    sp(pixels, w, fx, fy, 24, y + bob, HAIR_SH);
  }

  // Center back hair extends down past head onto shoulders
  for (let y = 16; y <= 22; y++) {
    spRect(pixels, w, fx, fy, 11, y + bob, 10, 1, HAIR);
  }
  // Tapered hair tip
  spRect(pixels, w, fx, fy, 12, 23 + bob, 8, 1, HAIR_SH);
  spRect(pixels, w, fx, fy, 13, 24 + bob, 6, 1, HAIR_SH);

  // Hair highlights — vertical light streak
  for (let y = 6; y <= 14; y++) {
    if (y % 3 !== 0) continue;
    sp(pixels, w, fx, fy, 13, y + bob, HAIR_HL);
    sp(pixels, w, fx, fy, 18, y + bob, HAIR_HL);
  }
  sp(pixels, w, fx, fy, 14, 5 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 17, 5 + bob, HAIR_HL);

  // Hair ribbon at back of head
  sp(pixels, w, fx, fy, 13, 11 + bob, RIBBON);
  sp(pixels, w, fx, fy, 14, 11 + bob, RIBBON);
  sp(pixels, w, fx, fy, 17, 11 + bob, RIBBON);
  sp(pixels, w, fx, fy, 18, 11 + bob, RIBBON);
  sp(pixels, w, fx, fy, 14, 12 + bob, RIBBON_SH);
  sp(pixels, w, fx, fy, 17, 12 + bob, RIBBON_SH);

  // ============ TORSO / DRESS (back) ============
  // Shoulders
  spRect(pixels, w, fx, fy, 10, 18, 12, 1, WHITE);
  // Sailor flap (back collar) y=18..20
  spRect(pixels, w, fx, fy, 12, 18, 8, 1, BLUE);
  spRect(pixels, w, fx, fy, 12, 19, 8, 1, BLUE);
  spRect(pixels, w, fx, fy, 13, 20, 6, 1, BLUE_SH);

  // White blouse bottom rows visible at sides
  spRect(pixels, w, fx, fy, 11, 19, 1, 1, WHITE);
  spRect(pixels, w, fx, fy, 20, 19, 1, 1, WHITE);
  spRect(pixels, w, fx, fy, 11, 20, 2, 1, WHITE);
  spRect(pixels, w, fx, fy, 19, 20, 2, 1, WHITE);
  spRect(pixels, w, fx, fy, 11, 21, 10, 1, WHITE);
  spRect(pixels, w, fx, fy, 11, 22, 10, 1, WHITE);
  spRect(pixels, w, fx, fy, 12, 23, 8, 1, BLUE_SH); // waist

  // Blouse shading edges
  for (let y = 19; y <= 22; y++) {
    sp(pixels, w, fx, fy, 11, y, WHITE_SH);
    sp(pixels, w, fx, fy, 20, y, WHITE_SH);
  }

  // Big back ribbon bow
  sp(pixels, w, fx, fy, 13, 22, RIBBON);
  sp(pixels, w, fx, fy, 14, 22, RIBBON);
  sp(pixels, w, fx, fy, 17, 22, RIBBON);
  sp(pixels, w, fx, fy, 18, 22, RIBBON);
  sp(pixels, w, fx, fy, 14, 23, RIBBON_SH);
  sp(pixels, w, fx, fy, 17, 23, RIBBON_SH);

  // Skirt y=24..32 (back = same flare)
  spRect(pixels, w, fx, fy, 11, 24, 10, 1, BLUE);
  spRect(pixels, w, fx, fy, 11, 25, 10, 1, BLUE);
  spRect(pixels, w, fx, fy, 10, 26, 12, 1, BLUE);
  spRect(pixels, w, fx, fy, 10, 27, 12, 1, BLUE);
  spRect(pixels, w, fx, fy, 9, 28, 14, 1, BLUE);
  spRect(pixels, w, fx, fy, 9, 29, 14, 1, BLUE);
  spRect(pixels, w, fx, fy, 8, 30, 16, 1, BLUE);
  spRect(pixels, w, fx, fy, 8, 31, 16, 1, BLUE);
  spRect(pixels, w, fx, fy, 8, 32, 16, 1, BLUE_SH);
  // Center pleat highlight
  for (let y = 24; y <= 31; y++) {
    sp(pixels, w, fx, fy, 15, y, BLUE_HL);
  }
  // Edge shadows
  sp(pixels, w, fx, fy, 11, 24, BLUE_SH);
  sp(pixels, w, fx, fy, 11, 25, BLUE_SH);
  sp(pixels, w, fx, fy, 10, 26, BLUE_SH);
  sp(pixels, w, fx, fy, 10, 27, BLUE_SH);
  sp(pixels, w, fx, fy, 9, 28, BLUE_SH);
  sp(pixels, w, fx, fy, 9, 29, BLUE_SH);
  sp(pixels, w, fx, fy, 8, 30, BLUE_SH);
  sp(pixels, w, fx, fy, 8, 31, BLUE_SH);

  // ============ ARMS ============
  const armLOff = phase === 1 ? 1 : phase === 3 ? -1 : 0;
  const armROff = phase === 3 ? 1 : phase === 1 ? -1 : 0;
  sp(pixels, w, fx, fy, 10, 19 + armLOff, WHITE);
  sp(pixels, w, fx, fy, 10, 20 + armLOff, WHITE_SH);
  sp(pixels, w, fx, fy, 10, 21 + armLOff, WHITE_SH);
  sp(pixels, w, fx, fy, 10, 22 + armLOff, SKIN);
  sp(pixels, w, fx, fy, 10, 23 + armLOff, SKIN);
  sp(pixels, w, fx, fy, 10, 24 + armLOff, SKIN_SH);
  sp(pixels, w, fx, fy, 21, 19 + armROff, WHITE);
  sp(pixels, w, fx, fy, 21, 20 + armROff, WHITE_SH);
  sp(pixels, w, fx, fy, 21, 21 + armROff, WHITE_SH);
  sp(pixels, w, fx, fy, 21, 22 + armROff, SKIN);
  sp(pixels, w, fx, fy, 21, 23 + armROff, SKIN);
  sp(pixels, w, fx, fy, 21, 24 + armROff, SKIN_SH);

  // ============ LEGS / STOCKINGS ============
  const stepL = phase === 1 ? -1 : phase === 3 ? 1 : 0;
  const stepR = phase === 3 ? -1 : phase === 1 ? 1 : 0;
  for (let y = 33; y <= 40; y++) {
    sp(pixels, w, fx, fy, 12, y, STOCK_SH);
    sp(pixels, w, fx, fy, 13, y, STOCK);
    sp(pixels, w, fx, fy, 14, y, STOCK);
    sp(pixels, w, fx, fy, 17, y, STOCK);
    sp(pixels, w, fx, fy, 18, y, STOCK);
    sp(pixels, w, fx, fy, 19, y, STOCK_SH);
  }

  // ============ BOOTS ============
  for (let y = 41; y <= 44; y++) {
    sp(pixels, w, fx, fy, 11, y, BOOT_SH);
    sp(pixels, w, fx, fy, 12, y, BOOT);
    sp(pixels, w, fx, fy, 13, y, BOOT);
    sp(pixels, w, fx, fy, 14, y, BOOT);
    sp(pixels, w, fx, fy, 17, y, BOOT);
    sp(pixels, w, fx, fy, 18, y, BOOT);
    sp(pixels, w, fx, fy, 19, y, BOOT);
    sp(pixels, w, fx, fy, 20, y, BOOT_SH);
  }
  // Heels (back view — heel facing viewer)
  sp(pixels, w, fx, fy, 12, 45 + stepL, BOOT_SH);
  sp(pixels, w, fx, fy, 13, 45 + stepL, BOOT_SH);
  sp(pixels, w, fx, fy, 14, 45 + stepL, BOOT_SH);
  sp(pixels, w, fx, fy, 17, 45 + stepR, BOOT_SH);
  sp(pixels, w, fx, fy, 18, 45 + stepR, BOOT_SH);
  sp(pixels, w, fx, fy, 19, 45 + stepR, BOOT_SH);

  drawShadow(pixels, w, fx, fy);
  outlineSilhouette(pixels, w, fx, fy);
}

// =====================================================================
// LEFT (side profile facing left)
// Character profile is centered around x=14..15, face points toward x=8.
// =====================================================================
function drawLeft(pixels, w, fx, fy, phase) {
  const bob = phase === 1 || phase === 3 ? -1 : 0;

  // ============ HEAD (side profile) ============
  // Face occupies x=10..19, slightly narrower than front
  // Profile silhouette:
  // y= 4: x=12..18
  // y= 5: x=11..19
  // y= 6..12: x=10..20
  // y=13: x=10..19
  // y=14: x=11..18 (chin angled)
  // y=15: x=12..17

  spRect(pixels, w, fx, fy, 12, 4 + bob, 7, 1, SKIN);
  spRect(pixels, w, fx, fy, 11, 5 + bob, 9, 1, SKIN);
  for (let y = 6; y <= 12; y++) {
    spRect(pixels, w, fx, fy, 10, y + bob, 11, 1, SKIN);
  }
  spRect(pixels, w, fx, fy, 10, 13 + bob, 10, 1, SKIN);
  spRect(pixels, w, fx, fy, 11, 14 + bob, 8, 1, SKIN);
  spRect(pixels, w, fx, fy, 12, 15 + bob, 6, 1, SKIN);

  // Nose bump (sticking out left)
  sp(pixels, w, fx, fy, 9, 9 + bob, SKIN);
  sp(pixels, w, fx, fy, 9, 10 + bob, SKIN);
  sp(pixels, w, fx, fy, 10, 11 + bob, SKIN_SH);

  // Jaw shadow
  sp(pixels, w, fx, fy, 11, 13 + bob, SKIN_SH);
  sp(pixels, w, fx, fy, 12, 14 + bob, SKIN_SH);

  // ============ HAIR back (right side flowing behind) ============
  // Long hair flowing behind from x=19..23 down to y=22
  for (let y = 6; y <= 22; y++) {
    sp(pixels, w, fx, fy, 21, y + bob, HAIR);
    sp(pixels, w, fx, fy, 22, y + bob, HAIR);
    sp(pixels, w, fx, fy, 23, y + bob, HAIR_SH);
  }
  // Hair tip
  sp(pixels, w, fx, fy, 22, 23 + bob, HAIR_SH);

  // ============ HAIR top + crown ============
  sp(pixels, w, fx, fy, 14, 0 + bob, HAIR);
  sp(pixels, w, fx, fy, 15, 0 + bob, HAIR);
  spRect(pixels, w, fx, fy, 12, 1 + bob, 6, 1, HAIR);
  spRect(pixels, w, fx, fy, 11, 2 + bob, 8, 1, HAIR);
  spRect(pixels, w, fx, fy, 10, 3 + bob, 10, 1, HAIR);

  // Top of head and back-of-head hair
  spRect(pixels, w, fx, fy, 10, 4 + bob, 11, 1, HAIR);
  spRect(pixels, w, fx, fy, 9, 5 + bob, 12, 1, HAIR);
  // Back of head hair (covers right side of head)
  for (let y = 6; y <= 13; y++) {
    sp(pixels, w, fx, fy, 19, y + bob, HAIR);
    sp(pixels, w, fx, fy, 20, y + bob, HAIR);
  }

  // Forehead bangs sweeping forward (left)
  sp(pixels, w, fx, fy, 9, 6 + bob, HAIR);
  sp(pixels, w, fx, fy, 10, 6 + bob, HAIR);
  sp(pixels, w, fx, fy, 11, 6 + bob, HAIR);
  sp(pixels, w, fx, fy, 9, 7 + bob, HAIR);
  sp(pixels, w, fx, fy, 10, 7 + bob, HAIR);
  // Bang fringe coming over the eye area
  sp(pixels, w, fx, fy, 11, 7 + bob, HAIR);
  sp(pixels, w, fx, fy, 13, 7 + bob, HAIR);

  // Hair highlights
  sp(pixels, w, fx, fy, 13, 2 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 14, 3 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 15, 3 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 21, 8 + bob, HAIR_HL);
  sp(pixels, w, fx, fy, 21, 14 + bob, HAIR_HL);

  // ============ EYE (one visible, looking left) ============
  // Positioned x=11..13, y=8..10
  sp(pixels, w, fx, fy, 11, 8 + bob, OUTLINE);
  sp(pixels, w, fx, fy, 12, 8 + bob, OUTLINE);
  sp(pixels, w, fx, fy, 13, 8 + bob, OUTLINE);
  sp(pixels, w, fx, fy, 11, 9 + bob, EYE_IRIS);
  sp(pixels, w, fx, fy, 12, 9 + bob, EYE_D);
  sp(pixels, w, fx, fy, 13, 9 + bob, EYE_IRIS);
  sp(pixels, w, fx, fy, 11, 10 + bob, EYE_W);
  sp(pixels, w, fx, fy, 12, 10 + bob, EYE_IRIS);
  sp(pixels, w, fx, fy, 13, 10 + bob, EYE_HL);

  // Mouth + blush
  sp(pixels, w, fx, fy, 11, 13 + bob, MOUTH);
  sp(pixels, w, fx, fy, 14, 12 + bob, BLUSH, 130);
  sp(pixels, w, fx, fy, 15, 12 + bob, BLUSH, 110);

  // ============ NECK ============
  spRect(pixels, w, fx, fy, 13, 16 + bob, 4, 1, SKIN);
  spRect(pixels, w, fx, fy, 13, 17 + bob, 4, 1, SKIN_SH);

  // ============ TORSO / DRESS (side view) ============
  // Body slightly narrower in side view: x=11..20
  // Shoulders y=18
  spRect(pixels, w, fx, fy, 11, 18, 10, 1, WHITE);
  // Sailor flap on collar
  sp(pixels, w, fx, fy, 13, 18, BLUE);
  sp(pixels, w, fx, fy, 14, 18, BLUE);
  sp(pixels, w, fx, fy, 13, 19, BLUE_SH);
  // White blouse y=19..22
  spRect(pixels, w, fx, fy, 11, 19, 10, 1, WHITE);
  spRect(pixels, w, fx, fy, 11, 20, 10, 1, WHITE);
  spRect(pixels, w, fx, fy, 11, 21, 10, 1, WHITE);
  spRect(pixels, w, fx, fy, 11, 22, 10, 1, WHITE);
  // Front edge highlight, back edge shadow
  for (let y = 19; y <= 22; y++) {
    sp(pixels, w, fx, fy, 11, y, WHITE); // front
    sp(pixels, w, fx, fy, 20, y, WHITE_SH); // back side
  }
  // Side ribbon nub at chest
  sp(pixels, w, fx, fy, 13, 21, RIBBON);
  sp(pixels, w, fx, fy, 14, 21, RIBBON);
  sp(pixels, w, fx, fy, 15, 21, RIBBON_SH);

  // Waist
  spRect(pixels, w, fx, fy, 12, 23, 8, 1, BLUE_SH);

  // Skirt (side view — shorter horizontal flare)
  spRect(pixels, w, fx, fy, 11, 24, 10, 1, BLUE);
  spRect(pixels, w, fx, fy, 10, 25, 11, 1, BLUE);
  spRect(pixels, w, fx, fy, 10, 26, 11, 1, BLUE);
  spRect(pixels, w, fx, fy, 9, 27, 12, 1, BLUE);
  spRect(pixels, w, fx, fy, 9, 28, 12, 1, BLUE);
  spRect(pixels, w, fx, fy, 9, 29, 13, 1, BLUE);
  spRect(pixels, w, fx, fy, 9, 30, 13, 1, BLUE);
  spRect(pixels, w, fx, fy, 9, 31, 13, 1, BLUE);
  spRect(pixels, w, fx, fy, 9, 32, 13, 1, BLUE_SH);
  // Skirt highlights and shadows
  for (let y = 24; y <= 31; y++) {
    sp(pixels, w, fx, fy, 13, y, BLUE_HL);
    sp(pixels, w, fx, fy, 19, y, BLUE_SH);
  }

  // ============ ARMS (side: front + back) ============
  // Front arm (closer to viewer = more visible, swings opposite to leg)
  const frontArmOff = phase === 1 ? 1 : phase === 3 ? -1 : 0;
  const backArmOff = -frontArmOff;
  // Back arm (mostly hidden, peeks at shoulder)
  for (let y = 19; y <= 22; y++) {
    sp(pixels, w, fx, fy, 16, y + backArmOff, WHITE_SH);
  }
  sp(pixels, w, fx, fy, 16, 23 + backArmOff, SKIN_SH);
  sp(pixels, w, fx, fy, 16, 24 + backArmOff, SKIN_SH);

  // Front arm visible at side
  sp(pixels, w, fx, fy, 14, 19 + frontArmOff, WHITE);
  sp(pixels, w, fx, fy, 14, 20 + frontArmOff, WHITE);
  sp(pixels, w, fx, fy, 14, 21 + frontArmOff, WHITE_SH);
  sp(pixels, w, fx, fy, 14, 22 + frontArmOff, SKIN);
  sp(pixels, w, fx, fy, 14, 23 + frontArmOff, SKIN);
  sp(pixels, w, fx, fy, 14, 24 + frontArmOff, SKIN_SH);

  // ============ LEGS / STOCKINGS (front + back distinction) ============
  // Front leg occupies x=13..15, back leg x=15..17
  const frontLegOff = phase === 1 ? -1 : phase === 3 ? 1 : 0;
  const backLegOff = -frontLegOff;

  for (let y = 33; y <= 40; y++) {
    // back leg
    sp(pixels, w, fx, fy, 16, y, STOCK_SH);
    sp(pixels, w, fx, fy, 17, y, STOCK_SH);
    // front leg (slightly forward)
    sp(pixels, w, fx, fy, 13, y, STOCK);
    sp(pixels, w, fx, fy, 14, y, STOCK);
  }

  // ============ BOOTS ============
  // Back boot (drawn first so front overlaps)
  for (let y = 41; y <= 44; y++) {
    sp(pixels, w, fx, fy, 16, y + backLegOff, BOOT_SH);
    sp(pixels, w, fx, fy, 17, y + backLegOff, BOOT_SH);
    sp(pixels, w, fx, fy, 18, y + backLegOff, BOOT_SH);
  }
  sp(pixels, w, fx, fy, 15, 45 + backLegOff, BOOT_SH);
  sp(pixels, w, fx, fy, 16, 45 + backLegOff, BOOT_SH);
  sp(pixels, w, fx, fy, 17, 45 + backLegOff, BOOT_SH);
  sp(pixels, w, fx, fy, 18, 45 + backLegOff, BOOT_SH);

  // Front boot
  for (let y = 41; y <= 44; y++) {
    sp(pixels, w, fx, fy, 12, y + frontLegOff, BOOT);
    sp(pixels, w, fx, fy, 13, y + frontLegOff, BOOT);
    sp(pixels, w, fx, fy, 14, y + frontLegOff, BOOT);
  }
  sp(pixels, w, fx, fy, 11, 45 + frontLegOff, BOOT_SH);
  sp(pixels, w, fx, fy, 12, 45 + frontLegOff, BOOT_SH);
  sp(pixels, w, fx, fy, 13, 45 + frontLegOff, BOOT_SH);
  sp(pixels, w, fx, fy, 14, 45 + frontLegOff, BOOT_SH);

  drawShadow(pixels, w, fx, fy);
  outlineSilhouette(pixels, w, fx, fy);
}

// =====================================================================
// RIGHT — exact horizontal mirror of LEFT
// =====================================================================
function drawRight(pixels, w, fx, fy, phase) {
  const tempPixels = Buffer.alloc(FRAME_W * FRAME_H * 4);
  drawLeft(tempPixels, FRAME_W, 0, 0, phase);
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const srcIdx = (y * FRAME_W + (FRAME_W - 1 - x)) * 4;
      const a = tempPixels[srcIdx + 3];
      if (a > 0) {
        setPixel(
          pixels,
          w,
          fx + x,
          fy + y,
          tempPixels[srcIdx],
          tempPixels[srcIdx + 1],
          tempPixels[srcIdx + 2],
          a
        );
      }
    }
  }
}

function drawPixelCharacter(pixels, imgWidth, frameX, frameY, facing, walkPhase) {
  switch (facing) {
    case "down":
      drawDown(pixels, imgWidth, frameX, frameY, walkPhase);
      break;
    case "up":
      drawUp(pixels, imgWidth, frameX, frameY, walkPhase);
      break;
    case "left":
      drawLeft(pixels, imgWidth, frameX, frameY, walkPhase);
      break;
    case "right":
      drawRight(pixels, imgWidth, frameX, frameY, walkPhase);
      break;
  }
}

function generateCharacter() {
  const width = SHEET_W;
  const height = SHEET_H;
  const pixels = Buffer.alloc(width * height * 4);

  const FACINGS = ["down", "up", "left", "right"];
  const WALK_PHASES = [0, 1, 0, 3];

  for (let row = 0; row < 4; row++) {
    const facing = FACINGS[row];
    for (let col = 0; col < 4; col++) {
      const frameX = col * FRAME_W;
      const frameY = row * FRAME_H;
      const walkPhase = WALK_PHASES[col];
      drawPixelCharacter(pixels, width, frameX, frameY, facing, walkPhase);
    }
  }

  return createPNG(width, height, pixels);
}

// --- Write files ---
function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

const tilesetPath = resolve(projectRoot, "public/assets/tilesets/overworld.png");
const characterPath = resolve(projectRoot, "public/assets/sprites/player.png");

ensureDir(tilesetPath);
ensureDir(characterPath);

console.log("Generating tileset...");
writeFileSync(tilesetPath, generateTileset());
console.log(`  Written: ${tilesetPath}`);

console.log("Generating character spritesheet...");
writeFileSync(characterPath, generateCharacter());
console.log(`  Written: ${characterPath}`);

console.log("Done.");
