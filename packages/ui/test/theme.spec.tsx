import { describe, expect, it } from "vitest";
import { defineComponent, h } from "../src/core/element";
import { resolveStyleValue } from "../src/core/style";
import { defaultTheme, defineTheme, useTheme, type Theme } from "../src/core/theme";
import { applyTheme } from "../src/dom/applyTheme";
import { bindStyle } from "../src/dom/bindings";
import { mount } from "../src/dom/render";

const ctx = { doc: document };

describe("Style resolver — tokens / lengths / unitless / custom vars", () => {
  it("token string resolves to CSS var via $dim.key path", () => {
    expect(resolveStyleValue("color", "$color.accent")).toBe("var(--ui-color-accent)");
    expect(resolveStyleValue("fontSize", "$font.size.sm")).toBe("var(--ui-font-size-sm)");
    expect(resolveStyleValue("color", "$color.fgMuted")).toBe("var(--ui-color-fg-muted)");
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

  it("marginY expands to marginTop + marginBottom", () => {
    const el = document.createElement("div");
    bindStyle(el, { marginY: 8 });
    expect(el.style.marginTop).toBe("8px");
    expect(el.style.marginBottom).toBe("8px");
  });

  it("token token string writes a var(...) value", () => {
    const el = document.createElement("div");
    bindStyle(el, { color: "$color.accent" });
    expect(el.style.color).toBe("var(--ui-color-accent)");
  });

  it("CSS custom property writes via setProperty", () => {
    const el = document.createElement("div");
    bindStyle(el, { "--panel-alpha": 0.8 });
    expect(el.style.getPropertyValue("--panel-alpha")).toBe("0.8");
  });
});

describe("applyTheme — CSS var emission on root", () => {
  it("writes --ui-color-*, --ui-spacing-*, --ui-font-size-* on root", () => {
    const root = document.createElement("div");
    applyTheme(root, defaultTheme);
    expect(root.style.getPropertyValue("--ui-color-accent")).toBe(defaultTheme.color.accent);
    expect(root.style.getPropertyValue("--ui-spacing-md")).toBe("8px");
    expect(root.style.getPropertyValue("--ui-font-size-sm")).toBe("10px");
    expect(root.style.getPropertyValue("--ui-font-weight-bold")).toBe("600");
  });

  it("returned undo removes the vars (idempotent)", () => {
    const root = document.createElement("div");
    const undo = applyTheme(root, defaultTheme);
    expect(root.style.getPropertyValue("--ui-color-accent")).not.toBe("");

    undo();
    expect(root.style.getPropertyValue("--ui-color-accent")).toBe("");
    expect(() => undo()).not.toThrow();
  });

  it("theme swap replaces only the values — same keys", () => {
    const root = document.createElement("div");
    applyTheme(root, defaultTheme);
    const darkTheme = defineTheme({
      ...defaultTheme,
      color: { ...defaultTheme.color, accent: "#00ffcc" },
    });
    applyTheme(root, darkTheme);
    expect(root.style.getPropertyValue("--ui-color-accent")).toBe("#00ffcc");
  });

  it("camelCase dimension keys become kebab-case var names", () => {
    const root = document.createElement("div");
    applyTheme(root, defaultTheme);
    expect(root.style.getPropertyValue("--ui-color-fg-muted")).toBe(defaultTheme.color.fgMuted);
    expect(root.style.getPropertyValue("--ui-color-bg-sunken")).toBe(defaultTheme.color.bgSunken);
  });
});

describe("useTheme — scope-aware lookup", () => {
  it("throws outside UI scope", () => {
    expect(() => useTheme()).toThrow(/requires an active UI context/);
  });

  it("returns defaultTheme when mount has no explicit theme", () => {
    let captured: Theme | null = null;
    const Inner = defineComponent<Record<string, never>>(() => {
      captured = useTheme();
      return h("div", null);
    });
    const handle = mount(h(Inner, null), ctx);
    expect(captured).toBe(defaultTheme);
    handle.unmount();
  });

  it("returns the mount's explicit theme when provided", () => {
    const myTheme = defineTheme({
      ...defaultTheme,
      color: { ...defaultTheme.color, accent: "#ff00ff" },
    });
    let captured: Theme | null = null;
    const Inner = defineComponent<Record<string, never>>(() => {
      captured = useTheme();
      return h("div", null);
    });
    const handle = mount(h(Inner, null), ctx, { theme: myTheme });
    expect(captured).toBe(myTheme);
    expect(captured!.color.accent).toBe("#ff00ff");
    handle.unmount();
  });
});

describe("mount — root receives theme's CSS vars automatically", () => {
  it("default theme CSS vars land on root element without explicit applyTheme", () => {
    const handle = mount(h("div", null), ctx);
    const root = handle.element as HTMLElement;
    expect(root.style.getPropertyValue("--ui-color-accent")).toBe(defaultTheme.color.accent);
    handle.unmount();
  });

  it("explicit theme overrides default on root", () => {
    const myTheme = defineTheme({
      ...defaultTheme,
      color: { ...defaultTheme.color, accent: "#abc123" },
    });
    const handle = mount(h("div", null), ctx, { theme: myTheme });
    const root = handle.element as HTMLElement;
    expect(root.style.getPropertyValue("--ui-color-accent")).toBe("#abc123");
    handle.unmount();
  });

  it("unmount removes the theme CSS vars", () => {
    const handle = mount(h("div", null), ctx);
    const root = handle.element as HTMLElement;
    expect(root.style.getPropertyValue("--ui-color-accent")).not.toBe("");
    handle.unmount();
    expect(root.style.getPropertyValue("--ui-color-accent")).toBe("");
  });

  it("tokens inside bindStyle resolve against the root's CSS vars via cascade", () => {
    const Card = defineComponent<Record<string, never>>(() => (
      <span style={{ color: "$color.accent", padding: "$spacing.md" }}>hello</span>
    ));
    const handle = mount(<Card />, ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    const span = handle.element as HTMLElement;
    expect(span.style.color).toBe("var(--ui-color-accent)");
    // happy-dom doesn't resolve var() for getComputedStyle, but confirm the
    // root has the var set — the cascade resolution is browser behaviour.
    expect(span.style.getPropertyValue("--ui-color-accent")).toBe(defaultTheme.color.accent);
    handle.unmount();
    document.body.removeChild(handle.element);
  });
});
