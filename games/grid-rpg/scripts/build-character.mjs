import { inflateSync, deflateSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

// --- PNG decoder ---
function decodePNG(buffer) {
  // Verify PNG signature
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== sig[i]) throw new Error("Not a valid PNG file");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  // Read chunks
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8) throw new Error(`Unsupported bit depth: ${bitDepth}`);
      if (colorType !== 6) throw new Error(`Unsupported color type: ${colorType} (expected 6 = RGBA)`);
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  // Inflate all IDAT chunks
  const compressed = Buffer.concat(idatChunks);
  const raw = inflateSync(compressed);

  const bytesPerPixel = 4; // RGBA
  const rowSize = width * bytesPerPixel;
  const pixels = Buffer.alloc(height * rowSize);

  // Apply PNG filters per scanline
  for (let y = 0; y < height; y++) {
    const filterType = raw[y * (1 + rowSize)];
    const srcRow = raw.subarray(y * (1 + rowSize) + 1, y * (1 + rowSize) + 1 + rowSize);
    const dstRow = pixels.subarray(y * rowSize, (y + 1) * rowSize);
    const prevRow = y > 0 ? pixels.subarray((y - 1) * rowSize, y * rowSize) : null;

    for (let x = 0; x < rowSize; x++) {
      const raw_val = srcRow[x];
      const a = x >= bytesPerPixel ? dstRow[x - bytesPerPixel] : 0;
      const b = prevRow ? prevRow[x] : 0;
      const c = (x >= bytesPerPixel && prevRow) ? prevRow[x - bytesPerPixel] : 0;

      switch (filterType) {
        case 0: // None
          dstRow[x] = raw_val;
          break;
        case 1: // Sub
          dstRow[x] = (raw_val + a) & 0xff;
          break;
        case 2: // Up
          dstRow[x] = (raw_val + b) & 0xff;
          break;
        case 3: // Average
          dstRow[x] = (raw_val + Math.floor((a + b) / 2)) & 0xff;
          break;
        case 4: { // Paeth
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          let pr;
          if (pa <= pb && pa <= pc) pr = a;
          else if (pb <= pc) pr = b;
          else pr = c;
          dstRow[x] = (raw_val + pr) & 0xff;
          break;
        }
        default:
          throw new Error(`Unknown PNG filter type: ${filterType}`);
      }
    }
  }

  return { width, height, pixels };
}

// --- PNG encoder ---
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

// --- Alpha-over compositing ---
// Composite src over dst in-place (dst is modified)
function alphaOver(dst, src, width, height) {
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const srcA = src[idx + 3] / 255;
    const dstA = dst[idx + 3] / 255;

    if (srcA === 0) continue; // fully transparent src — skip

    const outA = srcA + dstA * (1 - srcA);

    if (outA === 0) {
      dst[idx] = 0;
      dst[idx + 1] = 0;
      dst[idx + 2] = 0;
      dst[idx + 3] = 0;
    } else {
      dst[idx]     = Math.round((src[idx]     * srcA + dst[idx]     * dstA * (1 - srcA)) / outA);
      dst[idx + 1] = Math.round((src[idx + 1] * srcA + dst[idx + 1] * dstA * (1 - srcA)) / outA);
      dst[idx + 2] = Math.round((src[idx + 2] * srcA + dst[idx + 2] * dstA * (1 - srcA)) / outA);
      dst[idx + 3] = Math.round(outA * 255);
    }
  }
}

// --- Main ---
const ASSETS_DIR = resolve(projectRoot, "public/assets");
const BASE_PATH   = resolve(ASSETS_DIR, "ManaSeed/character_base/char_a_p1/char_a_p1_0bas_humn_v01.png");
const OUTFIT_PATH = resolve(ASSETS_DIR, "ManaSeed/character_base/char_a_p1/1out/char_a_p1_1out_fstr_v02.png");
const HAIR_PATH   = resolve(ASSETS_DIR, "ManaSeed/character_base/char_a_p1/4har/char_a_p1_4har_bob1_v05.png");
const OUTPUT_DIR  = resolve(projectRoot, "public/assets/sprites");
const OUTPUT_PATH = resolve(OUTPUT_DIR, "player.png");

console.log("Loading layers...");
const base   = decodePNG(readFileSync(BASE_PATH));
const outfit = decodePNG(readFileSync(OUTFIT_PATH));
const hair   = decodePNG(readFileSync(HAIR_PATH));

console.log(`Base:   ${base.width}x${base.height}`);
console.log(`Outfit: ${outfit.width}x${outfit.height}`);
console.log(`Hair:   ${hair.width}x${hair.height}`);

if (base.width !== outfit.width || base.width !== hair.width ||
    base.height !== outfit.height || base.height !== hair.height) {
  throw new Error("Layer dimensions do not match!");
}

const { width, height } = base;

// Composite: start with base, then alpha-over outfit, then hair
console.log("Compositing layers (base → outfit → hair)...");
const composite = Buffer.from(base.pixels); // copy
alphaOver(composite, outfit.pixels, width, height);
alphaOver(composite, hair.pixels, width, height);

// Encode and write
console.log(`Writing ${width}x${height} composite to: ${OUTPUT_PATH}`);
mkdirSync(OUTPUT_DIR, { recursive: true });
const pngData = createPNG(width, height, composite);
writeFileSync(OUTPUT_PATH, pngData);

console.log(`Done! Output file size: ${pngData.length} bytes`);
