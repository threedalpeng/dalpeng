import type { Placement, Vec2, ViewportCorner } from "../core/placement";

export interface ResolvedPlacement {
  /** Inline style fragment to assign to the slot element. */
  style: Partial<CSSStyleDeclaration>;
}

export function resolvePlacement(
  placement: Placement,
  viewport: { width: number; height: number }
): ResolvedPlacement {
  const style: Partial<CSSStyleDeclaration> = {
    position: "absolute",
  };

  const offset = placement.offset ?? { x: 0, y: 0 };
  const pivot = placement.pivot ?? { x: 0, y: 0 };

  const anchor = placement.anchor;
  if (anchor.kind === "viewport") {
    applyViewportCorner(style, anchor.corner, offset);
  } else if (anchor.kind === "screen") {
    style.left = `${anchor.x + offset.x}px`;
    style.top = `${anchor.y + offset.y}px`;
  } else if (anchor.kind === "world" || anchor.kind === "entity") {
    throw new Error(
      `Placement: anchor kind "${anchor.kind}" is not yet supported — world-space UI lands with the 3D milestone.`
    );
  }

  if (pivot.x !== 0 || pivot.y !== 0) {
    const existing = style.transform ?? "";
    const tx = `${-pivot.x * 100}%`;
    const ty = `${-pivot.y * 100}%`;
    const pivotTransform = `translate(${tx}, ${ty})`;
    style.transform = existing ? `${existing} ${pivotTransform}` : pivotTransform;
  }

  const size = placement.size;
  if (size && size.kind === "fixed") {
    style.width = `${size.w}px`;
    style.height = `${size.h}px`;
  } else if (size && size.kind === "fraction") {
    style.width = `${size.w * viewport.width}px`;
    style.height = `${size.h * viewport.height}px`;
  }

  return { style };
}

function applyViewportCorner(
  style: Partial<CSSStyleDeclaration>,
  corner: ViewportCorner,
  offset: Vec2
): void {
  switch (corner[0]) {
    case "t":
      style.top = `${offset.y}px`;
      break;
    case "b":
      style.bottom = `${-offset.y}px`;
      break;
    case "c":
      style.top = "50%";
      style.transform = "translateY(-50%)";
      break;
  }
  if (corner === "c") {
    style.left = "50%";
    style.transform = "translate(-50%, -50%)";
    return;
  }
  switch (corner[1]) {
    case "l":
      style.left = `${offset.x}px`;
      break;
    case "r":
      style.right = `${-offset.x}px`;
      break;
    case "c": {
      style.left = "50%";
      const existing = style.transform ?? "";
      const xform = "translateX(-50%)";
      style.transform = existing ? `${existing} ${xform}` : xform;
      break;
    }
  }
  if (corner === "tc") {
    style.top = `${offset.y}px`;
  } else if (corner === "bc") {
    style.bottom = `${-offset.y}px`;
  }
}
