import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { h } from "../../src/core/element";
import { For } from "../../src/dom/atoms/For";
import { Text } from "../../src/dom/atoms/Text";
import { mount } from "../../src/dom/render";

const ctx = { doc: document };

describe("For — key-based diffing preserves identity", () => {
  it("appending an item keeps existing slot DOM refs", () => {
    const items = ref<{ id: number }[]>([{ id: 1 }, { id: 2 }]);
    const handle = mount(For({ items, key: (i) => i.id, render: (i) => Text(String(i.id)) }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const wrap = handle.element as HTMLElement;
    const first = wrap.children[0];
    const second = wrap.children[1];

    items.value = [...items.value, { id: 3 }];

    expect(wrap.children.length).toBe(3);
    expect(wrap.children[0]).toBe(first);
    expect(wrap.children[1]).toBe(second);

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("removing an item tears down exactly that slot", () => {
    const items = ref<{ id: number }[]>([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const handle = mount(For({ items, key: (i) => i.id, render: (i) => Text(String(i.id)) }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const wrap = handle.element as HTMLElement;
    const kept0 = wrap.children[0];
    const kept2 = wrap.children[2];

    items.value = [{ id: 1 }, { id: 3 }];

    expect(wrap.children.length).toBe(2);
    expect(wrap.children[0]).toBe(kept0);
    expect(wrap.children[1]).toBe(kept2);
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("reorder preserves nodes and reshuffles position", () => {
    const items = ref<{ id: number }[]>([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const handle = mount(For({ items, key: (i) => i.id, render: (i) => Text(String(i.id)) }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const wrap = handle.element as HTMLElement;
    const n1 = wrap.children[0];
    const n2 = wrap.children[1];
    const n3 = wrap.children[2];

    items.value = [{ id: 3 }, { id: 1 }, { id: 2 }];

    expect(wrap.children[0]).toBe(n3);
    expect(wrap.children[1]).toBe(n1);
    expect(wrap.children[2]).toBe(n2);
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("item setup runs exactly once per key across reorders", () => {
    const items = ref<{ id: number }[]>([{ id: 1 }, { id: 2 }]);
    const setups = new Map<number, number>();
    const handle = mount(
      For({
        items,
        key: (i) => i.id,
        render: (i) => {
          setups.set(i.id, (setups.get(i.id) ?? 0) + 1);
          return Text(String(i.id));
        },
      }),
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();

    expect(setups.get(1)).toBe(1);
    expect(setups.get(2)).toBe(1);

    items.value = [{ id: 2 }, { id: 1 }];
    expect(setups.get(1)).toBe(1);
    expect(setups.get(2)).toBe(1);

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("For — empty fallback", () => {
  it("renders empty UIElement when items becomes empty, removes on repopulate", () => {
    const items = ref<number[]>([1, 2]);
    const handle = mount(
      For({
        items,
        render: (n) => Text(String(n)),
        empty: h("span", { class: "empty" }, "none"),
      }),
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();

    const wrap = handle.element as HTMLElement;
    expect(wrap.querySelector(".empty")).toBeNull();

    items.value = [];
    expect(wrap.querySelector(".empty")?.textContent).toBe("none");

    items.value = [9];
    expect(wrap.querySelector(".empty")).toBeNull();
    expect(wrap.children.length).toBe(1);

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("For — duplicate keys get separate slots", () => {
  it("two items with same key both render without collapsing", () => {
    const items = ref<string[]>(["a", "a"]);
    const handle = mount(For({ items, key: (s) => s, render: (s, i) => Text(`${s}-${i}`) }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const wrap = handle.element as HTMLElement;
    expect(wrap.children.length).toBe(2);
    expect(wrap.children[0].textContent).toBe("a-0");
    expect(wrap.children[1].textContent).toBe("a-1");
    handle.unmount();
    document.body.removeChild(handle.element);
  });
});
