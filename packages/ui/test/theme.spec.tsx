import { describe, expect, it } from "vitest";
import { defineWidget, h } from "../src/core/element";
import { resolveStyleValue } from "../src/core/style";
import { defaultTheme, defineTheme, toColorRole, useTheme, type Theme } from "../src/core/theme";
import { contrastRatio } from "../src/core/theme/oklch";
import { applyTheme } from "../src/dom/applyTheme";
import { bindStyle } from "../src/dom/bindings";
import { mount } from "../src/dom/render";

const ctx = { doc: document };

describe("Style resolver — tokens / lengths / unitless / custom vars", () => {
  it("primitive step token resolves to CSS var", () => {
    expect(resolveStyleValue("color", "$color.primary.500")).toBe("var(--ui-color-primary-500)");
  });

  it("semantic alias token resolves to CSS var (camelCase → kebab)", () => {
    expect(resolveStyleValue("color", "$color.primary.bg")).toBe("var(--ui-color-primary-bg)");
    expect(resolveStyleValue("color", "$color.primary.bgHover")).toBe(
      "var(--ui-color-primary-bg-hover)"
    );
    expect(resolveStyleValue("color", "$color.danger.text")).toBe("var(--ui-color-danger-text)");
  });

  it("surface + scrim tokens resolve", () => {
    expect(resolveStyleValue("background", "$color.surface.base")).toBe(
      "var(--ui-color-surface-base)"
    );
    expect(resolveStyleValue("background", "$color.scrim")).toBe("var(--ui-color-scrim)");
  });

  it("non-color tokens resolve", () => {
    expect(resolveStyleValue("padding", "$spacing.md")).toBe("var(--ui-spacing-md)");
    expect(resolveStyleValue("borderRadius", "$radius.lg")).toBe("var(--ui-radius-lg)");
    expect(resolveStyleValue("fontSize", "$font.size.md")).toBe("var(--ui-font-size-md)");
    expect(resolveStyleValue("zIndex", "$zIndex.modal")).toBe("var(--ui-z-modal)");
  });

  it("number on length key gets px suffix", () => {
    expect(resolveStyleValue("padding", 4)).toBe("4px");
    expect(resolveStyleValue("borderRadius", 8)).toBe("8px");
  });

  it("number on unitless key stays bare", () => {
    expect(resolveStyleValue("opacity", 0.5)).toBe("0.5");
    expect(resolveStyleValue("zIndex", 100)).toBe("100");
    expect(resolveStyleValue("fontWeight", 600)).toBe("600");
  });

  it("string value passes through verbatim (no token prefix)", () => {
    expect(resolveStyleValue("transform", "scale(1.1)")).toBe("scale(1.1)");
    expect(resolveStyleValue("color", "#fff")).toBe("#fff");
  });

  it("CSS custom property keys don't resolve tokens or add units", () => {
    expect(resolveStyleValue("--panel-alpha", 0.8)).toBe("0.8");
    expect(resolveStyleValue("--panel-bg", "#000")).toBe("#000");
  });
});

describe("bindStyle — shortcuts + tokens + refs", () => {
  it("paddingX expands to paddingLeft + paddingRight", () => {
    const el = document.createElement("div");
    bindStyle(el, { paddingX: 12 });
    expect(el.style.paddingLeft).toBe("12px");
    expect(el.style.paddingRight).toBe("12px");
    expect(el.style.paddingTop).toBe("");
  });

  it("semantic alias token writes a var(...) value", () => {
    const el = document.createElement("div");
    bindStyle(el, { color: "$color.primary.bg" });
    expect(el.style.color).toBe("var(--ui-color-primary-bg)");
  });

  it("CSS custom property writes via setProperty", () => {
    const el = document.createElement("div");
    bindStyle(el, { "--panel-alpha": 0.8 });
    expect(el.style.getPropertyValue("--panel-alpha")).toBe("0.8");
  });
});

