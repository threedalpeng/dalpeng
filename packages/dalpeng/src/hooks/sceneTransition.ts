import type { GameEntity, Scene } from "@dalpeng/core";
import { requireEntity, setThisApp } from "../context";
import type { UseScene } from "./scene";

const persistentEntities = new Set<GameEntity>();

/** Mark the current entity as persistent across scene transitions. Must be called inside defineEntity() setup. */
export function usePersistent(): void {
  const entity = requireEntity("usePersistent");
  persistentEntities.add(entity);
}

export interface TransitionOptions {
  type?: "fade";
  /** Duration of each fade half in ms. Default: 400 */
  duration?: number;
  /** Overlay color. Default: "#000" */
  color?: string;
}

export interface SceneSwitcher {
  switchTo(sceneFactory: UseScene, opts?: TransitionOptions): Promise<void>;
}

/** Returns a scene-switch handle. Must be called inside defineEntity() setup. */
export function useSceneSwitch(): SceneSwitcher {
  const entity = requireEntity("useSceneSwitch");

  const switchTo = async (sceneFactory: UseScene, opts?: TransitionOptions): Promise<void> => {
    const duration = opts?.duration ?? 400;
    const color = opts?.color ?? "#000";
    const useOverlay = (opts?.type ?? "fade") === "fade";

    const app = entity.currentApp;
    const oldScene: Scene = entity.scene;

    // Detach persistent roots before destruction so switchScene doesn't destroy them.
    const persistentRoots: GameEntity[] = [];
    for (const pe of persistentEntities) {
      if (pe.scene === oldScene && pe.parent === null) {
        persistentRoots.push(pe);
        oldScene.removeEntity(pe);
      }
    }

    const canvas = app.canvasController.canvas;
    let overlay: HTMLDivElement | null = null;

    if (useOverlay && canvas) {
      const rect = canvas.getBoundingClientRect();

      overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.left = `${rect.left + window.scrollX}px`;
      overlay.style.top = `${rect.top + window.scrollY}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.backgroundColor = color;
      overlay.style.opacity = "0";
      overlay.style.transition = `opacity ${duration}ms`;
      overlay.style.zIndex = "9999";
      overlay.style.pointerEvents = "none";

      document.body.appendChild(overlay);

      // Force reflow so the browser registers opacity 0 before transitioning.
      void overlay.offsetHeight;

      await new Promise<void>((resolve) => {
        const fallback = setTimeout(resolve, duration + 100);
        overlay!.addEventListener(
          "transitionend",
          () => {
            clearTimeout(fallback);
            resolve();
          },
          { once: true }
        );
        overlay!.style.opacity = "1";
      });
    }

    // Wrap with app context so defineScene's getThisApp()?.addScene fires
    // and scene.app is set before entity components are created.
    let newScene: Scene | null = null;
    const wrappedFactory = (): Scene => {
      setThisApp(app);
      try {
        newScene = sceneFactory();
        return newScene;
      } finally {
        setThisApp(null);
      }
    };

    app.switchScene(oldScene, wrappedFactory);

    for (const pe of persistentRoots) {
      newScene!.addEntity(pe);
    }

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    if (overlay) {
      await new Promise<void>((resolve) => {
        const fallback = setTimeout(resolve, duration + 100);
        overlay!.addEventListener(
          "transitionend",
          () => {
            clearTimeout(fallback);
            resolve();
          },
          { once: true }
        );
        overlay!.style.opacity = "0";
      });

      overlay.remove();
    }
  };

  return { switchTo };
}
