import type { AudioHandle, PlayOptions } from "@dalpeng/core";
import { requireEntity } from "../context";
import { onDestroy } from "./gameEntity";

/**
 * Audio hook for game entities. Preloads a sound and provides play/stop.
 * All active playback handles are automatically stopped when the entity is destroyed.
 *
 * Must be called inside defineGameEntity() setup.
 *
 * Usage:
 *   const sfx = useAudio("/sounds/hit.mp3");
 *   onStart(() => sfx.preload());
 *   onUpdate(() => { if (hit) sfx.play(); });
 */
export function useAudio(url: string) {
  const entity = requireEntity("useAudio");
  const audio = entity.currentApp.audio;
  const handles: AudioHandle[] = [];

  // Auto-cleanup on destroy
  onDestroy(() => {
    for (const h of handles) {
      if (h.isPlaying) h.stop();
    }
    handles.length = 0;
  });

  return {
    /** Preload the audio file (call in onStart for latency-free playback) */
    async preload(): Promise<void> {
      await audio.load(url);
    },

    /** Play the sound, returns a handle to control it */
    play(opts?: PlayOptions): AudioHandle {
      const handle = audio.play(url, opts);
      handles.push(handle);
      // Clean up finished handles periodically
      for (let i = handles.length - 1; i >= 0; i--) {
        if (!handles[i].isPlaying) handles.splice(i, 1);
      }
      return handle;
    },

    /** Stop all active playbacks of this sound */
    stopAll(): void {
      for (const h of handles) {
        if (h.isPlaying) h.stop();
      }
      handles.length = 0;
    },
  };
}
