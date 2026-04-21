import {
  Animator,
  Camera,
  GameEntity,
  Light,
  MeshRenderer,
  Skeleton,
  SkinnedMeshRenderer,
  Transform,
  type ModelAsset,
} from "@dalpeng/core";
import { Quaternion, Vec3 } from "@dalpeng/math";
import { requireEntity } from "../context";

export interface ModelHandle {
  asset: ModelAsset | null;
  isLoaded: boolean;
  ready: Promise<ModelAsset>;
}

/** Must be called inside defineEntity() setup. */
export function useModel(url: string): ModelHandle {
  const entity = requireEntity("useModel");
  const models = entity.currentApp.models;

  const handle: ModelHandle = {
    asset: null,
    isLoaded: false,
    ready: models
      .load(url)
      .then((asset) => {
        handle.asset = asset;
        handle.isLoaded = true;
        return asset;
      })
      .catch((err: unknown) => {
        console.error("useModel failed:", url, err);
        throw err;
      }),
  };

  return handle;
}

export function spawnModelEntities(asset: ModelAsset, parentEntity: GameEntity): void {
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
  asset: ModelAsset,
  nodeIndex: number,
  parent: GameEntity,
  skeletonCache: Map<number, Skeleton>
): GameEntity {
  const node = asset.nodes[nodeIndex];
  const entity = new GameEntity();
  entity.name = node.name;

  const transform = entity.addComponent(Transform);
  transform.position = new Vec3(node.translation);
  transform.rotation = new Quaternion(node.rotation);
  transform.scale = new Vec3(node.scale);

  parent.addChild(entity);

  if (node.meshIndex !== null && node.meshIndex < asset.meshes.length) {
    const gpuMesh = asset.meshes[node.meshIndex];
    const hasSkin = node.skinIndex !== null && node.skinIndex < (asset.skins?.length ?? 0);

    if (hasSkin) {
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
          const renderer = entity.addComponent(MeshRenderer);
          renderer.mesh = prim.mesh;
          renderer.material = prim.material;
        }
      }

      if (asset.animations && asset.animations.length > 0) {
        const animator = entity.addComponent(Animator);
        animator.skeleton = skeleton;
        animator.clips = asset.animations;
        animator.nodes = asset.nodes;
        animator.rootNodeIndices = asset.rootNodes;
        animator.play(0, { loop: true });
      }
    } else {
      for (const prim of gpuMesh.primitives) {
        const renderer = entity.addComponent(MeshRenderer);
        renderer.mesh = prim.mesh;
        renderer.material = prim.material;
      }
    }
  }

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

  for (const childIndex of node.children) {
    buildNodeTree(asset, childIndex, entity, skeletonCache);
  }

  return entity;
}
