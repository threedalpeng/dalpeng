import { Mat4, Quaternion, Vec3 } from "@dalpeng/math";
import type { ParsedNode, ParsedSkin } from "../utils/gltf/GLTFDocument";

export const MAX_JOINTS = 128;

export default class Skeleton {
  readonly joints: number[]; // node indices
  readonly inverseBindMatrices: Float32Array; // N * 16
  readonly jointCount: number;
  readonly skeletonRoot: number | null;

  // Pre-allocated output buffer for GPU upload (MAX_JOINTS * 16 floats)
  readonly jointMatrices: Float32Array = new Float32Array(MAX_JOINTS * 16);

  // Per-joint local TRS (animated values written here by Animator)
  readonly jointLocalTranslation: Vec3[];
  readonly jointLocalRotation: Quaternion[];
  readonly jointLocalScale: Vec3[];

  // Pre-cached inverse bind matrices (static after load)
  readonly #cachedIBMs: Mat4[];

  constructor(skin: ParsedSkin, nodes: ParsedNode[]) {
    this.joints = skin.joints;
    this.jointCount = Math.min(skin.joints.length, MAX_JOINTS);
    this.inverseBindMatrices = skin.inverseBindMatrices;
    this.skeletonRoot = skin.skeleton;

    // Initialize local TRS from rest pose (parsed node data)
    this.jointLocalTranslation = new Array(this.jointCount);
    this.jointLocalRotation = new Array(this.jointCount);
    this.jointLocalScale = new Array(this.jointCount);

    for (let i = 0; i < this.jointCount; i++) {
      const node = nodes[this.joints[i]];
      this.jointLocalTranslation[i] = new Vec3(node.translation);
      this.jointLocalRotation[i] = new Quaternion(node.rotation);
      this.jointLocalScale[i] = new Vec3(node.scale);
    }

    // Pre-cache inverse bind matrices as Mat4 objects (they never change)
    this.#cachedIBMs = new Array(this.jointCount);
    for (let i = 0; i < this.jointCount; i++) {
      const offset = i * 16;
      this.#cachedIBMs[i] = new Mat4(this.inverseBindMatrices.subarray(offset, offset + 16));
    }
  }

  /**
   * Compute joint matrices for GPU upload.
   * Formula per joint j:
   *   jointMatrix[j] = inverse(skeletonRootGlobal) * globalTransform(joint[j]) * inverseBindMatrix[j]
   *
   * In glTF, joint matrices are defined relative to the skeleton root.
   */
  computeJointMatrices(nodeGlobalTransforms: Map<number, Mat4>): void {
    // Skeleton root's global transform (for normalization)
    const rootGlobal =
      this.skeletonRoot !== null
        ? (nodeGlobalTransforms.get(this.skeletonRoot) ?? Mat4.identity())
        : Mat4.identity();
    const rootGlobalInverse = rootGlobal.inverse() ?? Mat4.identity();

    for (let j = 0; j < this.jointCount; j++) {
      const jointNodeIndex = this.joints[j];
      const jointGlobal = nodeGlobalTransforms.get(jointNodeIndex) ?? Mat4.identity();

      // jointMatrix = rootGlobalInverse * jointGlobal * inverseBindMatrix
      const result = rootGlobalInverse.mul(jointGlobal).mul(this.#cachedIBMs[j]);

      // Copy result to the pre-allocated output buffer
      this.jointMatrices.set(result, j * 16);
    }
  }
}
