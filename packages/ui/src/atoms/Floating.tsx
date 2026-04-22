import { isRef, type Ref } from "@dalpeng/core";
import type { Cleanup } from "../bindings";
import { h, type UIElement } from "../element";
import { renderElement } from "../render";

export interface FloatingOpts {
  body: UIElement;
  visible: Ref<boolean>;
  x: number | Ref<number>;
  y: number | Ref<number>;
  width?: number | Ref<number>;
  height?: number | Ref<number>;
  /** Close on click outside. Default: true. */
  closeOnOutside?: boolean;
  /** Close on Escape. Default: true. */
  closeOnEsc?: boolean;
}

/**
 * Fixed-position overlay portal'd to `document.body`. Mounts only when
 * visible=true. Click-outside + Escape auto-close unless disabled.
 */
export function Floating(opts: FloatingOpts): UIElement {
  return h("div", {
    style: { display: "contents" },
    ref: (el) => initFloating(el as HTMLElement, opts),
  });
}

function initFloating(wrap: HTMLElement, opts: FloatingOpts): Cleanup {
  const doc = wrap.ownerDocument;
  const closeOnOutside = opts.closeOnOutside ?? true;
  const closeOnEsc = opts.closeOnEsc ?? true;

  const floater = doc.createElement("div");
  floater.style.cssText = "position:fixed;z-index:2147483647;display:none";

  const subs: Cleanup[] = [];

  const setNumeric = (
    key: "left" | "top" | "width" | "height",
    v: number | Ref<number> | undefined
  ): void => {
    if (v == null) return;
    if (isRef(v)) {
      const ref = v;
      const apply = (n: number): void => {
        floater.style[key] = `${n}px`;
      };
      apply(ref.value);
      subs.push(ref.subscribe(apply));
    } else {
      floater.style[key] = `${v}px`;
    }
  };
  setNumeric("left", opts.x);
  setNumeric("top", opts.y);
  setNumeric("width", opts.width);
  setNumeric("height", opts.height);

  let mounted: {
    cleanups: Set<Cleanup>;
    afterMount: Array<() => void>;
  } | null = null;

  const mountBody = (): void => {
    if (mounted) return;
    const r = renderElement(opts.body, { doc });
    floater.appendChild(r.element);
    doc.body.appendChild(floater);
    floater.style.display = "block";
    mounted = { cleanups: r.cleanups, afterMount: r.afterMount };
    for (const cb of r.afterMount) {
      try {
        cb();
      } catch (err) {
        console.error("[Floating afterMount]", err);
      }
    }
    r.afterMount.length = 0;
  };

  const unmountBody = (): void => {
    if (!mounted) return;
    floater.style.display = "none";
    while (floater.firstChild) floater.removeChild(floater.firstChild);
    floater.remove();
    const arr = Array.from(mounted.cleanups);
    for (let i = arr.length - 1; i >= 0; i--) {
      try {
        arr[i]();
      } catch (err) {
        console.error("[Floating cleanup]", err);
      }
    }
    mounted.cleanups.clear();
    mounted = null;
  };

  let docHandlersInstalled = false;
  const onDocMouseDown = (ev: MouseEvent): void => {
    if (!floater.contains(ev.target as Node)) opts.visible.value = false;
  };
  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key === "Escape") opts.visible.value = false;
  };
  const installDocHandlers = (): void => {
    if (docHandlersInstalled) return;
    docHandlersInstalled = true;
    // Defer — an opener click is still in-flight; adding the listener synchronously would capture it and close instantly.
    setTimeout(() => {
      if (closeOnOutside) doc.addEventListener("mousedown", onDocMouseDown);
      if (closeOnEsc) doc.addEventListener("keydown", onKey);
    }, 0);
  };
  const removeDocHandlers = (): void => {
    if (!docHandlersInstalled) return;
    docHandlersInstalled = false;
    if (closeOnOutside) doc.removeEventListener("mousedown", onDocMouseDown);
    if (closeOnEsc) doc.removeEventListener("keydown", onKey);
  };

  const sync = (): void => {
    if (opts.visible.value) mountBody();
    else unmountBody();
  };

  subs.push(
    opts.visible.subscribe((v) => {
      sync();
      if (v) installDocHandlers();
      else removeDocHandlers();
    })
  );

  sync();
  if (opts.visible.value) installDocHandlers();

  return () => {
    for (const u of subs) u();
    removeDocHandlers();
    unmountBody();
  };
}
