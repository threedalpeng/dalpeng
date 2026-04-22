import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { Button } from "../../src/atoms/Button";
import { Html } from "../../src/atoms/Html";
import { Text } from "../../src/atoms/Text";
import { mount } from "../../src/render";

const ctx = { doc: document };

describe("Text — static content", () => {
  it("renders a string inside a span", () => {
    const handle = mount(Text("hello"), ctx);
    const span = handle.element as HTMLElement;
    expect(span.tagName).toBe("SPAN");
    expect(span.textContent).toBe("hello");
    handle.unmount();
  });

  it("applies TextOpts to style", () => {
    const handle = mount(Text("hi", { size: 16, color: "#fff", bold: true }), ctx);
    const span = handle.element as HTMLElement;
    expect(span.style.fontSize).toBe("16px");
    expect(span.style.color).toBe("#fff");
    expect(span.style.fontWeight).toBe("700");
    handle.unmount();
  });
});

describe("Text — reactive content", () => {
  it("string Ref patches textContent on write without re-rendering span", () => {
    const value = ref("one");
    const handle = mount(Text(value), ctx);
    const span = handle.element as HTMLElement;
    expect(span.textContent).toBe("one");

    value.value = "two";
    expect(span.textContent).toBe("two");
    // Same element identity — no re-render
    expect(handle.element).toBe(span);
    handle.unmount();
  });

  it("Ref + formatter projects value through formatter", () => {
    const count = ref(0);
    const handle = mount(
      Text(count, (n) => `count: ${n}`),
      ctx
    );
    const span = handle.element as HTMLElement;
    expect(span.textContent).toBe("count: 0");

    count.value = 5;
    expect(span.textContent).toBe("count: 5");
    handle.unmount();
  });
});

describe("Html — raw markup escape hatch", () => {
  it("sets innerHTML from content string", () => {
    const handle = mount(Html("<b>bold</b> text"), ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    const div = handle.element as HTMLElement;
    expect(div.tagName).toBe("DIV");
    expect(div.querySelector("b")?.textContent).toBe("bold");
    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("Button — click handler", () => {
  it("renders a button element with label + wired click", () => {
    let clicks = 0;
    const handle = mount(
      Button("Click me", () => clicks++),
      ctx
    );
    const btn = handle.element as HTMLButtonElement;
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.type).toBe("button");
    expect(btn.textContent).toBe("Click me");

    btn.click();
    btn.click();
    expect(clicks).toBe(2);
    handle.unmount();
  });

  it("click handler is removed after unmount", () => {
    let clicks = 0;
    const handle = mount(
      Button("x", () => clicks++),
      ctx
    );
    const btn = handle.element as HTMLButtonElement;
    btn.click();
    expect(clicks).toBe(1);

    handle.unmount();
    btn.click();
    expect(clicks).toBe(1);
  });
});
