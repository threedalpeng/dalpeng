export interface HdrImage {
  width: number;
  height: number;
  data: Float32Array; // RGBA, linear HDR
}

export async function loadHdr(url: string): Promise<HdrImage> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return parseHdr(new Uint8Array(buffer));
}

export function parseHdr(bytes: Uint8Array): HdrImage {
  let offset = 0;

  function readLine(): string {
    let line = "";
    while (offset < bytes.length) {
      const ch = bytes[offset++];
      if (ch === 0x0a) break; // \n
      line += String.fromCharCode(ch);
    }
    return line;
  }

  const magic = readLine();
  if (!magic.startsWith("#?")) {
    throw new Error("Not a valid Radiance HDR file");
  }

  let format = "";
  while (offset < bytes.length) {
    const line = readLine();
    if (line.length === 0) break;
    if (line.startsWith("FORMAT=")) {
      format = line.substring(7).trim();
    }
  }

  if (format !== "32-bit_rle_rgbe") {
    throw new Error(`Unsupported HDR format: ${format}`);
  }

  const resLine = readLine();
  const match = resLine.match(/^-Y\s+(\d+)\s+\+X\s+(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported HDR resolution format: ${resLine}`);
  }

  const height = parseInt(match[1], 10);
  const width = parseInt(match[2], 10);

  const rgbe = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * width * 4;
    decodeScanline(bytes, offset, width, rgbe, scanlineOffset);
    offset += scanlineByteLength(bytes, offset, width);
  }

  const data = new Float32Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = rgbe[i * 4];
    const g = rgbe[i * 4 + 1];
    const b = rgbe[i * 4 + 2];
    const e = rgbe[i * 4 + 3];

    if (e === 0) {
      data[i * 4] = 0;
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 0;
    } else {
      const scale = Math.pow(2, e - 128 - 8);
      data[i * 4] = r * scale;
      data[i * 4 + 1] = g * scale;
      data[i * 4 + 2] = b * scale;
    }
    data[i * 4 + 3] = 1.0;
  }

  return { width, height, data };
}

function scanlineByteLength(bytes: Uint8Array, offset: number, width: number): number {
  if (
    width >= 8 &&
    width <= 0x7fff &&
    bytes[offset] === 0x02 &&
    bytes[offset + 1] === 0x02 &&
    bytes[offset + 2] === ((width >> 8) & 0xff) &&
    bytes[offset + 3] === (width & 0xff)
  ) {
    let pos = offset + 4;
    for (let ch = 0; ch < 4; ch++) {
      let count = 0;
      while (count < width) {
        const code = bytes[pos++];
        if (code > 128) {
          count += code - 128;
          pos++;
        } else {
          count += code;
          pos += code;
        }
      }
    }
    return pos - offset;
  }

  return width * 4; // old-style, uncompressed
}

function decodeScanline(
  bytes: Uint8Array,
  offset: number,
  width: number,
  out: Uint8Array,
  outOffset: number
): void {
  if (
    width >= 8 &&
    width <= 0x7fff &&
    bytes[offset] === 0x02 &&
    bytes[offset + 1] === 0x02 &&
    bytes[offset + 2] === ((width >> 8) & 0xff) &&
    bytes[offset + 3] === (width & 0xff)
  ) {
    let pos = offset + 4;

    for (let ch = 0; ch < 4; ch++) {
      let x = 0;
      while (x < width) {
        const code = bytes[pos++];
        if (code > 128) {
          const runLen = code - 128;
          const val = bytes[pos++];
          for (let j = 0; j < runLen; j++) {
            out[outOffset + (x + j) * 4 + ch] = val;
          }
          x += runLen;
        } else {
          for (let j = 0; j < code; j++) {
            out[outOffset + (x + j) * 4 + ch] = bytes[pos++];
          }
          x += code;
        }
      }
    }
    return;
  }

  // old-style: 4 bytes per pixel (RGBE), no RLE
  for (let x = 0; x < width; x++) {
    out[outOffset + x * 4] = bytes[offset + x * 4];
    out[outOffset + x * 4 + 1] = bytes[offset + x * 4 + 1];
    out[outOffset + x * 4 + 2] = bytes[offset + x * 4 + 2];
    out[outOffset + x * 4 + 3] = bytes[offset + x * 4 + 3];
  }
}
