export interface HdrImage {
  width: number;
  height: number;
  data: Float32Array; // RGBA, linear HDR
}

/**
 * Fetch and parse a Radiance .hdr (RGBE) file.
 * Returns linear HDR float data in RGBA format (4 floats per pixel).
 */
export async function loadHdr(url: string): Promise<HdrImage> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return parseHdr(new Uint8Array(buffer));
}

/**
 * Parse a Radiance .hdr (RGBE) byte array.
 */
export function parseHdr(bytes: Uint8Array): HdrImage {
  let offset = 0;

  // Read text line
  function readLine(): string {
    let line = "";
    while (offset < bytes.length) {
      const ch = bytes[offset++];
      if (ch === 0x0a) break; // \n
      line += String.fromCharCode(ch);
    }
    return line;
  }

  // Parse header
  const magic = readLine();
  if (!magic.startsWith("#?")) {
    throw new Error("Not a valid Radiance HDR file");
  }

  let format = "";
  while (offset < bytes.length) {
    const line = readLine();
    if (line.length === 0) break; // empty line ends header
    if (line.startsWith("FORMAT=")) {
      format = line.substring(7).trim();
    }
  }

  if (format !== "32-bit_rle_rgbe") {
    throw new Error(`Unsupported HDR format: ${format}`);
  }

  // Parse resolution line: "-Y height +X width"
  const resLine = readLine();
  const match = resLine.match(/^-Y\s+(\d+)\s+\+X\s+(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported HDR resolution format: ${resLine}`);
  }

  const height = parseInt(match[1], 10);
  const width = parseInt(match[2], 10);

  // Decode scanlines
  const rgbe = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * width * 4;
    decodeScanline(bytes, offset, width, rgbe, scanlineOffset);
    offset += scanlineByteLength(bytes, offset, width);
  }

  // Convert RGBE → linear float RGBA
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
    data[i * 4 + 3] = 1.0; // Alpha
  }

  return { width, height, data };
}

/**
 * Calculate byte length of an encoded scanline.
 */
function scanlineByteLength(bytes: Uint8Array, offset: number, width: number): number {
  // Check for new-style RLE
  if (
    width >= 8 && width <= 0x7fff &&
    bytes[offset] === 0x02 &&
    bytes[offset + 1] === 0x02 &&
    bytes[offset + 2] === ((width >> 8) & 0xff) &&
    bytes[offset + 3] === (width & 0xff)
  ) {
    // New RLE: 4-byte header + channel-separated RLE data
    let pos = offset + 4;
    for (let ch = 0; ch < 4; ch++) {
      let count = 0;
      while (count < width) {
        const code = bytes[pos++];
        if (code > 128) {
          count += code - 128;
          pos++; // run value
        } else {
          count += code;
          pos += code; // literal values
        }
      }
    }
    return pos - offset;
  }

  // Old-style or uncompressed — 4 bytes per pixel
  return width * 4;
}

/**
 * Decode a single scanline from RGBE RLE encoding.
 */
function decodeScanline(
  bytes: Uint8Array,
  offset: number,
  width: number,
  out: Uint8Array,
  outOffset: number
): void {
  // Check for new-style RLE: 0x02 0x02 followed by width as 2 bytes
  if (
    width >= 8 && width <= 0x7fff &&
    bytes[offset] === 0x02 &&
    bytes[offset + 1] === 0x02 &&
    bytes[offset + 2] === ((width >> 8) & 0xff) &&
    bytes[offset + 3] === (width & 0xff)
  ) {
    let pos = offset + 4;

    // Decode 4 channels separately
    for (let ch = 0; ch < 4; ch++) {
      let x = 0;
      while (x < width) {
        const code = bytes[pos++];
        if (code > 128) {
          // RLE run
          const runLen = code - 128;
          const val = bytes[pos++];
          for (let j = 0; j < runLen; j++) {
            out[outOffset + (x + j) * 4 + ch] = val;
          }
          x += runLen;
        } else {
          // Literal run
          for (let j = 0; j < code; j++) {
            out[outOffset + (x + j) * 4 + ch] = bytes[pos++];
          }
          x += code;
        }
      }
    }
    return;
  }

  // Old-style: 4 bytes per pixel (RGBE), no RLE
  for (let x = 0; x < width; x++) {
    out[outOffset + x * 4] = bytes[offset + x * 4];
    out[outOffset + x * 4 + 1] = bytes[offset + x * 4 + 1];
    out[outOffset + x * 4 + 2] = bytes[offset + x * 4 + 2];
    out[outOffset + x * 4 + 3] = bytes[offset + x * 4 + 3];
  }
}
