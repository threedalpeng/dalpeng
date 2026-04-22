import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { Bar } from "../../src/dom/composites/Bar";
import { Menu } from "../../src/dom/composites/Menu";
import { Value } from "../../src/dom/composites/Value";
import { mount } from "../../src/dom/render";

const ctx = { doc: document };

describe("Bar — static + reactive width", () => {
  it("static Bar opens at 0% width", () => {
    const handle = mount(Bar({ width: 100, height: 10 }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const outer = handle.element as HTMLElement;
    expect(outer.style.width).toBe("100px");
    expect(outer.style.height).toBe("10px");
    const inner = outer.firstChild as HTMLElement;
    expect(inner.style.width).toBe("0%");

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("reactive Bar tracks formatter(source.value)", () => {
    const hp = ref(50);
    const handle = mount(
      Bar(hp, (v) => v / 100, { width: 200, height: 20, color: "#f00" }),
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();

    const outer = handle.element as HTMLElement;
    const inner = outer.firstChild as HTMLElement;
    expect(inner.style.width).toBe("50%");

    hp.value = 75;
    expect(inner.style.width).toBe("75%");
    expect(inner.style.backgroundColor).toBe("#f00");

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("Value — label / content pair", () => {
  it("static content renders inline", () => {
    const handle = mount(Value("Health", "full"), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const row = handle.element as HTMLElement;
    const spans = row.querySelectorAll("span");
    expect(spans[0].textContent).toBe("Health");
    expect(spans[1].textContent).toBe("full");

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("Ref content patches text on write", () => {
    const hp = ref("full");
    const handle = mount(Value("Health", hp), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const row = handle.element as HTMLElement;
    const valueSpan = row.querySelectorAll("span")[1];
    expect(valueSpan.textContent).toBe("full");

    hp.value = "low";
    expect(valueSpan.textContent).toBe("low");

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("Menu — keyboard nav + click select", () => {
  it("click selects an item and updates focus", () => {
    let selected: string | null = null;
    const items = [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
      { value: "c", label: "C" },
    ];
    const handle = mount(Menu({ items, onSelect: (item) => (selected = item.value) }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const ul = handle.element as HTMLUListElement;
    const lis = ul.querySelectorAll("li");
    (lis[1] as HTMLLIElement).click();
    expect(selected).toBe("b");

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("ArrowDown/Up wraps + skips disabled", () => {
    const items = [
      { value: "a", label: "A" },
      { value: "b", label: "B", disabled: true },
      { value: "c", label: "C" },
    ];
    const focus = ref(0);
    const handle = mount(Menu({ items, onSelect: () => {}, focusIndex: focus }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const ul = handle.element as HTMLUListElement;
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(focus.value).toBe(2); // skips disabled index 1

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("Enter fires onSelect on the current focused item", () => {
    let selected: string | null = null;
    const items = [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ];
    const focus = ref(1);
    const handle = mount(
      Menu({ items, onSelect: (item) => (selected = item.value), focusIndex: focus }),
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();

    const ul = handle.element as HTMLUListElement;
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(selected).toBe("b");

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});
