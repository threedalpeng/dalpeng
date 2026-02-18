import type { Application } from "@dalpeng/core";

// ─── Types ──────────────────────────────────────────────────────────────────

type SlotPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface HudSlot {
  /** Update the slot's HTML content */
  update(html: string): void;
  /** Show the slot */
  show(): void;
  /** Hide the slot */
  hide(): void;
  /** Direct access to the DOM element for advanced styling */
  element: HTMLElement;
}

export interface HudHandle {
  /** Get a slot by its id */
  slot(id: string): HudSlot | undefined;
  /** Destroy the entire overlay and clean up observers */
  destroy(): void;
}

export interface HudBuilder {
  /** Add a named slot at the given position */
  slot(id: string, position: SlotPosition, initialHtml?: string): HudBuilder;
}

// ─── Slot position CSS ──────────────────────────────────────────────────────

const SLOT_STYLES: Record<SlotPosition, Partial<CSSStyleDeclaration>> = {
  "top-left": { top: "12px", left: "12px" },
  "top-center": { top: "12px", left: "50%", transform: "translateX(-50%)" },
  "top-right": { top: "12px", right: "12px" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
  "bottom-left": { bottom: "12px", left: "12px" },
  "bottom-center": { bottom: "12px", left: "50%", transform: "translateX(-50%)" },
  "bottom-right": { bottom: "12px", right: "12px" },
};

// ─── Implementation ─────────────────────────────────────────────────────────

/**
 * Creates a game HUD overlay that floats on top of the canvas.
 *
 * The overlay automatically tracks the canvas position and size,
 * so in "contain" mode it stays aligned with the rendered area
 * (excluding letterbox/pillarbox regions).
 *
 * Usage:
 * ```ts
 * const hud = createGameOverlay(app, (b) => {
 *   b.slot("score", "top-left", "Score: 0")
 *    .slot("lives", "top-right", "3 lives")
 *    .slot("message", "center");
 * });
 *
 * // Later, update slots:
 * hud.slot("score")?.update("Score: 1500");
 * hud.slot("message")?.update("GAME OVER");
 * hud.slot("message")?.show();
 *
 * // Cleanup:
 * hud.destroy();
 * ```
 */
export function createGameOverlay(
  app: Application,
  setup: (builder: HudBuilder) => void,
): HudHandle {
  // Access the canvas via the public getter on CanvasController.
  // canvasController.canvas is set during applyInitialSize(), which is called
  // before mount() completes, so it is available after app.run()/runOn().
  const canvas = app.canvasController.canvas;
  if (!canvas) {
    throw new Error(
      "createGameOverlay: canvas not available. Call after app.run() or app.runOn().",
    );
  }

  // Create overlay root — positioned absolute on document.body so that
  // getBoundingClientRect() coordinates on the canvas map directly to our
  // left/top values (assuming body has no margin/transform).
  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.pointerEvents = "none";
  overlay.style.overflow = "hidden";
  overlay.style.zIndex = "1000";

  // Font defaults for game UI
  overlay.style.fontFamily = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  overlay.style.color = "#fff";
  overlay.style.textShadow = "0 1px 3px rgba(0,0,0,0.7)";

  // Slots storage
  const slots = new Map<string, HudSlot>();

  // Builder
  const builder: HudBuilder = {
    slot(id: string, position: SlotPosition, initialHtml?: string): HudBuilder {
      const el = document.createElement("div");
      el.style.position = "absolute";
      // Individual slots are interactive by default so click handlers work,
      // while the overlay root suppresses unintended canvas interception.
      el.style.pointerEvents = "auto";
      el.style.userSelect = "none";

      // Apply position styles
      const posStyles = SLOT_STYLES[position];
      for (const [key, value] of Object.entries(posStyles)) {
        (el.style as any)[key] = value;
      }

      if (initialHtml !== undefined) {
        el.innerHTML = initialHtml;
      }

      overlay.appendChild(el);

      const slot: HudSlot = {
        update(html: string) {
          el.innerHTML = html;
        },
        show() {
          el.style.display = "";
        },
        hide() {
          el.style.display = "none";
        },
        element: el,
      };

      slots.set(id, slot);
      return builder;
    },
  };

  // Run user setup before mounting so all slot elements are appended in one go
  setup(builder);

  // Sync overlay position/size with the canvas element.
  // We use getBoundingClientRect() on the canvas rather than the parent
  // because in "contain" mode the canvas CSS dimensions differ from the parent
  // (the parent fills the viewport; the canvas is centered and letterboxed).
  const syncPosition = () => {
    const rect = canvas.getBoundingClientRect();
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  };

  // Initial sync before the overlay is visible
  syncPosition();

  // ResizeObserver tracks canvas CSS-size changes (triggered by CanvasController
  // on window resize or resolution mode changes).
  const resizeObserver = new ResizeObserver(syncPosition);
  resizeObserver.observe(canvas);

  // Also re-sync on window scroll and resize in case the page layout shifts
  // the canvas position without changing its size (e.g. scrolling a page that
  // has the canvas embedded partway down).
  window.addEventListener("resize", syncPosition);
  window.addEventListener("scroll", syncPosition);

  // Mount overlay after everything is wired up
  document.body.appendChild(overlay);

  // Handle
  const handle: HudHandle = {
    slot(id: string): HudSlot | undefined {
      return slots.get(id);
    },
    destroy() {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition);
      overlay.remove();
      slots.clear();
    },
  };

  return handle;
}
