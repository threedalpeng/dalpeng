export type SplitDirection = "row" | "col";

/** Leaf node — one or more tabbed panels with one active at a time. */
export interface TabsNode {
  kind: "tabs";
  /** Stable id used by DnD to locate this node by reference. */
  id: string;
  /** Panel keys (`${plugin.name}:${panel.id}`). Order is the tab order. */
  panelKeys: string[];
  /** Index into `panelKeys` of the currently active tab. */
  activeIdx: number;
}

/** Internal node — splits its children horizontally or vertically. */
export interface SplitNode {
  kind: "split";
  id: string;
  direction: SplitDirection;
  /** Length must be ≥ 2; collapse to the single child otherwise. */
  children: LayoutNode[];
  /** Relative (proportional) sizes per child. Same length as `children`. */
  sizes: number[];
}

export type LayoutNode = TabsNode | SplitNode;

/** Free-floating window detached from the main dock. */
export interface FloatingWindow {
  id: string;
  layout: LayoutNode;
  /** Position relative to the main page viewport. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Workspace {
  main: LayoutNode;
  /** Drag-out detached windows. */
  floating: FloatingWindow[];
  /** True if the entire main dock is popped out into its own browser window. */
  mainPoppedOut: boolean;
}

let _idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}_${(_idCounter++).toString(36)}`;
}

export function createTabs(panelKeys: string[]): TabsNode {
  return {
    kind: "tabs",
    id: nextId("t"),
    panelKeys: [...panelKeys],
    activeIdx: 0,
  };
}

export function createSplit(
  direction: SplitDirection,
  children: LayoutNode[],
  sizes?: number[]
): SplitNode {
  const sz =
    sizes && sizes.length === children.length ? [...sizes] : new Array(children.length).fill(1);
  return {
    kind: "split",
    id: nextId("s"),
    direction,
    children: [...children],
    sizes: sz,
  };
}

/** Default workspace: vertical stack of Scene · Inspector/Render · Console/Perf/Layers. */
export function defaultWorkspace(): Workspace {
  return {
    main: createSplit(
      "col",
      [
        createTabs(["@dalpeng/devtools/scene:scene"]),
        createTabs([
          "@dalpeng/devtools/scene:inspector",
          "@dalpeng/devtools/render:render",
          "@dalpeng/devtools/assets:textures",
        ]),
        createTabs([
          "@dalpeng/devtools/console:console",
          "@dalpeng/devtools/performance:perf",
          "@dalpeng/devtools/layers:layers",
        ]),
      ],
      [200, 280, 240]
    ),
    floating: [],
    mainPoppedOut: false,
  };
}

export function walk(
  node: LayoutNode,
  visit: (n: LayoutNode, parent: SplitNode | null, idxInParent: number) => void,
  parent: SplitNode | null = null,
  idxInParent = 0
): void {
  visit(node, parent, idxInParent);
  if (node.kind === "split") {
    node.children.forEach((c, i) => walk(c, visit, node, i));
  }
}

/** Walk every layout root in the workspace (main + each floating window). */
export function walkWorkspace(
  ws: Workspace,
  visit: (n: LayoutNode, parent: SplitNode | null, idxInParent: number) => void
): void {
  walk(ws.main, visit);
  for (const f of ws.floating) walk(f.layout, visit);
}

/** Collect every panel key referenced anywhere in the workspace. */
export function collectAllKeys(ws: Workspace): Set<string> {
  const out = new Set<string>();
  walkWorkspace(ws, (n) => {
    if (n.kind === "tabs") for (const k of n.panelKeys) out.add(k);
  });
  return out;
}

/** Find the `TabsNode` containing a given panel key, anywhere in the workspace. */
export function findTabsForPanel(ws: Workspace, panelKey: string): TabsNode | null {
  let found: TabsNode | null = null;
  walkWorkspace(ws, (n) => {
    if (found) return;
    if (n.kind === "tabs" && n.panelKeys.includes(panelKey)) found = n;
  });
  return found;
}

/** Find a tabs node by id. */
export function findTabsById(
  ws: Workspace,
  id: string
): { node: TabsNode; root: "main" | string } | null {
  let result: { node: TabsNode; root: "main" | string } | null = null;
  const search = (n: LayoutNode, root: "main" | string): boolean => {
    if (n.kind === "tabs") {
      if (n.id === id) {
        result = { node: n, root };
        return true;
      }
      return false;
    }
    for (const c of n.children) if (search(c, root)) return true;
    return false;
  };
  if (search(ws.main, "main")) return result;
  for (const f of ws.floating) if (search(f.layout, f.id)) return result;
  return null;
}

/**
 * Remove a panel key from wherever it lives. Empty tabs nodes are removed
 * from their parent split; splits with a single remaining child collapse.
 * Returns the panel key (for chaining) or `null` if not found.
 */
export function removePanel(ws: Workspace, panelKey: string): string | null {
  const removeFrom = (root: LayoutNode): { newRoot: LayoutNode; removed: boolean } => {
    return _removePanelRec(root, panelKey);
  };
  const mainRes = removeFrom(ws.main);
  if (mainRes.removed) {
    ws.main = mainRes.newRoot;
    return panelKey;
  }
  for (let i = 0; i < ws.floating.length; i++) {
    const res = removeFrom(ws.floating[i].layout);
    if (res.removed) {
      ws.floating[i].layout = res.newRoot;
      if (isEmptyLayout(res.newRoot)) {
        ws.floating.splice(i, 1);
      }
      return panelKey;
    }
  }
  return null;
}

function _removePanelRec(
  node: LayoutNode,
  panelKey: string
): { newRoot: LayoutNode; removed: boolean } {
  if (node.kind === "tabs") {
    const idx = node.panelKeys.indexOf(panelKey);
    if (idx < 0) return { newRoot: node, removed: false };
    const newKeys = node.panelKeys.filter((k) => k !== panelKey);
    const newActive = Math.min(node.activeIdx, Math.max(0, newKeys.length - 1));
    return {
      newRoot: { ...node, panelKeys: newKeys, activeIdx: newActive },
      removed: true,
    };
  }
  for (let i = 0; i < node.children.length; i++) {
    const r = _removePanelRec(node.children[i], panelKey);
    if (!r.removed) continue;
    const newChildren = [...node.children];
    newChildren[i] = r.newRoot;
    const filtered: LayoutNode[] = [];
    const filteredSizes: number[] = [];
    newChildren.forEach((c, j) => {
      if (c.kind === "tabs" && c.panelKeys.length === 0) return;
      filtered.push(c);
      filteredSizes.push(node.sizes[j]);
    });
    if (filtered.length === 0) {
      return { newRoot: createTabs([]), removed: true };
    }
    if (filtered.length === 1) {
      return { newRoot: filtered[0], removed: true };
    }
    return {
      newRoot: { ...node, children: filtered, sizes: filteredSizes },
      removed: true,
    };
  }
  return { newRoot: node, removed: false };
}

export function isEmptyLayout(node: LayoutNode): boolean {
  if (node.kind === "tabs") return node.panelKeys.length === 0;
  return node.children.every(isEmptyLayout);
}

/** Drop locations for a tab being dragged onto another `TabsNode`. */
export type DropZone = "center" | "top" | "right" | "bottom" | "left";

/**
 * Add `panelKey` into the workspace at a drop target. Centre adds as a
 * sibling tab; edges create a new split. Caller must `removePanel` first.
 */
export function dropPanelOnTabs(
  ws: Workspace,
  panelKey: string,
  targetTabsId: string,
  zone: DropZone
): void {
  const insertInto = (root: LayoutNode): LayoutNode => _dropRec(root, panelKey, targetTabsId, zone);
  const beforeMain = JSON.stringify(ws.main);
  ws.main = insertInto(ws.main);
  if (JSON.stringify(ws.main) !== beforeMain) return;
  for (const f of ws.floating) {
    const before = JSON.stringify(f.layout);
    f.layout = insertInto(f.layout);
    if (JSON.stringify(f.layout) !== before) return;
  }
}

function _dropRec(
  node: LayoutNode,
  panelKey: string,
  targetId: string,
  zone: DropZone
): LayoutNode {
  if (node.kind === "tabs") {
    if (node.id !== targetId) return node;
    if (zone === "center") {
      const newKeys = [...node.panelKeys, panelKey];
      return { ...node, panelKeys: newKeys, activeIdx: newKeys.length - 1 };
    }
    // Edge drop — wrap target in a new split with a fresh single-tab group.
    const newTabs = createTabs([panelKey]);
    const direction: SplitDirection = zone === "left" || zone === "right" ? "row" : "col";
    const newFirst = zone === "left" || zone === "top" ? newTabs : node;
    const newSecond = zone === "left" || zone === "top" ? node : newTabs;
    return createSplit(direction, [newFirst, newSecond], [1, 1]);
  }
  let touched = false;
  const newChildren = node.children.map((c) => {
    const r = _dropRec(c, panelKey, targetId, zone);
    if (r !== c) touched = true;
    return r;
  });
  if (!touched) return node;
  return { ...node, children: newChildren };
}

/**
 * Add a panel into the workspace if not already present. Falls into the first
 * tabs node found in main; seeds a fresh root if none exists.
 */
export function ensurePanelInWorkspace(
  ws: Workspace,
  panelKey: string,
  fallbackZone: DropZone = "center"
): void {
  if (findTabsForPanel(ws, panelKey)) return;
  let target: TabsNode | null = null;
  walk(ws.main, (n) => {
    if (target) return;
    if (n.kind === "tabs") target = n;
  });
  if (!target) {
    ws.main = createTabs([panelKey]);
    return;
  }
  // TS closure narrowing requires a re-cast here.
  const t: TabsNode = target;
  dropPanelOnTabs(ws, panelKey, t.id, fallbackZone);
}

/**
 * Pop a panel out into a new floating window. Removes it from its current
 * location. Returns null if the panel wasn't found.
 */
export function detachPanelToFloating(
  ws: Workspace,
  panelKey: string,
  x: number,
  y: number,
  width = 360,
  height = 320
): FloatingWindow | null {
  if (!findTabsForPanel(ws, panelKey)) return null;
  removePanel(ws, panelKey);
  const fw: FloatingWindow = {
    id: nextId("f"),
    layout: createTabs([panelKey]),
    x,
    y,
    width,
    height,
  };
  ws.floating.push(fw);
  return fw;
}

/** Resize a split's children by adjusting one boundary (between idx and idx+1). */
export function resizeSplitChildren(
  split: SplitNode,
  idx: number,
  newFirstSize: number,
  newSecondSize: number
): void {
  if (idx < 0 || idx >= split.sizes.length - 1) return;
  split.sizes[idx] = newFirstSize;
  split.sizes[idx + 1] = newSecondSize;
}

/** `Workspace` is plain JSON — serialisation is trivial. */
export function serializeWorkspace(ws: Workspace): string {
  return JSON.stringify(ws);
}

export function deserializeWorkspace(raw: string): Workspace | null {
  try {
    const parsed = JSON.parse(raw) as Workspace;
    if (!parsed || !parsed.main) return null;
    // Re-stamp ids so future ops can find nodes by stable in-memory id.
    walk(parsed.main, (n) => {
      n.id = nextId(n.kind === "tabs" ? "t" : "s");
    });
    for (const f of parsed.floating ?? []) {
      walk(f.layout, (n) => {
        n.id = nextId(n.kind === "tabs" ? "t" : "s");
      });
      f.id = nextId("f");
    }
    if (!parsed.floating) parsed.floating = [];
    if (parsed.mainPoppedOut == null) parsed.mainPoppedOut = false;
    return parsed;
  } catch {
    return null;
  }
}
