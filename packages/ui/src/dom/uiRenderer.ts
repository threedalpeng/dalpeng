import {
  INSTANCE_KIND,
  type EntityInstance,
  type ProjectionContext,
  type Scene,
  type UIInstance,
  type UINode,
  type UIRenderer,
} from "@dalpeng/core";
import type { Cleanup } from "../core/context";
import { pushUIScope, type UIContext } from "../core/context";
import type { UIElement } from "../core/element";
import type { Placement } from "../core/placement";
import { defaultTheme } from "../core/theme";
import { applyTheme } from "./applyTheme";
import { resolvePlacement } from "./placement";
import { renderElement } from "./render";

const DEFAULT_PLACEMENT: Placement = {
  anchor: { kind: "viewport", corner: "tl" },
  offset: { x: 12, y: 12 },
};

export const domUIRenderer: UIRenderer = {
  materialize(
    descriptor: UINode,
    context: ProjectionContext,
    owner: EntityInstance | Scene
  ): UIInstance {
    const uiCtx: UIContext = {
      layout: { direction: "column", gap: 4 },
      theme: defaultTheme,
    };
    const { cleanups: uiCleanups, pop } = pushUIScope(uiCtx);

    let element: UIElement;
    let renderCleanups: Set<Cleanup>;
    let rootNode: Node;
    let afterMount: Array<() => void>;
    try {
      element = descriptor.setup(descriptor.props) as UIElement;
      const r = renderElement(element, { doc: context.doc });
      rootNode = r.element;
      renderCleanups = r.cleanups;
      afterMount = r.afterMount;
    } finally {
      pop();
    }

    const placement = uiCtx.placement ?? DEFAULT_PLACEMENT;
    const layerName = uiCtx.layer ?? defaultDomLayerName(context.layers);
    const layer = context.layers.get(layerName);
    if (!layer) {
      throw new Error(
        `domUIRenderer: layer "${layerName}" not in this app's registry. ` +
          `Call withLayer(...) with a name declared in withLayers([...]). ` +
          `Known: ${context.layers.ordered.map((l) => l.name).join(", ")}.`
      );
    }
    if (layer.backend !== "dom") {
      throw new Error(
        `domUIRenderer: layer "${layerName}" is ${layer.backend} — UI overlays only mount onto dom layers.`
      );
    }
    const zIndex = 1000 + layer.index;

    const doc = context.doc;
    const canvas = context.canvas;

    const overlay = doc.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.pointerEvents = "none";
    overlay.style.overflow = "hidden";
    overlay.style.zIndex = String(zIndex);
    overlay.dataset.dalpengLayer = layerName;
    overlay.style.fontFamily = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    overlay.style.color = "#fff";
    overlay.style.textShadow = "0 1px 3px rgba(0,0,0,0.7)";

    const slot = doc.createElement("div");
    slot.style.pointerEvents = "auto";
    slot.style.userSelect = "none";

    // Auto-wrap: UI layout from useLayout() lives on this flex container so
    // the user's UIElement can be a plain node (or Fragment). Previously this
    // lived in defineUI; moved to the DOM backend so scene renderers aren't
    // forced into a flex model.
    const wrap = doc.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = uiCtx.layout.direction;
    wrap.style.gap = `${uiCtx.layout.gap}px`;
    if (uiCtx.layout.align !== undefined) wrap.style.alignItems = uiCtx.layout.align;
    wrap.appendChild(rootNode);

    const applyPlacement = (): void => {
      const rect = canvas.getBoundingClientRect();
      const { style } = resolvePlacement(placement, { width: rect.width, height: rect.height });
      Object.assign(slot.style, style);
    };
    applyPlacement();

    slot.appendChild(wrap);
    overlay.appendChild(slot);

    // Theme CSS vars on the wrap so `$color.*` tokens cascade through the subtree.
    const themeUndo = uiCtx.theme ? applyTheme(wrap, uiCtx.theme) : () => {};

    const syncPosition = (): void => {
      const rect = canvas.getBoundingClientRect();
      overlay.style.left = `${rect.left + window.scrollX}px`;
      overlay.style.top = `${rect.top + window.scrollY}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      applyPlacement();
    };
    syncPosition();

    const offCanvasResize = context.onCanvasResize(syncPosition);
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition);

    doc.body.appendChild(overlay);

    // Ref callbacks expect isConnected — DOM is attached now, flush.
    for (const cb of afterMount) {
      try {
        cb();
      } catch (err) {
        console.error("[domUIRenderer afterMount]", err);
      }
    }
    afterMount.length = 0;

    let detached = false;
    const instance: UIInstance = {
      [INSTANCE_KIND]: "ui",
      descriptor,
      owner,
      rendererState: { overlay, slot },
      detach() {
        if (detached) return;
        detached = true;
        offCanvasResize();
        window.removeEventListener("resize", syncPosition);
        window.removeEventListener("scroll", syncPosition);
        overlay.remove();
        themeUndo();
        const arr = Array.from(renderCleanups);
        for (let i = arr.length - 1; i >= 0; i--) {
          try {
            arr[i]();
          } catch (err) {
            console.error("[domUIRenderer detach]", err);
          }
        }
        renderCleanups.clear();
        for (const c of uiCleanups) {
          try {
            c();
          } catch (err) {
            console.error("[domUIRenderer detach]", err);
          }
        }
        uiCleanups.clear();
      },
    };
    return instance;
  },
};

function defaultDomLayerName(layers: ProjectionContext["layers"]): string {
  for (const layer of layers.ordered) {
    if (layer.backend === "dom") return layer.name;
  }
  throw new Error(
    "domUIRenderer: no dom layer in the app's layer registry. Declare at least one dom layer via withLayers([...])."
  );
}
