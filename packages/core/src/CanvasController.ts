import type { CanvasOptions } from "./CanvasOptions";
import type { RendererBackend } from "./gfx/RendererBackend";

export default class CanvasController {
  #canvas: HTMLCanvasElement | null = null;
  #renderer: RendererBackend | null = null;
  #options: Required<CanvasOptions> = {
    resolution: "auto",
    fit: "fill",
    pixelRatio: "device",
  };

  get canvas(): HTMLCanvasElement | null {
    return this.#canvas;
  }

  setOptions(options?: CanvasOptions): this {
    if (!options) return this;
    this.#options = {
      resolution: options.resolution ?? this.#options.resolution,
      fit: options.fit ?? this.#options.fit,
      pixelRatio: options.pixelRatio ?? this.#options.pixelRatio,
    };
    return this;
  }

  /**
   * Apply canvas sizing BEFORE renderer.init().
   * Sets canvas.width/height so the renderer reads the correct buffer size
   * on first G-Buffer allocation.
   */
  applyInitialSize(canvas: HTMLCanvasElement): void {
    this.#canvas = canvas;
    this.#applyCanvasSizing();
  }

  /**
   * Bind to renderer and start listening for resize events.
   * Called AFTER renderer.init() — does not re-apply sizing.
   */
  mount(canvas: HTMLCanvasElement, renderer: RendererBackend): void {
    this.#canvas = canvas;
    this.#renderer = renderer;
    window.addEventListener("resize", this.#handleResize);
  }

  dispose(): void {
    window.removeEventListener("resize", this.#handleResize);
    this.#canvas = null;
    this.#renderer = null;
  }

  #handleResize = () => {
    this.#applyCanvasSizing();
    this.#renderer?.resize();
  };

  #getDPR(): number {
    return this.#options.pixelRatio === "device"
      ? Math.min(window.devicePixelRatio || 1, 4)
      : Math.max(1, this.#options.pixelRatio as number);
  }

  #applyCanvasSizing() {
    const canvas = this.#canvas;
    if (!canvas) return;

    const parent = (canvas.parentElement ?? document.body) as HTMLElement;
    const parentRect = parent.getBoundingClientRect();
    const parentW = Math.max(1, Math.floor(parentRect.width));
    const parentH = Math.max(1, Math.floor(parentRect.height));
    const dpr = this.#getDPR();
    const resolution = this.#options.resolution;
    const fit = this.#options.fit;

    let cssW: number;
    let cssH: number;

    if (resolution === "auto") {
      // Auto: buffer matches parent, canvas fills parent
      const bufferW = Math.max(1, Math.floor(parentW * dpr));
      const bufferH = Math.max(1, Math.floor(parentH * dpr));
      if (canvas.width !== bufferW) canvas.width = bufferW;
      if (canvas.height !== bufferH) canvas.height = bufferH;
      cssW = parentW;
      cssH = parentH;
    } else {
      // Fixed resolution: buffer = resolution × DPR
      const [resW, resH] = resolution;
      const bufferW = Math.max(1, Math.floor(resW * dpr));
      const bufferH = Math.max(1, Math.floor(resH * dpr));
      if (canvas.width !== bufferW) canvas.width = bufferW;
      if (canvas.height !== bufferH) canvas.height = bufferH;

      // CSS scales to fit parent while maintaining aspect
      const aspect = resW / resH;
      if (fit === "contain") {
        const targetH = Math.floor(parentW / aspect);
        if (targetH <= parentH) {
          cssW = parentW;
          cssH = targetH;
        } else {
          cssH = parentH;
          cssW = Math.floor(parentH * aspect);
        }
      } else if (fit === "cover") {
        const targetH = Math.floor(parentW / aspect);
        if (targetH >= parentH) {
          cssW = parentW;
          cssH = targetH;
        } else {
          cssH = parentH;
          cssW = Math.floor(parentH * aspect);
        }
      } else {
        // "fill" — stretch to parent
        cssW = parentW;
        cssH = parentH;
      }
    }

    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.style.display = "block";

    // Center canvas in parent via flexbox
    parent.style.display = "flex";
    parent.style.justifyContent = "center";
    parent.style.alignItems = "center";
    parent.style.overflow = "hidden";
  }
}
