import { ref } from "@dalpeng/core";
import { describe, expect, it, vi } from "vitest";
import { defineWidget, h } from "../src/core/element";
import {
  auditTheme,
  defaultTheme,
  defineTheme,
  pushTheme,
  toColorRole,
  useTheme,
  type Theme,
} from "../src/core/theme";
import { mount } from "../src/dom/render";

// augmentation.d.ts picked up ambiently via tsconfig include — no runtime import.

const ctx = { doc: document };

describe("pushTheme — setup-scope theme push", () => {
  it("popping the scope restores the previous theme for useTheme()", () => {
    let inner: Theme | null = null;
    let outer: Theme | null = null;

    const custom = defineTheme({ seeds: { primary: "#ff0055" } });

    const Inner = defineWidget<Record<string, never>>(() => {
      const pop = pushTheme(custom);
      inner = useTheme();
      pop();
      outer = useTheme();
      return h("div", null);
    });

    const handle = mount(h(Inner, null), ctx);
    expect(inner).toBe(custom);
    expect(outer).toBe(defaultTheme);
    handle.unmount();
  });
});

describe("auditTheme — dev-mode warnings", () => {
  it("no warnings on a clean default theme", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    auditTheme(defaultTheme);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns on role hue collision (primary ≈ accent)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // primary and accent seeded with the same hue → hue distance 0 → warn.
    const clashing = defineTheme({
      seeds: { primary: "#3a86ff", accent: "#3a86ff" },
    });
    auditTheme(clashing);
    const clashMsg = warn.mock.calls.some(
      (args) => typeof args[0] === "string" && args[0].includes("hues differ")
    );
    expect(clashMsg).toBe(true);
    warn.mockRestore();
  });
});

describe("Module augmentation — ThemeColorExtensions", () => {
  // If augmentation.d.ts did not reshape ThemeColor, the `mana` key below would
  // be a type error — ensuring the augmentation slot is actually wired.
  it("game-defined role is assignable via defineTheme overrides", () => {
    const gameTheme = defineTheme({
      base: defaultTheme,
      overrides: {
        color: {
          mana: toColorRole("#3aa0ff"),
        },
      },
    });
    // Both primitive step + semantic alias should be accessible.
    expect(gameTheme.color.mana[500]).toMatch(/^#[0-9a-f]{6}$/);
    expect(gameTheme.color.mana.bg).toBe(gameTheme.color.mana[500]);
    // Built-in roles still present.
    expect(gameTheme.color.primary.bg).toBe(defaultTheme.color.primary.bg);
  });
});

describe("ThemeProvider follow-up — useTheme scope caveat", () => {
  // This is a KNOWN limitation recorded in plan §7 caveats + PR4a archive:
  // ThemeProvider applies CSS vars to its root (cascade works) but does NOT
  // push a JS-level scope, so useTheme() inside children still resolves
  // against the outer UI scope. This test documents the current behavior so
  // a future fix (pushTheme integration) breaks this assertion intentionally.
  it("children's useTheme() returns the OUTER theme, not ThemeProvider's", async () => {
    const { ThemeProvider } = await import("../src/dom/composites/ThemeProvider");
    const inner = defineTheme({ seeds: { primary: "#ff00ff" } });
    const captured = ref<Theme | null>(null);

    const Probe = defineWidget<Record<string, never>>(() => {
      captured.value = useTheme();
      return h("div", null);
    });

    const handle = mount(h(ThemeProvider, { theme: inner }, h(Probe, null)), ctx);
    // outer mount has no explicit theme → defaultTheme. ThemeProvider doesn't
    // change JS scope, so Probe sees defaultTheme, not `inner`.
    expect(captured.value).toBe(defaultTheme);
    expect(captured.value).not.toBe(inner);
    handle.unmount();
  });
});
