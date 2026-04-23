import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { Range } from "../../src/dom/atoms/Range";
import { Select } from "../../src/dom/atoms/Select";
import { Toggle } from "../../src/dom/atoms/Toggle";
import { mount } from "../../src/dom/render";

const ctx = { doc: document };

describe("Toggle — two-way checkbox binding", () => {
  it("reflects Ref<boolean> state and commits user toggles back", () => {
    const enabled = ref(false);
    const handle = mount(Toggle({ source: enabled, label: "Enabled" }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const input = (handle.element as HTMLElement).querySelector("input")!;
    expect(input.checked).toBe(false);

    enabled.value = true;
    expect(input.checked).toBe(true);

    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(enabled.value).toBe(false);

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("cleans up subscription on unmount — later Ref writes don't touch DOM", () => {
    const enabled = ref(false);
    const handle = mount(Toggle({ source: enabled, label: "x" }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const input = (handle.element as HTMLElement).querySelector("input")!;
    handle.unmount();
    enabled.value = true;
    expect(input.checked).toBe(false);
    document.body.removeChild(handle.element);
  });
});

describe("Range — value + display + event", () => {
  it("mirrors Ref<number> on input element and commits user slides back", () => {
    const source = ref(50);
    const handle = mount(Range({ source, label: "Volume", min: 0, max: 100, step: 1 }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const input = (handle.element as HTMLElement).querySelector("input")!;
    expect(input.type).toBe("range");
    expect(input.min).toBe("0");
    expect(input.max).toBe("100");
    expect(input.value).toBe("50");

    source.value = 75;
    expect(input.value).toBe("75");

    input.value = "10";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(source.value).toBe(10);

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("renders a live display span that tracks the value", () => {
    const source = ref(42);
    const handle = mount(Range({ source, label: "x", min: 0, max: 100 }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const spans = (handle.element as HTMLElement).querySelectorAll("span");
    // First span is label, second is value display.
    expect(spans[1].textContent).toBe("42");
    source.value = 88;
    expect(spans[1].textContent).toBe("88");

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("Select — option list + two-way binding", () => {
  it("renders options and mirrors Ref<string>", () => {
    const choice = ref("b");
    const opts = [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
      { value: "c", label: "C" },
    ];
    const handle = mount(Select({ source: choice, label: "Pick", options: opts }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const select = (handle.element as HTMLElement).querySelector("select")!;
    expect(select.options.length).toBe(3);
    expect(select.value).toBe("b");

    choice.value = "c";
    expect(select.value).toBe("c");

    select.value = "a";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(choice.value).toBe("a");

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});
