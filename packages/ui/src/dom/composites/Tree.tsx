import { ref, watch, type ReadonlyRef } from "@dalpeng/core";
import { defineComponent, type Child, type UIElement } from "../../core/element";

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  /** Icon / badge in the leading slot (before label). */
  leading?: Child;
  /** Value / icon in the trailing slot (after label). */
  trailing?: Child;
  /** Disable pointer events and focus skipping. */
  disabled?: boolean;
}

export interface TreeProps {
  nodes: TreeNode[] | ReadonlyRef<TreeNode[]>;
  /** Controlled selection — id of the selected node, or null. */
  selected?: ReadonlyRef<string | null>;
  /** Controlled expansion — set of expanded node ids. */
  expanded?: ReadonlyRef<Set<string>>;
  onSelect?: (id: string) => void;
  onToggle?: (id: string, next: boolean) => void;
  /** Initial expand-all override for uncontrolled mode. */
  defaultExpanded?: boolean;
  density?: "compact" | "comfortable";
}

/**
 * Vertical hierarchy with expand/collapse + keyboard navigation
 * (↑/↓ move, →/← expand/collapse, Enter selects). Controlled via
 * `selected` / `expanded` Refs, or internal state when omitted.
 *
 * Does NOT virtualize — suitable for O(100s) nodes. For larger trees use
 * For with a flattened visible-row list.
 */
export const Tree = defineComponent<TreeProps>((props): UIElement => {
  const internalExpanded = ref<Set<string>>(
    buildDefaultExpanded(readNodes(props.nodes), props.defaultExpanded ?? false)
  );
  const internalSelected = ref<string | null>(null);
  const focused = ref<string | null>(null);

  const expanded = props.expanded ?? internalExpanded;
  const selected = props.selected ?? internalSelected;

  const toggle = (id: string): void => {
    const current = expanded.value;
    const next = new Set(current);
    const nowExpanded = !next.has(id);
    if (nowExpanded) next.add(id);
    else next.delete(id);
    if (!props.expanded) internalExpanded.value = next;
    props.onToggle?.(id, nowExpanded);
  };

  const select = (id: string): void => {
    if (!props.selected) internalSelected.value = id;
    props.onSelect?.(id);
  };

  const onKey = (e: KeyboardEvent, flat: FlatNode[]): void => {
    const fid = focused.value ?? selected.value;
    const idx = fid ? flat.findIndex((n) => n.node.id === fid) : -1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (idx < flat.length - 1) focused.value = flat[idx + 1].node.id;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx > 0) focused.value = flat[idx - 1].node.id;
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const fn = idx >= 0 ? flat[idx] : null;
      if (fn && fn.hasChildren && !expanded.value.has(fn.node.id)) toggle(fn.node.id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const fn = idx >= 0 ? flat[idx] : null;
      if (fn && fn.hasChildren && expanded.value.has(fn.node.id)) toggle(fn.node.id);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const fn = idx >= 0 ? flat[idx] : null;
      if (fn && !fn.node.disabled) select(fn.node.id);
    }
  };

  return (
    <div
      role="tree"
      tabIndex={0}
      ref={(el) => {
        const root = el as HTMLElement;
        let disposeRows: () => void = () => {};
        const rebuild = (): void => {
          disposeRows();
          const nodes = readNodes(props.nodes);
          const flat = flatten(nodes, expanded.value);
          disposeRows = renderRows(root, flat, {
            selected,
            focused,
            density: props.density ?? "compact",
            onRowClick: (id) => {
              focused.value = id;
              select(id);
            },
            onToggleClick: (id) => toggle(id),
          });
        };
        rebuild();

        const unwatchNodes = Array.isArray(props.nodes)
          ? () => {}
          : watch(props.nodes, rebuild, { immediate: false });
        const unwatchExp = watch(expanded, rebuild, { immediate: false });

        const keyHandler = (e: KeyboardEvent): void => {
          const flat = flatten(readNodes(props.nodes), expanded.value);
          onKey(e, flat);
        };
        root.addEventListener("keydown", keyHandler);

        return () => {
          root.removeEventListener("keydown", keyHandler);
          unwatchNodes();
          unwatchExp();
          disposeRows();
        };
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        outline: "none",
        overflow: "auto",
        paddingY: "$spacing.xs",
      }}
    />
  );
});

// ─── internals ─────────────────────────────────────────────────────────────

interface FlatNode {
  node: TreeNode;
  depth: number;
  hasChildren: boolean;
}

function readNodes(source: TreeProps["nodes"]): TreeNode[] {
  return Array.isArray(source) ? source : source.value;
}

