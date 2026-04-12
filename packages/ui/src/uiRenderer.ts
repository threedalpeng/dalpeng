import {
  INSTANCE_KIND,
  type GameInstance,
  type ProjectionContext,
  type Scene,
  type UIDescriptor,
  type UIInstance,
  type UIRenderer,
} from "@dalpeng/core";
import { renderDescriptor } from "./domRenderer";
import { resolvePlacement, type Placement } from "./placement";

const DEFAULT_PLACEMENT: Placement = {
  anchor: { kind: "viewport", corner: "tl" },
  offset: { x: 12, y: 12 },
};

export const domUIRenderer: UIRenderer = {
  materialize(
    descriptor: UIDescriptor,
    context: ProjectionContext,
    owner: GameInstance | Scene
  ): UIInstance {
    const result = renderDescriptor(descriptor, {
      doc: context.doc,
      features: context.features,
      watchFeature: context.watchFeature,
    });
    const { cleanups } = result;
    const placement = result.placement ?? DEFAULT_PLACEMENT;
    const layerName = result.layer;

    const layers = context.layers;
    const resolvedLayerName = layerName ?? defaultDomLayerName(layers);
    const layer = layers.get(resolvedLayerName);
    if (!layer) {
      const known = layers.ordered.map((l) => l.name).join(", ");
      throw new Error(
        `domUIRenderer: no layer "${resolvedLayerName}" in this app's ` +
          `layer registry. Did the UI call withLayer("${resolvedLayerName}") ` +
          `with a name that wasn't declared in withLayers([...])? ` +
          `Known layers: ${known}.`
      );
    }
    if (layer.backend !== "dom") {
      throw new Error(
        `domUIRenderer: layer "${resolvedLayerName}" is a ${layer.backend} ` +
          `layer; UI overlays can only mount onto dom layers.`
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
    overlay.dataset.dalpengLayer = resolvedLayerName;
    overlay.style.fontFamily = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    overlay.style.color = "#fff";
    overlay.style.textShadow = "0 1px 3px rgba(0,0,0,0.7)";

    const slot = doc.createElement("div");
    slot.style.pointerEvents = "auto";
    slot.style.userSelect = "none";

    const applyPlacement = () => {
      const rect = canvas.getBoundingClientRect();
      const { style } = resolvePlacement(placement, {
        width: rect.width,
        height: rect.height,
      });
      Object.assign(slot.style, style);
    };
    applyPlacement();

    slot.appendChild(result.element);
    overlay.appendChild(slot);

    const syncPosition = () => {
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

    // detach() is idempotent — safe to call multiple times.
    let detached = false;
    const instance: UIInstance = {
      [INSTANCE_KIND]: "ui",
      descriptor,
      owner,
      rendererState: { overlay, slot, cleanups, syncPosition },
      detach() {
        if (detached) return;
        detached = true;
        offCanvasResize();
        window.removeEventListener("resize", syncPosition);
        window.removeEventListener("scroll", syncPosition);
        overlay.remove();
        cleanups.forEach((fn) => fn());
        cleanups.clear();
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
    "domUIRenderer: no dom layer in the app's layer registry. " +
      "Declare at least one dom layer via withLayers([...])."
  );
}
