export type CanvasResizeMode = "fill" | "contain" | "cover" | "none";

export interface CanvasOptions {
  mode?: CanvasResizeMode;
  fixedAspect?: number; // width / height when preserving aspect in contain/cover
  pixelRatio?: number | "device"; // default: "device"
  autoResize?: boolean; // default: true
}