function buildDefaultExpanded(nodes: TreeNode[], allExpanded: boolean): Set<string> {
  const out = new Set<string>();
  if (!allExpanded) return out;
  const walk = (ns: TreeNode[]): void => {
    for (const n of ns) {
      if (n.children && n.children.length > 0) {
        out.add(n.id);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return out;
}

function flatten(nodes: TreeNode[], expanded: Set<string>, depth = 0): FlatNode[] {
  const out: FlatNode[] = [];
  for (const node of nodes) {
    const hasChildren = !!node.children && node.children.length > 0;
    out.push({ node, depth, hasChildren });
    if (hasChildren && expanded.has(node.id)) {
      out.push(...flatten(node.children!, expanded, depth + 1));
    }
  }
  return out;
}

interface RenderOpts {
  selected: ReadonlyRef<string | null>;
  focused: ReadonlyRef<string | null>;
  density: "compact" | "comfortable";
  onRowClick: (id: string, flat: FlatNode[]) => void;
  onToggleClick: (id: string) => void;
}

function renderRows(root: HTMLElement, flat: FlatNode[], opts: RenderOpts): () => void {
  // Clear prior rows.
  while (root.firstChild) root.removeChild(root.firstChild);

  const doc = root.ownerDocument;
  const cleanups: Array<() => void> = [];
  const rowHeight = opts.density === "compact" ? 22 : 28;

  for (const { node, depth, hasChildren } of flat) {
    const row = doc.createElement("div");
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-level", String(depth + 1));
    row.dataset.nodeId = node.id;
    row.style.cssText = [
      "display:flex",
      "align-items:center",
      "gap:4px",
      `padding-left:${8 + depth * 12}px`,
      "padding-right:8px",
      `min-height:${rowHeight}px`,
      "cursor:" + (node.disabled ? "not-allowed" : "pointer"),
      "user-select:none",
      `opacity:${node.disabled ? 0.5 : 1}`,
      "font-size:var(--ui-font-size-sm)",
      "color:var(--ui-color-text-primary)",
      "border-radius:var(--ui-radius-sm)",
    ].join(";");

    const caret = doc.createElement("span");
    caret.style.cssText = [
      "display:inline-block",
      "width:12px",
      "text-align:center",
      "font-size:10px",
      "opacity:" + (hasChildren ? 1 : 0),
      "transition:transform var(--ui-motion-duration-fast) var(--ui-motion-easing-standard)",
    ].join(";");
    caret.textContent = "▸";
    if (hasChildren) {
      caret.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        opts.onToggleClick(node.id);
      });
    }
    row.appendChild(caret);

    if (node.leading != null) {
      const lead = doc.createElement("span");
      lead.style.cssText = "display:inline-flex;align-items:center;flex-shrink:0";
      if (typeof node.leading === "string" || typeof node.leading === "number") {
        lead.textContent = String(node.leading);
      }
      row.appendChild(lead);
    }

    const label = doc.createElement("span");
    label.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    label.textContent = node.label;
    row.appendChild(label);

    if (node.trailing != null) {
      const trail = doc.createElement("span");
      trail.style.cssText = "display:inline-flex;align-items:center;flex-shrink:0";
      if (typeof node.trailing === "string" || typeof node.trailing === "number") {
        trail.textContent = String(node.trailing);
      }
      row.appendChild(trail);
    }

    const onClick = (): void => {
      if (node.disabled) return;
      opts.onRowClick(node.id, flat);
    };
    row.addEventListener("click", onClick);
    cleanups.push(() => row.removeEventListener("click", onClick));

    root.appendChild(row);
  }

  // Reflect selected / focused state via per-row decoration.
  const applyDecor = (): void => {
    const sel = opts.selected.value;
    const foc = opts.focused.value;
    for (const child of Array.from(root.children)) {
      const el = child as HTMLElement;
      const id = el.dataset.nodeId;
      if (!id) continue;
      const isSelected = id === sel;
      const isFocused = id === foc;
      el.style.background = isSelected ? "var(--ui-color-primary-muted)" : "transparent";
      el.style.color = isSelected ? "var(--ui-color-primary-text)" : "var(--ui-color-text-primary)";
      el.style.outline = isFocused ? "1px solid var(--ui-color-primary-border)" : "none";
    }
  };
  applyDecor();
  cleanups.push(watch(opts.selected, applyDecor));
  cleanups.push(watch(opts.focused, applyDecor));

  // Animate caret direction based on expanded state — re-triggered on rebuild.
  for (const { node, hasChildren } of flat) {
    if (!hasChildren) continue;
    const row = root.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`) as HTMLElement | null;
    if (!row) continue;
    const caret = row.firstChild as HTMLElement;
    // Expansion state captured at flatten time — caret points down when visible children follow in flat.
    const idx = flat.findIndex((f) => f.node.id === node.id);
    const next = flat[idx + 1];
    const isOpen = !!next && next.depth > flat[idx].depth;
    caret.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
  }

  return () => {
    for (const c of cleanups) c();
  };
}
