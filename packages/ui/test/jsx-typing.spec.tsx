import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { defineComponent } from "../src/core/element";
import { mount } from "../src/dom/render";

// Type-level assertions disguised as runtime `it` blocks. The test suite
// passes when the file type-checks; the runtime assertions are mostly
// smoke tests that the rendered DOM carries the intended semantics.

const ctx = { doc: document };

describe("JSX intrinsic tag coverage", () => {
  // Regression lock — `<select>` / `<input>` / `<textarea>` must not report
  // "name not found" (an earlier index-only IntrinsicElements signature
  // failed to register these with some TS language servers).
  it("common HTML + form + media + SVG tags compile and render", () => {
    const tree = (
      <div>
        <span>text</span>
        <p>para</p>
        <h1>heading</h1>
        <ul>
          <li>item</li>
        </ul>
        <button type="button">btn</button>
        <input type="text" />
        <textarea />
        <select>
          <option value="a">A</option>
        </select>
        <label htmlFor="x">label</label>
        <a href="#">link</a>
        <img src="" alt="" />
        <svg>
          <rect />
        </svg>
      </div>
    );
    const handle = mount(tree, ctx);
    expect(handle.element).toBeDefined();
    handle.unmount();
  });
});

describe("HostProps typed event handlers", () => {
  it("onClick receives a MouseEvent-typed argument (compile-time)", () => {
    let captured: MouseEvent | null = null;
    const handle = mount(
      <button
        onClick={(e) => {
          captured = e;
        }}
      >
        click
      </button>,
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();
    (handle.element as HTMLButtonElement).click();
    expect(captured).toBeInstanceOf(Event);
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("onInput / onChange / onKeyDown types compile", () => {
    const Comp = defineComponent<{ onType: (v: string) => void }>(({ onType }) => (
      <input
        type="text"
        onInput={(e) => onType((e.currentTarget as HTMLInputElement).value)}
        onChange={(e) => onType((e.currentTarget as HTMLInputElement).value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onType("enter");
        }}
      />
    ));
    let last = "";
    const handle = mount(<Comp onType={(v) => (last = v)} />, ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    const input = handle.element as HTMLInputElement;
    input.value = "hi";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(last).toBe("hi");
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("pointer / touch / drag events compile", () => {
    const tree = (
      <div
        onPointerDown={(e: PointerEvent) => void e}
        onPointerUp={(e: PointerEvent) => void e}
        onTouchStart={(e: TouchEvent) => void e}
        onDragOver={(e: DragEvent) => e.preventDefault()}
        onDrop={(e: DragEvent) => void e.dataTransfer}
      />
    );
    const handle = mount(tree, ctx);
    expect(handle.element).toBeDefined();
    handle.unmount();
  });
});

describe("HostProps style + class", () => {
  it("style accepts Style-typed object with theme tokens", () => {
    const handle = mount(
      <div
        style={{
          display: "flex",
          padding: "$spacing.md",
          color: "$color.primary.bg",
          gap: 4,
        }}
      />,
      ctx
    );
    const el = handle.element as HTMLElement;
    expect(el.style.padding).toBe("var(--ui-spacing-md)");
    expect(el.style.color).toBe("var(--ui-color-primary-bg)");
    expect(el.style.gap).toBe("4px");
    handle.unmount();
  });

  it("style accepts per-property Refs", () => {
    const opacity = ref(0.5);
    const handle = mount(<div style={{ opacity }} />, ctx);
    const el = handle.element as HTMLElement;
    expect(el.style.opacity).toBe("0.5");
    opacity.value = 1;
    expect(el.style.opacity).toBe("1");
    handle.unmount();
  });

  it("class accepts string + Ref<string>", () => {
    const cls = ref("a b");
    const handle = mount(<div class={cls} />, ctx);
    const el = handle.element as HTMLElement;
    expect(el.className).toBe("a b");
    cls.value = "c";
    expect(el.className).toBe("c");
    handle.unmount();
  });
});

describe("HostProps ref callback", () => {
  it("ref fires after mount with el + cleanup returned", () => {
    let saw: Element | null = null;
    let cleanupFired = false;
    const handle = mount(
      <div
        ref={(el) => {
          saw = el;
          return () => {
            cleanupFired = true;
          };
        }}
      >
        x
      </div>,
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();
    expect(saw).not.toBeNull();
    expect(saw).toBe(handle.element);
    handle.unmount();
    document.body.removeChild(handle.element);
    expect(cleanupFired).toBe(true);
  });
});

describe("Catch-all index signature — data-* / aria-* / SVG-ish attrs", () => {
  it("data-* attributes pass through as DOM attrs", () => {
    const handle = mount(<div data-test-id="foo" data-count={42} />, ctx);
    const el = handle.element as HTMLElement;
    expect(el.getAttribute("data-test-id")).toBe("foo");
    expect(el.getAttribute("data-count")).toBe("42");
    handle.unmount();
  });

  it("aria-* attributes pass through", () => {
    const handle = mount(<div aria-label="foo" aria-pressed="true" />, ctx);
    const el = handle.element as HTMLElement;
    expect(el.getAttribute("aria-label")).toBe("foo");
    expect(el.getAttribute("aria-pressed")).toBe("true");
    handle.unmount();
  });
});

describe("Fragment + component composition", () => {
  it("fragment renders multiple children without wrapper", () => {
    const handle = mount(
      <>
        <span>a</span>
        <span>b</span>
      </>,
      ctx
    );
    expect(handle.element.textContent).toBe("ab");
    handle.unmount();
  });

  it("composite components pass typed props", () => {
    interface P {
      greeting: string;
      tone: "primary" | "danger";
    }
    const Msg = defineComponent<P>(({ greeting, tone }) => (
      <span style={{ color: `$color.${tone}.text` }}>{greeting}</span>
    ));
    const handle = mount(<Msg greeting="hi" tone="primary" />, ctx);
    expect(handle.element.textContent).toBe("hi");
    expect((handle.element as HTMLElement).style.color).toBe("var(--ui-color-primary-text)");
    handle.unmount();
  });
});
