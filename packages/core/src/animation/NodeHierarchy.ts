import { Mat4, Quaternion, Vec3 } from "@dalpeng/math";
import type { ParsedNode } from "../utils/gltf/GLTFDocument";
import type Skeleton from "./Skeleton";

/**
 * Computes global transforms for all nodes in a glTF scene hierarchy,
 * incorporating animated TRS from the Skeleton's joint locals.
 * Writes results into the provided `result` map (cleared first).
 * `jointToSkelIdx` maps node indices to skeleton joint array indices.
 */
export function computeNodeGlobalTransforms(
  nodes: ParsedNode[],
  rootNodeIndices: number[],
  skeleton: Skeleton | null,
  jointToSkelIdx: Map<number, number>,
  result: Map<number, Mat4>
): void {
  result.clear();

  function traverse(nodeIndex: number, parentGlobal: Mat4): void {
    const node = nodes[nodeIndex];

    let t: Vec3, r: Quaternion, s: Vec3;

    // If this node is a joint in the skeleton, use animated TRS
    const skelIdx = jointToSkelIdx.get(nodeIndex);
    if (skelIdx !== undefined && skeleton) {
      t = skeleton.jointLocalTranslation[skelIdx];
      r = skeleton.jointLocalRotation[skelIdx];
      s = skeleton.jointLocalScale[skelIdx];
    } else {
      t = new Vec3(node.translation);
      r = new Quaternion(node.rotation);
      s = new Vec3(node.scale);
    }

    const localMatrix = Mat4.compose(t, r, s);
    const globalMatrix = parentGlobal.mul(localMatrix);
    result.set(nodeIndex, globalMatrix);

    for (const childIndex of node.children) {
      traverse(childIndex, globalMatrix);
    }
  }

  for (const rootIdx of rootNodeIndices) {
    traverse(rootIdx, Mat4.identity());
  }
}
