import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { h } from "../../src/core/element";
import { Tree, type TreeNode } from "../../src/dom/composites/Tree";
import { mount } from "../../src/dom/render";

const ctx = { doc: document };

const SAMPLE: TreeNode[] = [
  {
    id: "scene",
    label: "Scene",
    children: [
      { id: "player", label: "Player" },
      {
        id: "enemies",
        label: "Enemies",
        children: [
          { id: "e1", label: "Goblin" },
          { id: "e2", label: "Troll" },
        ],
      },
    ],
  },
  { id: "hud", label: "HUD" },
];

describe("Tree composite", () => {
  it("renders only root-level nodes when collapsed (default)", () => {
    const handle = mount(h(Tree, { nodes: SAMPLE }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    const rows = (handle.element as HTMLElement).querySelectorAll("[role='treeitem']");
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain("Scene");
    expect(rows[1].textContent).toContain("HUD");
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("defaultExpanded=true expands the entire tree", () => {
    const handle = mount(h(Tree, { nodes: SAMPLE, defaultExpanded: true }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    const rows = (handle.element as HTMLElement).querySelectorAll("[role='treeitem']");
    expect(rows.length).toBe(6); // scene, player, enemies, e1, e2, hud
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("caret click toggles expansion", () => {
    let toggled: string | null = null;
    const handle = mount(
      h(Tree, {
        nodes: SAMPLE,
        onToggle: (id) => {
          toggled = id;
        },
      }),
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();
    const firstRow = (handle.element as HTMLElement).querySelector(
      "[role='treeitem']"
    ) as HTMLElement;
    const caret = firstRow.firstChild as HTMLElement;
    caret.click();
    expect(toggled).toBe("scene");
    // After expand, should now show Player and Enemies as children.
    const rows = (handle.element as HTMLElement).querySelectorAll("[role='treeitem']");
    expect(rows.length).toBe(4); // scene, player, enemies, hud
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("row click fires onSelect with node id", () => {
    let selectedId: string | null = null;
    const handle = mount(h(Tree, { nodes: SAMPLE, onSelect: (id) => (selectedId = id) }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    const firstRow = (handle.element as HTMLElement).querySelector(
      "[role='treeitem']"
    ) as HTMLElement;
    firstRow.click();
    expect(selectedId).toBe("scene");
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("selected Ref is respected for decoration", () => {
    const selected = ref<string | null>("hud");
    const handle = mount(h(Tree, { nodes: SAMPLE, selected }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    const rows = (handle.element as HTMLElement).querySelectorAll("[role='treeitem']");
    const hudRow = rows[1] as HTMLElement;
    expect(hudRow.style.background).toBe("var(--ui-color-primary-muted)");
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("reactive nodes Ref rebuilds rows on change", () => {
    const nodesRef = ref<TreeNode[]>([{ id: "a", label: "A" }]);
    const handle = mount(h(Tree, { nodes: nodesRef }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    let rows = (handle.element as HTMLElement).querySelectorAll("[role='treeitem']");
    expect(rows.length).toBe(1);

    nodesRef.value = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    rows = (handle.element as HTMLElement).querySelectorAll("[role='treeitem']");
    expect(rows.length).toBe(2);
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("disabled node skips click activation", () => {
    let selectedId: string | null = null;
    const nodes: TreeNode[] = [{ id: "x", label: "X", disabled: true }];
    const handle = mount(h(Tree, { nodes, onSelect: (id) => (selectedId = id) }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    const row = (handle.element as HTMLElement).querySelector("[role='treeitem']") as HTMLElement;
    row.click();
    expect(selectedId).toBeNull();
    handle.unmount();
    document.body.removeChild(handle.element);
  });
});