describe("defineTheme — factory modes", () => {
  it("pass-through on literal Theme", () => {
    const t = defineTheme(defaultTheme);
    expect(t).toBe(defaultTheme);
  });

  it("fresh derivation from seeds", () => {
    const t = defineTheme({
      seeds: { primary: "#ff00ff" },
    });
    // primary.500 should have magenta-ish hue (not equal to seed necessarily due to OKLCH L ladder)
    expect(t.color.primary[500]).toMatch(/^#[0-9a-f]{6}$/);
    expect(t.color.primary.bg).toBe(t.color.primary[500]);
  });

  it("extend base with overrides", () => {
    const t = defineTheme({
      base: defaultTheme,
      overrides: { spacing: { md: 16 } as Theme["spacing"] },
    });
    expect(t.spacing.md).toBe(16);
    expect(t.spacing.sm).toBe(defaultTheme.spacing.sm); // preserved
    expect(t.color.primary[500]).toBe(defaultTheme.color.primary[500]); // preserved
  });

  it("deterministic — same input gives same output", () => {
    const a = defineTheme({ seeds: { primary: "#3a86ff" }, preset: "pixel" });
    const b = defineTheme({ seeds: { primary: "#3a86ff" }, preset: "pixel" });
    expect(a.color.primary[500]).toBe(b.color.primary[500]);
    expect(a.color.primary[950]).toBe(b.color.primary[950]);
  });
});

describe("Style preset — smooth vs pixel", () => {
  it("pixel preset flattens radius / shadow / motion", () => {
    const p = defineTheme({ preset: "pixel" });
    expect(p.radius.md).toBe(0);
    expect(p.radius.full).toBe(0);
    expect(p.shadow.md).toBe("none");
    expect(p.motion.duration.fast).toBe(0);
    expect(p.motion.duration.slow).toBe(0);
  });

  it("smooth preset has non-zero radius / shadow / motion", () => {
    const p = defineTheme({ preset: "smooth" });
    expect(p.radius.md).toBeGreaterThan(0);
    expect(p.shadow.md).not.toBe("none");
    expect(p.motion.duration.normal).toBeGreaterThan(0);
  });

  it("spacing + zIndex are preset-invariant", () => {
    const s = defineTheme({ preset: "smooth" });
    const p = defineTheme({ preset: "pixel" });
    expect(s.spacing.md).toBe(p.spacing.md);
    expect(s.zIndex.modal).toBe(p.zIndex.modal);
  });
});

describe("ColorRole — WCAG AA contrast", () => {
  it("every role's fg clears AA against its bg (light)", () => {
    const t = defineTheme({ mode: "light" });
    const roles = ["primary", "accent", "success", "warning", "danger", "info"] as const;
    for (const role of roles) {
      const ratio = contrastRatio(t.color[role].bg, t.color[role].fg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("every role's fg clears AA against its bg (dark)", () => {
    const t = defineTheme({ mode: "dark" });
    const roles = ["primary", "accent", "success", "warning", "danger", "info"] as const;
    for (const role of roles) {
      const ratio = contrastRatio(t.color[role].bg, t.color[role].fg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("toColorRole — single-seed helper", () => {
  it("produces 11 primitive steps + 7 aliases", () => {
    const s = toColorRole("#3a86ff");
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const) {
      expect(s[step]).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(s.bg).toBe(s[500]);
    expect(s.text).toBe(s[700]);
    expect(s.muted).toBe(s[100]);
  });

  it("dark mode remaps aliases to different steps", () => {
    const s = toColorRole("#3a86ff", { mode: "dark" });
    expect(s.bg).toBe(s[400]);
    expect(s.text).toBe(s[300]);
  });
});

describe("applyTheme — primitive + alias indirection (P9)", () => {
  it("emits primitive step as literal color", () => {
    const root = document.createElement("div");
    applyTheme(root, defaultTheme);
    expect(root.style.getPropertyValue("--ui-color-primary-500")).toBe(
      defaultTheme.color.primary[500]
    );
  });

  it("emits semantic alias as var indirection to primitive step", () => {
    const root = document.createElement("div");
    applyTheme(root, defaultTheme);
    // `bg` in light mode → step 500 → indirection
    expect(root.style.getPropertyValue("--ui-color-primary-bg")).toBe(
      "var(--ui-color-primary-500)"
    );
    expect(root.style.getPropertyValue("--ui-color-primary-text")).toBe(
      "var(--ui-color-primary-700)"
    );
  });

  it("emits spacing / radius / font / motion vars", () => {
    const root = document.createElement("div");
    applyTheme(root, defaultTheme);
    expect(root.style.getPropertyValue("--ui-spacing-md")).toBe("8px");
    expect(root.style.getPropertyValue("--ui-radius-lg")).toBe("12px");
    expect(root.style.getPropertyValue("--ui-font-size-md")).toBe("14px");
    expect(root.style.getPropertyValue("--ui-font-weight-semibold")).toBe("600");
    expect(root.style.getPropertyValue("--ui-motion-duration-fast")).toBe("120ms");
  });

  it("zIndex emits as --ui-z-* (short prefix)", () => {
    const root = document.createElement("div");
    applyTheme(root, defaultTheme);
    expect(root.style.getPropertyValue("--ui-z-modal")).toBe(String(defaultTheme.zIndex.modal));
  });

  it("pixel preset installs root-level font-smoothing + image-rendering", () => {
    const root = document.createElement("div");
    const pixel = defineTheme({ preset: "pixel" });
    applyTheme(root, pixel);
    expect(root.style.getPropertyValue("image-rendering")).toBe("pixelated");
    expect(root.style.getPropertyValue("-webkit-font-smoothing")).toBe("none");
  });

  it("undo removes all vars + root props (idempotent)", () => {
    const root = document.createElement("div");
    const pixel = defineTheme({ preset: "pixel" });
    const undo = applyTheme(root, pixel);
    expect(root.style.getPropertyValue("--ui-color-primary-500")).not.toBe("");

    undo();
    expect(root.style.getPropertyValue("--ui-color-primary-500")).toBe("");
    expect(root.style.getPropertyValue("image-rendering")).toBe("");
    expect(() => undo()).not.toThrow();
  });
});

describe("useTheme — scope-aware lookup", () => {
  it("throws outside UI scope", () => {
    expect(() => useTheme()).toThrow(/requires an active UI context/);
  });

  it("returns defaultTheme when mount has no explicit theme", () => {
    let captured: Theme | null = null;
    const Inner = defineWidget<Record<string, never>>(() => {
      captured = useTheme();
      return h("div", null);
    });
    const handle = mount(h(Inner, null), ctx);
    expect(captured).toBe(defaultTheme);
    handle.unmount();
  });

  it("returns the mount's explicit theme when provided", () => {
    const myTheme = defineTheme({ seeds: { primary: "#ff00ff" } });
    let captured: Theme | null = null;
    const Inner = defineWidget<Record<string, never>>(() => {
      captured = useTheme();
      return h("div", null);
    });
    const handle = mount(h(Inner, null), ctx, { theme: myTheme });
    expect(captured).toBe(myTheme);
    handle.unmount();
  });
});

describe("mount — root receives theme's CSS vars automatically", () => {
  it("default theme CSS vars land on root element without explicit applyTheme", () => {
    const handle = mount(h("div", null), ctx);
    const root = handle.element as HTMLElement;
    expect(root.style.getPropertyValue("--ui-color-primary-500")).toBe(
      defaultTheme.color.primary[500]
    );
    handle.unmount();
  });

  it("explicit theme overrides default on root", () => {
    const myTheme = defineTheme({ seeds: { primary: "#ff00ff" } });
    const handle = mount(h("div", null), ctx, { theme: myTheme });
    const root = handle.element as HTMLElement;
    expect(root.style.getPropertyValue("--ui-color-primary-500")).toBe(myTheme.color.primary[500]);
    handle.unmount();
  });

  it("unmount removes the theme CSS vars", () => {
    const handle = mount(h("div", null), ctx);
    const root = handle.element as HTMLElement;
    expect(root.style.getPropertyValue("--ui-color-primary-500")).not.toBe("");
    handle.unmount();
    expect(root.style.getPropertyValue("--ui-color-primary-500")).toBe("");
  });
});
