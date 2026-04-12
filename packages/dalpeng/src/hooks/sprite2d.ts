import type { AtlasFrame, SpriteAnimationClip, SpriteAtlas } from "@dalpeng/core";
import { Sprite2DRenderer, SpriteAnimator } from "@dalpeng/core";
import { requireEntity } from "../context";
import { useComponent } from "./gameEntity";

export interface SpriteAtlasHandle {
  atlas: SpriteAtlas | null;
  isLoaded: boolean;
  ready: Promise<SpriteAtlas>;
}

/** Loads a uniform-grid sprite atlas. Must be called inside defineEntity() setup. */
export function useSpriteAtlas(imageUrl: string, frameW: number, frameH: number): SpriteAtlasHandle;
/** Loads a named-frame sprite atlas. Must be called inside defineEntity() setup. */
export function useSpriteAtlas(imageUrl: string, frames: AtlasFrame[]): SpriteAtlasHandle;
export function useSpriteAtlas(
  imageUrl: string,
  frameWOrFrames: number | AtlasFrame[],
  frameH?: number
): SpriteAtlasHandle {
  const entity = requireEntity("useSpriteAtlas");
  const atlases = entity.currentApp.atlases;

  const handle: SpriteAtlasHandle = {
    atlas: null,
    isLoaded: false,
    ready: (Array.isArray(frameWOrFrames)
      ? atlases.loadFrames(imageUrl, frameWOrFrames)
      : atlases.loadUniform(imageUrl, frameWOrFrames, frameH!)
    )
      .then((atlas) => {
        handle.atlas = atlas;
        handle.isLoaded = true;
        return atlas;
      })
      .catch((err: any) => {
        console.error("[useSpriteAtlas] Failed to load:", imageUrl, err);
        throw err;
      }),
  };

  return handle;
}

/** Adds a Sprite2DRenderer to the current entity. Must be called inside defineEntity() setup. */
export function useSprite(
  atlasHandle?: SpriteAtlasHandle,
  frame?: number | string
): Sprite2DRenderer {
  const renderer = useComponent(Sprite2DRenderer);

  if (atlasHandle) {
    atlasHandle.ready.then(() => {
      renderer.atlas = atlasHandle.atlas;
      if (frame !== undefined) {
        renderer.frame = frame;
      }
    });
  }

  return renderer;
}

/** Adds a SpriteAnimator to the current entity. Must be called inside defineEntity() setup. */
export function useSpriteAnimator(clips?: SpriteAnimationClip[]): SpriteAnimator {
  const animator = useComponent(SpriteAnimator);
  if (clips) {
    for (const clip of clips) {
      animator.addClip(clip);
    }
  }
  return animator;
}
