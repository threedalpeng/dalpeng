import { describe, expect, it } from "vitest";
import { resolvePlacement } from "../src/placement";

const VIEWPORT = { width: 800, height: 600 };

describe("resolvePlacement — viewport corners", () => {
  it("top-left places top + left with offset", () => {
    const { style } = resolvePlacement(
      { anchor: { kind: "viewport", corner: "tl" }, offset: { x: 12, y: 8 } },
      VIEWPORT,
    );
    expect(style.top).toBe("8px");
    expect(style.left).toBe("12px");
    expect(style.position).toBe("absolute");
  });

  it("top-right places top + right (offset becomes negative for right)", () => {
    const { style } = resolvePlacement(
      { anchor: { kind: "viewport", corner: "tr" }, offset: { x: 12, y: 8 } },
      VIEWPORT,
    );
    expect(style.top).toBe("8px");
    expect(style.right).toBe("-12px");
  });

  it("bottom-left places bottom + left", () => {
    const { style } = resolvePlacement(
      { anchor: { kind: "viewport", corner: "bl" }, offset: { x: 4, y: 6 } },
      VIEWPORT,
    );
    expect(style.bottom).toBe("-6px");
    expect(style.left).toBe("4px");
  });

  it("center uses 50%/50% with translate(-50%, -50%)", () => {
    const { style } = resolvePlacement(
      { anchor: { kind: "viewport", corner: "c" } },
      VIEWPORT,
    );
    expect(style.left).toBe("50%");
    expect(style.top).toBe("50%");
    expect(style.transform).toContain("translate(-50%, -50%)");
  });

  it("top-center centres horizontally only", () => {
    const { style } = resolvePlacement(
      { anchor: { kind: "viewport", corner: "tc" }, offset: { x: 0, y: 10 } },
      VIEWPORT,
    );
    expect(style.top).toBe("10px");
    expect(style.left).toBe("50%");
    expect(style.transform).toContain("translateX(-50%)");
  });

  it("center-right centres vertically and pins right", () => {
    const { style } = resolvePlacement(
      { anchor: { kind: "viewport", corner: "cr" }, offset: { x: 8, y: 0 } },
      VIEWPORT,
    );
    expect(style.right).toBe("-8px");
    expect(style.top).toBe("50%");
    expect(style.transform).toContain("translateY(-50%)");
  });
});

describe("resolvePlacement — screen pixels", () => {
  it("places element at exact screen coordinate", () => {
    const { style } = resolvePlacement(
      { anchor: { kind: "screen", x: 100, y: 200 } },
      VIEWPORT,
    );
    expect(style.left).toBe("100px");
    expect(style.top).toBe("200px");
  });

  it("adds offset to screen coordinate", () => {
    const { style } = resolvePlacement(
      {
        anchor: { kind: "screen", x: 100, y: 200 },
        offset: { x: 12, y: 0 },
      },
      VIEWPORT,
    );
    expect(style.left).toBe("112px");
    expect(style.top).toBe("200px");
  });
});

describe("resolvePlacement — pivot", () => {
  it("appends pivot translate to existing transform", () => {
    const { style } = resolvePlacement(
      {
        anchor: { kind: "screen", x: 100, y: 100 },
        pivot: { x: 0.5, y: 1 },
      },
      VIEWPORT,
    );
    expect(style.transform).toContain("translate(-50%, -100%)");
  });

  it("combines pivot with center anchor's existing translate", () => {
    const { style } = resolvePlacement(
      {
        anchor: { kind: "viewport", corner: "c" },
        pivot: { x: 0.5, y: 0.5 },
      },
      VIEWPORT,
    );
    // existing centre translate + pivot translate
    expect(style.transform).toContain("translate(-50%, -50%)");
    expect(style.transform).toContain("translate(-50%, -50%)"); // pivot
  });

  it("does not set transform when pivot is zero (default)", () => {
    const { style } = resolvePlacement(
      { anchor: { kind: "screen", x: 0, y: 0 } },
      VIEWPORT,
    );
    expect(style.transform).toBeUndefined();
  });
});

describe("resolvePlacement — size", () => {
  it("intrinsic (default) leaves width/height unset", () => {
    const { style } = resolvePlacement(
      { anchor: { kind: "screen", x: 0, y: 0 } },
      VIEWPORT,
    );
    expect(style.width).toBeUndefined();
    expect(style.height).toBeUndefined();
  });

  it("fixed sets explicit pixel dimensions", () => {
    const { style } = resolvePlacement(
      {
        anchor: { kind: "screen", x: 0, y: 0 },
        size: { kind: "fixed", w: 200, h: 100 },
      },
      VIEWPORT,
    );
    expect(style.width).toBe("200px");
    expect(style.height).toBe("100px");
  });

  it("fraction multiplies viewport dimensions", () => {
    const { style } = resolvePlacement(
      {
        anchor: { kind: "screen", x: 0, y: 0 },
        size: { kind: "fraction", w: 0.5, h: 0.25 },
      },
      VIEWPORT,
    );
    expect(style.width).toBe("400px"); // 800 * 0.5
    expect(style.height).toBe("150px"); // 600 * 0.25
  });
});

describe("resolvePlacement — Phase 2+ anchors throw", () => {
  it("world anchor throws not-implemented error", () => {
    expect(() =>
      resolvePlacement(
        { anchor: { kind: "world", point: { x: 0, y: 0, z: 0 } as never } },
        VIEWPORT,
      ),
    ).toThrow(/world.*not supported in Phase 1/);
  });

  it("entity anchor throws not-implemented error", () => {
    expect(() =>
      resolvePlacement(
        { anchor: { kind: "entity", entity: {} as never } },
        VIEWPORT,
      ),
    ).toThrow(/entity.*not supported in Phase 1/);
  });
});
