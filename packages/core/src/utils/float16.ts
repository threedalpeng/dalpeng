export function f32ArrayToF16(src: Float32Array): Uint16Array {
  const dst = new Uint16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    dst[i] = f32ToF16(src[i]);
  }
  return dst;
}

function f32ToF16(val: number): number {
  const f32 = new Float32Array(1);
  const u32 = new Uint32Array(f32.buffer);
  f32[0] = val;
  const bits = u32[0];

  const sign = (bits >> 16) & 0x8000;
  const exp = (bits >> 23) & 0xff;
  const frac = bits & 0x7fffff;

  if (exp === 0xff) {
    // Inf or NaN
    return sign | 0x7c00 | (frac ? 0x0200 : 0);
  }

  let e = exp - 127 + 15; // rebias: f32 bias 127 → f16 bias 15

  if (e >= 0x1f) {
    // Overflow → ±Inf
    return sign | 0x7c00;
  }

  if (e <= 0) {
    // Denormal or zero
    if (e < -10) {
      return sign; // ±0
    }
    const m = (frac | 0x800000) >> (1 - e);
    // Round to nearest even
    if ((m >> 13) & 1 && m & 0x1fff) {
      return sign | ((m >> 13) + 1);
    }
    return sign | (m >> 13);
  }

  let f16 = sign | (e << 10) | (frac >> 13);
  if (frac & 0x1000) {
    f16 += 1; // carry into exponent is handled correctly by integer overflow
  }
  return f16;
}
