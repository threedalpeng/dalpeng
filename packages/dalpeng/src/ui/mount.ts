import type { Application } from "@dalpeng/core";
import type { UITemplate, UIHandle, SlotPosition } from "./types";
import { renderTemplate } from "./domRenderer";

// ─── Slot position CSS ──────────────────────────────────────────────────────

const SLOT_STYLES: Record<SlotPosition, Partial<CSSStyleDeclaration>> = {
  "top-left": { top: "12px", left: "12px" },
  "top-center": { top: "12px", left: "50%", transform: "translateX(-50%)" },
  "top-right": { top: "12px", right: "12px" },
  "center-left": { top: "50%", left: "12px", transform: "translateY(-50%)" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
  "center-right": { top: "50%", right: "12px", transform: "translateY(-50%)" },
  "bottom-left": { bottom: "12px", left: "12px" },
  "bottom-center": { bottom: "12px", left: "50%", transform: "translateX(-50%)" },
  "bottom-right": { bottom: "12px", right: "12px" },
};

/**
 * Mounts a UITemplate as a screen-space overlay positioned over the game canvas.
 *
 * The overlay automatically tracks canvas position and size via ResizeObserver,
 * so it stays aligned even in "contain" mode (letterbox/pillarbox).
 */
export function mountOverlay(
  app: Application,
  template: UITemplate,
  opts?: { anchor?: SlotPosition }
): UIHandle {
  const canvas = app.canvasController.canvas;
  if (!canvas) {
    throw new Error("mountOverlay: canvas not available. Call after app.run() or app.runOn().");
  }

  // Render the template into DOM
  const { element, cleanups } = renderTemplate(template, app);

  // Create overlay root — absolute on body, tracks canvas position
  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.pointerEvents = "none";
  overlay.style.overflow = "hidden";
  overlay.style.zIndex = "1000";

  // Font defaults for game UI
  overlay.style.fontFamily = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  overlay.style.color = "#fff";
  overlay.style.textShadow = "0 1px 3px rgba(0,0,0,0.7)";

  // Position the rendered content at the specified anchor
  const slot = document.createElement("div");
  slot.style.position = "absolute";
  slot.style.pointerEvents = "auto";
  slot.style.userSelect = "none";

  const anchor = opts?.anchor ?? "top-left";
  const posStyles = SLOT_STYLES[anchor];
  for (const [key, value] of Object.entries(posStyles)) {
    (slot.style as any)[key] = value;
  }

  slot.appendChild(element);
  overlay.appendChild(slot);

  // Sync overlay position/size with canvas
  const syncPosition = () => {
    const rect = canvas.getBoundingClientRect();
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  };

  syncPosition();

  const resizeObserver = new ResizeObserver(syncPosition);
  resizeObserver.observe(canvas);
  window.addEventListener("resize", syncPosition);
  window.addEventListener("scroll", syncPosition);

  document.body.appendChild(overlay);

  return {
    destroy() {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition);
      overlay.remove();
      cleanups.forEach((fn) => fn());
      cleanups.clear();
    },
  };
}
