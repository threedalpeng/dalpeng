import { Quaternion } from "@dalpeng/math";
import type { ParsedAnimationSampler } from "../utils/gltf/GLTFDocument";

/**
 * Binary search helper.
 * Returns the index of the largest keyframe time <= t.
 * - If t is before the first keyframe, returns 0.
 * - If t is after the last keyframe, returns length - 2 (so the upper bound is the last).
 */
function findKeyframeIndex(input: Float32Array, t: number): number {
  const last = input.length - 1;
  if (t <= input[0]) return 0;
  if (t >= input[last]) return last - 1;

  let lo = 0;
  let hi = last;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (input[mid] <= t) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Sample a generic animation channel (translation or scale) using the given sampler.
 * componentCount is 3 for translation/scale, 4 for rotation (though rotation uses sampleRotation).
 * Returns a new Float32Array of size componentCount.
 */
export function sampleChannel(
  sampler: ParsedAnimationSampler,
  t: number,
  componentCount: number
): Float32Array {
  const { input, output, interpolation } = sampler;
  const last = input.length - 1;

  // Clamp to first keyframe
  if (t <= input[0]) {
    return output.slice(0, componentCount);
  }
  // Clamp to last keyframe
  if (t >= input[last]) {
    return output.slice(last * componentCount, last * componentCount + componentCount);
  }

  const i = findKeyframeIndex(input, t);
  const t0 = input[i];
  const t1 = input[i + 1];
  const factor = (t - t0) / (t1 - t0);

  const result = new Float32Array(componentCount);

  if (interpolation === "STEP") {
    const offset = i * componentCount;
    for (let c = 0; c < componentCount; c++) {
      result[c] = output[offset + c];
    }
  } else if (interpolation === "LINEAR") {
    const offsetA = i * componentCount;
    const offsetB = (i + 1) * componentCount;
    for (let c = 0; c < componentCount; c++) {
      result[c] = output[offsetA + c] * (1 - factor) + output[offsetB + c] * factor;
    }
  } else {
    // CUBICSPLINE: each keyframe stores [in-tangent, value, out-tangent] => stride = componentCount * 3
    const stride = componentCount * 3;
    const dt = t1 - t0;
    const f = factor;
    const f2 = f * f;
    const f3 = f2 * f;

    // Hermite basis functions
    const h00 = 2 * f3 - 3 * f2 + 1;
    const h10 = f3 - 2 * f2 + f;
    const h01 = -2 * f3 + 3 * f2;
    const h11 = f3 - f2;

    // p0: value of key i, m0: out-tangent of key i
    // p1: value of key i+1, m1: in-tangent of key i+1
    const p0Offset = i * stride + componentCount;       // value portion of key i
    const m0Offset = i * stride + componentCount * 2;   // out-tangent of key i
    const p1Offset = (i + 1) * stride + componentCount; // value portion of key i+1
    const m1Offset = (i + 1) * stride;                  // in-tangent of key i+1

    for (let c = 0; c < componentCount; c++) {
      const p0 = output[p0Offset + c];
      const m0 = output[m0Offset + c];
      const p1 = output[p1Offset + c];
      const m1 = output[m1Offset + c];
      result[c] = h00 * p0 + h10 * dt * m0 + h01 * p1 + h11 * dt * m1;
    }
  }

  return result;
}

/**
 * Sample a rotation channel, returning a Quaternion.
 * For LINEAR interpolation uses Quaternion.slerp.
 * For CUBICSPLINE, performs Hermite interpolation on all 4 components then normalizes.
 */
export function sampleRotation(sampler: ParsedAnimationSampler, t: number): Quaternion {
  const { input, output, interpolation } = sampler;
  const last = input.length - 1;
  const componentCount = 4;

  // Clamp to first keyframe
  if (t <= input[0]) {
    return new Quaternion([output[0], output[1], output[2], output[3]]);
  }
  // Clamp to last keyframe
  if (t >= input[last]) {
    const o = last * componentCount;
    return new Quaternion([output[o], output[o + 1], output[o + 2], output[o + 3]]);
  }

  const i = findKeyframeIndex(input, t);
  const t0 = input[i];
  const t1 = input[i + 1];
  const factor = (t - t0) / (t1 - t0);

  if (interpolation === "STEP") {
    const o = i * componentCount;
    return new Quaternion([output[o], output[o + 1], output[o + 2], output[o + 3]]);
  } else if (interpolation === "LINEAR") {
    const oA = i * componentCount;
    const oB = (i + 1) * componentCount;
    const a = new Quaternion([output[oA], output[oA + 1], output[oA + 2], output[oA + 3]]);
    const b = new Quaternion([output[oB], output[oB + 1], output[oB + 2], output[oB + 3]]);
    return Quaternion.slerp(a, b, factor);
  } else {
    // CUBICSPLINE: stride = 4 * 3 = 12
    const stride = componentCount * 3;
    const dt = t1 - t0;
    const f = factor;
    const f2 = f * f;
    const f3 = f2 * f;

    const h00 = 2 * f3 - 3 * f2 + 1;
    const h10 = f3 - 2 * f2 + f;
    const h01 = -2 * f3 + 3 * f2;
    const h11 = f3 - f2;

    const p0Offset = i * stride + componentCount;
    const m0Offset = i * stride + componentCount * 2;
    const p1Offset = (i + 1) * stride + componentCount;
    const m1Offset = (i + 1) * stride;

    const raw = new Float32Array(componentCount);
    for (let c = 0; c < componentCount; c++) {
      const p0 = output[p0Offset + c];
      const m0 = output[m0Offset + c];
      const p1 = output[p1Offset + c];
      const m1 = output[m1Offset + c];
      raw[c] = h00 * p0 + h10 * dt * m0 + h01 * p1 + h11 * dt * m1;
    }

    // Normalize to produce a valid unit quaternion
    const len = Math.sqrt(raw[0] ** 2 + raw[1] ** 2 + raw[2] ** 2 + raw[3] ** 2) || 1;
    return new Quaternion([raw[0] / len, raw[1] / len, raw[2] / len, raw[3] / len]);
  }
}
