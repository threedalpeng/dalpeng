import type { AudioHandle, PlayOptions } from "@dalpeng/core";
import { requireEntity } from "../context";
import { onDestroy } from "./gameEntity";

/** Must be called inside defineGameEntity() setup. */
export function useAudio(url: string) {
  const entity = requireEntity("useAudio");
  const audio = entity.currentApp.audio;
  const handles: AudioHandle[] = [];

  onDestroy(() => {
    for (const h of handles) {
      if (h.isPlaying) h.stop();
    }
    handles.length = 0;
  });

  return {
    async preload(): Promise<void> {
      await audio.load(url);
    },

    play(opts?: PlayOptions): AudioHandle {
      const handle = audio.play(url, opts);
      handles.push(handle);
      for (let i = handles.length - 1; i >= 0; i--) {
        if (!handles[i].isPlaying) handles.splice(i, 1);
      }
      return handle;
    },

    stopAll(): void {
      for (const h of handles) {
        if (h.isPlaying) h.stop();
      }
      handles.length = 0;
    },
  };
}
