import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { defineUI, For, Text } from "../src/define";
import { renderUI, type RenderContext } from "../src/domRenderer";

function makeCtx(): RenderContext {
  return { doc: document, features: {}, watchFeature: undefined };
}

describe("For — key-based diffing preserves identity", () => {
  it("DOM node ref survives across items append when key unchanged", () => {
    const items = ref<{ id: number }[]>([{ id: 1 }, { id: 2 }]);
    const UI = defineUI(() => [
      For({ items, key: (i) => i.id, render: (i) => defineUI(() => [Text(String(i.id))])() }),
    ]);
    const { element } = renderUI(UI(), makeCtx());

    const forWrap = element.firstChild as HTMLElement;
    const first0 = forWrap.children[0];
    const first1 = forWrap.children[1];

    items.value = [...items.value, { id: 3 }];

    expect(forWrap.children).toHaveLength(3);
    expect(forWrap.children[0]).toBe(first0); // id=1 slot preserved
    expect(forWrap.children[1]).toBe(first1); // id=2 slot preserved
  });

  it("removing an item tears down exactly that slot", () => {
    const items = ref<{ id: number }[]>([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const UI = defineUI(() => [
      For({ items, key: (i) => i.id, render: (i) => defineUI(() => [Text(String(i.id))])() }),
    ]);
    const { element } = renderUI(UI(), makeCtx());

    const forWrap = element.firstChild as HTMLElement;
    const kept0 = forWrap.children[0];
    const kept2 = forWrap.children[2];

    items.value = [{ id: 1 }, { id: 3 }];

    expect(forWrap.children).toHaveLength(2);
    expect(forWrap.children[0]).toBe(kept0);
    expect(forWrap.children[1]).toBe(kept2);
  });

  it("reorder keeps nodes, only rewires positions", () => {
    const items = ref<{ id: number }[]>([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const UI = defineUI(() => [
      For({ items, key: (i) => i.id, render: (i) => defineUI(() => [Text(String(i.id))])() }),
    ]);
    const { element } = renderUI(UI(), makeCtx());

    const forWrap = element.firstChild as HTMLElement;
    const n1 = forWrap.children[0];
    const n2 = forWrap.children[1];
    const n3 = forWrap.children[2];

    items.value = [{ id: 3 }, { id: 1 }, { id: 2 }];

    expect(forWrap.children[0]).toBe(n3);
    expect(forWrap.children[1]).toBe(n1);
    expect(forWrap.children[2]).toBe(n2);
  });

  it("render function is called exactly once per new key (not per existing key)", () => {
    const items = ref<{ id: number }[]>([{ id: 1 }]);
    let renderCalls = 0;
    const UI = defineUI(() => [
      For({
        items,
        key: (i) => i.id,
        render: (i) => {
          renderCalls++;
          return defineUI(() => [Text(String(i.id))])();
        },
      }),
    ]);
    const { element } = renderUI(UI(), makeCtx());
    void element;
    expect(renderCalls).toBe(1);

    items.value = [{ id: 1 }, { id: 2 }];
    expect(renderCalls).toBe(2); // +1 for new id=2, id=1 reused

    items.value = [{ id: 2 }, { id: 1 }]; // reorder
    expect(renderCalls).toBe(2); // no new renders

    items.value = [{ id: 2 }, { id: 1 }, { id: 3 }]; // +1
    expect(renderCalls).toBe(3);
  });

  it("empty → non-empty → empty transitions clean up correctly", () => {
    const items = ref<number[]>([]);
    const UI = defineUI(() => [
      For({
        items,
        render: (i) => defineUI(() => [Text(String(i))])(),
        empty: defineUI(() => [Text("(none)")])(),
      }),
    ]);
    const { element } = renderUI(UI(), makeCtx());
    const forWrap = element.firstChild as HTMLElement;

    expect(forWrap.textContent).toContain("(none)");

    items.value = [1, 2];
    expect(forWrap.children).toHaveLength(2);
    expect(forWrap.textContent).not.toContain("(none)");

    items.value = [];
    expect(forWrap.textContent).toContain("(none)");
  });
});
