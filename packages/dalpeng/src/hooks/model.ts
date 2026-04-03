import { Camera, GameEntity, Light, MeshRenderer, Transform } from "@dalpeng/core";
import { SkinnedMeshRenderer, Animator, Skeleton } from "@dalpeng/core";
import { Quaternion, Vec3 } from "@dalpeng/math";
import { requireEntity } from "../context";

export interface ModelHandle {
  asset: any | null; // ModelAsset
  isLoaded: boolean;
  ready: Promise<any>;
}

/**
 * Model hook for game entities. Loads a glTF model and provides access to it.
 * The model is loaded asynchronously; use `ready` to await completion
 * or check `isLoaded` / `asset` for synchronous access.
 *
 * Must be called inside defineGameEntity() setup.
 *
 * Usage:
 *   const model = useModel("/models/character.glb");
 *   onStart(async () => {
 *     await model.ready;
 *     spawnModelEntities(model.asset, entity);
 *   });
 */
export function useModel(url: string): ModelHandle {
  const entity = requireEntity("useModel");
  const models = entity.currentApp.models;

  const handle: ModelHandle = {
    asset: null,
    isLoaded: false,
    ready: models.load(url).then((asset: any) => {
      handle.asset = asset;
      handle.isLoaded = true;
      return asset;
    }).catch((err: any) => {
      console.error("useModel failed:", url, err);
      throw err;
    }),
  };

  return handle;
}

/**
 * Spawn a game entity hierarchy from a loaded ModelAsset.
 * Uses app.spawn() to properly trigger the component lifecycle (setup, etc.).
 * Each glTF node becomes a GameEntity with Transform.
 * Each glTF mesh primitive gets a MeshRenderer or SkinnedMeshRenderer component.
 */
export function spawnModelEntities(
  asset: any, // ModelAsset
  parentEntity: GameEntity,
): void {
  const app = parentEntity.scene?.app;
  if (!app) {
    console.warn("[spawnModelEntities] Parent entity has no scene/app.");
    return;
  }
  const skeletonCache = new Map<number, Skeleton>();
  for (const nodeIndex of asset.rootNodes) {
    app.spawn(() => buildNodeTree(asset, nodeIndex, parentEntity, skeletonCache));
  }
}

function buildNodeTree(
  asset: any, // ModelAsset
  nodeIndex: number,
  parent: GameEntity,
  skeletonCache: Map<number, any>,
): GameEntity {
  const node = asset.nodes[nodeIndex];
  const entity = new GameEntity();
  entity.name = node.name;

  // Add Transform and set TRS from glTF node
  const transform = entity.addComponent(Transform);
  transform.position = new Vec3(node.translation);
  transform.rotation = new Quaternion(node.rotation);
  transform.scale = new Vec3(node.scale);

  // Attach to parent — propagates scene reference
  parent.addChild(entity);

  // If this node has a mesh, add renderers (one per primitive)
  if (node.meshIndex !== null && node.meshIndex < asset.meshes.length) {
    const gpuMesh = asset.meshes[node.meshIndex];
    const hasSkin = node.skinIndex !== null && node.skinIndex < (asset.skins?.length ?? 0);

    if (hasSkin) {
      // Get or create Skeleton for this skin
      let skeleton = skeletonCache.get(node.skinIndex!);
      if (!skeleton) {
        skeleton = new Skeleton(asset.skins[node.skinIndex!], asset.nodes);
        skeletonCache.set(node.skinIndex!, skeleton);
      }

      for (const prim of gpuMesh.primitives) {
        if (prim.skinData) {
          const renderer = entity.addComponent(SkinnedMeshRenderer);
          renderer.mesh = prim.mesh;
          renderer.material = prim.material;
          renderer.jointsData = prim.skinData.joints;
          renderer.weightsData = prim.skinData.weights;
          renderer.skeleton = skeleton;
        } else {
          // Fallback to regular MeshRenderer if primitive has no skin data
          const renderer = entity.addComponent(MeshRenderer);
          renderer.mesh = prim.mesh;
          renderer.material = prim.material;
        }
      }

      // Add Animator if the model has animations
      if (asset.animations && asset.animations.length > 0) {
        const animator = entity.addComponent(Animator);
        animator.skeleton = skeleton;
        animator.clips = asset.animations;
        animator.nodes = asset.nodes;
        animator.rootNodeIndices = asset.rootNodes;
        animator.play(0, { loop: true });
      }
    } else {
      // Regular (non-skinned) mesh
      for (const prim of gpuMesh.primitives) {
        const renderer = entity.addComponent(MeshRenderer);
        renderer.mesh = prim.mesh;
        renderer.material = prim.material;
      }
    }
  }

  // If this node has a camera, add Camera component
  if (node.cameraIndex !== null && node.cameraIndex < asset.cameras.length) {
    const parsedCam = asset.cameras[node.cameraIndex];
    const camera = entity.addComponent(Camera);
    if (parsedCam.type === "orthographic") {
      camera.isOrthographic = true;
      camera.size = parsedCam.ymag;
    } else {
      camera.isOrthographic = false;
      camera.fovy = parsedCam.yfov;
    }
    camera.dNear = parsedCam.znear;
    camera.dFar = parsedCam.zfar;
  }

  // If this node has a light (KHR_lights_punctual), add Light component
  if (node.lightIndex !== null && node.lightIndex < asset.lights.length) {
    const parsedLight = asset.lights[node.lightIndex];
    const light = entity.addComponent(Light);
    light.type = parsedLight.type;
    light.color = new Vec3(parsedLight.color);
    light.intensity = parsedLight.intensity;
    light.range = parsedLight.range;
    light.innerConeAngle = parsedLight.innerConeAngle;
    light.outerConeAngle = parsedLight.outerConeAngle;
  }

  // Recurse into children
  for (const childIndex of node.children) {
    buildNodeTree(asset, childIndex, entity, skeletonCache);
  }

  return entity;
}
