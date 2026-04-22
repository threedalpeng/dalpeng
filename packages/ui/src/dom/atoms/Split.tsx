import type { Ref } from "@dalpeng/core";
import { h, type UIElement } from "../../core/element";
import type { Cleanup } from "../bindings";
import { renderElement } from "../render";

export interface SplitOpts {
  direction: "row" | "col";
  /** Reactive weights — one per child slot. Normalized to fill container. */
  sizes: Ref<number[]>;
  slots: UIElement[];
}

/**
 * Pointer-draggable split container. `sizes` drives flex weights, draggable
 * handles between slots update `sizes` in place.
 */
export function Split(opts: SplitOpts): UIElement {
  return h("div", {
    style: {
      display: "flex",
      flexDirection: opts.direction === "row" ? "row" : "column",
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      overflow: "hidden",
      width: "100%",
      height: "100%",
    },
    ref: (el) => initSplit(el as HTMLElement, opts),
  });
}

function initSplit(container: HTMLElement, opts: SplitOpts): Cleanup {
  const doc = container.ownerDocument;
  const win = doc.defaultView ?? window;
  const isRow = opts.direction === "row";

  const slotEls: HTMLElement[] = [];
  const slotCleanups: Set<Cleanup>[] = [];
  const slotAfterMount: Array<() => void>[] = [];

  const applySizes = (): void => {
    const sizes = opts.sizes.value;
    const total = sizes.reduce((a, b) => a + b, 0) || 1;
    slotEls.forEach((el, i) => {
      const w = sizes[i] ?? 1;
      el.style.flexGrow = String(w / total);
      el.style.flexShrink = "1";
      el.style.flexBasis = "0";
      el.style.minWidth = "0";
      el.style.minHeight = "0";
    });
  };

  for (let i = 0; i < opts.slots.length; i++) {
    if (i > 0) container.appendChild(makeHandle(doc, isRow, i - 1, opts, slotEls, win));

    const slotEl = doc.createElement("div");
    slotEl.style.cssText = "display:flex;min-width:0;min-height:0;overflow:hidden";
    container.appendChild(slotEl);
    slotEls.push(slotEl);

    const r = renderElement(opts.slots[i], { doc });
    const content = r.element as HTMLElement;
    content.style.flex = "1";
    content.style.minWidth = "0";
    content.style.minHeight = "0";
    slotEl.appendChild(content);
    slotCleanups.push(r.cleanups);
    slotAfterMount.push(r.afterMount);
    for (const cb of r.afterMount) {
      try {
        cb();
      } catch (err) {
        console.error("[Split afterMount]", err);
      }
    }
    r.afterMount.length = 0;
  }

  applySizes();
  const unsubSizes = opts.sizes.subscribe(() => applySizes());

  return () => {
    unsubSizes();
    for (const bucket of slotCleanups) {
      const arr = Array.from(bucket);
      for (let i = arr.length - 1; i >= 0; i--) {
        try {
          arr[i]();
        } catch (err) {
          console.error("[Split cleanup]", err);
        }
      }
      bucket.clear();
    }
  };
}

function makeHandle(
  doc: Document,
  isRow: boolean,
  splitIdx: number,
  opts: SplitOpts,
  slotEls: HTMLElement[],
  win: Window
): HTMLElement {
  const handle = doc.createElement("div");
  handle.style.cssText = `flex:0 0 auto;background:rgba(255,255,255,0.06);cursor:${isRow ? "ew-resize" : "ns-resize"};align-self:stretch;${isRow ? "width:5px" : "height:5px"}`;
  handle.addEventListener("mouseenter", () => {
    handle.style.background = "rgba(255,255,255,0.18)";
  });
  handle.addEventListener("mouseleave", () => {
    handle.style.background = "rgba(255,255,255,0.06)";
  });

  handle.addEventListener("mousedown", (downEv) => {
    downEv.preventDefault();
    const start = isRow ? downEv.clientX : downEv.clientY;
    const startA = opts.sizes.value[splitIdx];
    const startB = opts.sizes.value[splitIdx + 1];
    const rectA = slotEls[splitIdx].getBoundingClientRect();
    const rectB = slotEls[splitIdx + 1].getBoundingClientRect();
    const sumPx = isRow ? rectA.width + rectB.width : rectA.height + rectB.height;
    const sumWeight = startA + startB || 1;

    const onMove = (moveEv: MouseEvent): void => {
      const cur = isRow ? moveEv.clientX : moveEv.clientY;
      const dPx = cur - start;
      const dWeight = (dPx / Math.max(1, sumPx)) * sumWeight;
      const next = [...opts.sizes.value];
      next[splitIdx] = Math.max(0.05, startA + dWeight);
      next[splitIdx + 1] = Math.max(0.05, startB - dWeight);
      opts.sizes.value = next;
    };
    const onUp = (): void => {
      win.removeEventListener("mousemove", onMove);
      win.removeEventListener("mouseup", onUp);
      doc.body.style.cursor = "";
      doc.body.style.userSelect = "";
    };
    win.addEventListener("mousemove", onMove);
    win.addEventListener("mouseup", onUp);
    doc.body.style.cursor = isRow ? "ew-resize" : "ns-resize";
    doc.body.style.userSelect = "none";
  });

  return handle;
}
