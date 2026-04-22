import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { h } from "../../src/core/element";
import { defaultTheme, defineTheme } from "../../src/core/theme";
import { Badge } from "../../src/dom/composites/Badge";
import { Card } from "../../src/dom/composites/Card";
import { IconButton } from "../../src/dom/composites/IconButton";
import { ThemeProvider } from "../../src/dom/composites/ThemeProvider";
import { mount } from "../../src/dom/render";

const ctx = { doc: document };

describe("Badge composite", () => {
  it("renders label text", () => {
    const handle = mount(h(Badge, { label: "NEW", role: "primary" }), ctx);
    expect(handle.element.textContent).toBe("NEW");
    handle.unmount();
  });

  it("default variant is subtle (muted bg / text color)", () => {
    const handle = mount(h(Badge, { label: "42" }), ctx);
    const el = handle.element as HTMLElement;
    expect(el.style.background).toBe("var(--ui-color-neutral-muted)");
    expect(el.style.color).toBe("var(--ui-color-neutral-text)");
    handle.unmount();
  });

  it("solid variant uses role.bg + role.fg", () => {
    const handle = mount(h(Badge, { label: "!", role: "danger", variant: "solid" }), ctx);
    const el = handle.element as HTMLElement;
    expect(el.style.background).toBe("var(--ui-color-danger-bg)");
    expect(el.style.color).toBe("var(--ui-color-danger-fg)");
    handle.unmount();
  });
});

describe("IconButton composite", () => {
  it("renders children as icon slot", () => {
    const handle = mount(h(IconButton, { onClick: () => {}, title: "close" }, "×"), ctx);
    expect(handle.element.textContent).toBe("×");
    handle.unmount();
  });

  it("triggers onClick", () => {
    let count = 0;
    const handle = mount(h(IconButton, { onClick: () => count++, label: "x" }, "×"), ctx);
    (handle.element as HTMLButtonElement).click();
    expect(count).toBe(1);
    handle.unmount();
  });

  it("disabled=true sets aria-disabled effect (button.disabled + opacity)", () => {
    const handle = mount(
      h(IconButton, { onClick: () => {}, label: "x", disabled: true }, "×"),
      ctx
    );
    const btn = handle.element as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.style.opacity).toBe("0.5");
    handle.unmount();
  });

  it("label becomes aria-label", () => {
    const handle = mount(h(IconButton, { onClick: () => {}, label: "close panel" }, "×"), ctx);
    expect((handle.element as HTMLElement).getAttribute("aria-label")).toBe("close panel");
    handle.unmount();
  });
});

describe("Card composite", () => {
  it("renders children inside a surface container", () => {
    const handle = mount(h(Card, {}, "body"), ctx);
    expect(handle.element.textContent).toBe("body");
    handle.unmount();
  });

  it("raised elevation uses surface.base token", () => {
    const handle = mount(h(Card, { elevation: "raised" }, "x"), ctx);
    expect((handle.element as HTMLElement).style.background).toBe("var(--ui-color-surface-base)");
    handle.unmount();
  });

  it("high elevation sets shadow", () => {
    const handle = mount(h(Card, { elevation: "high" }, "x"), ctx);
    const el = handle.element as HTMLElement;
    expect(el.style.background).toBe("var(--ui-color-surface-high)");
    expect(el.style.boxShadow).toBe("var(--ui-shadow-md)");
    handle.unmount();
  });

  it("interactive triggers onClick", () => {
    let count = 0;
    const handle = mount(h(Card, { interactive: true, onClick: () => count++ }, "x"), ctx);
    (handle.element as HTMLElement).click();
    expect(count).toBe(1);
    handle.unmount();
  });
});

describe("ThemeProvider composite", () => {
  it("applies theme's CSS vars to its root div", () => {
    const handle = mount(
      h(ThemeProvider, { theme: defaultTheme }, h("div", { class: "child" }, "x")),
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();
    const root = handle.element as HTMLElement;
    expect(root.style.getPropertyValue("--ui-color-primary-500")).toBe(
      defaultTheme.color.primary[500]
    );
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("reactive theme Ref swaps vars on change", () => {
    const lightTheme = defaultTheme;
    const darkTheme = defineTheme({ mode: "dark" });
    const themeRef = ref(lightTheme);

    const handle = mount(h(ThemeProvider, { theme: themeRef }, h("div", null, "x")), ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    const root = handle.element as HTMLElement;
    expect(root.style.getPropertyValue("--ui-color-primary-500")).toBe(
      lightTheme.color.primary[500]
    );

    themeRef.value = darkTheme;
    expect(root.style.getPropertyValue("--ui-color-primary-500")).toBe(
      darkTheme.color.primary[500]
    );

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});
