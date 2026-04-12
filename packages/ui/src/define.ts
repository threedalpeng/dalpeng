import { createUINode, isRef, ref, type Ref, type RenderConfig, type UINode } from "@dalpeng/core";
import { requireUI } from "./context";
import type {
  BarOpts,
  BindingSource,
  FloatingOpts,
  ForOpts,
  MenuItem,
  RangeOpts,
  SelectOption,
  ShowOpts,
  SplitOpts,
  TabsOpts,
  TextOpts,
  UIChild,
} from "./types";

export function defineUI(setup: () => UIChild[]): () => UINode;
export function defineUI<P>(setup: (props: P) => UIChild[]): (props: P) => UINode;
export function defineUI<P = void>(setup: (props?: P) => UIChild[]) {
  return ((props?: P) => createUINode(setup as any, props as any)) as any;
}

export function Text(content: string, opts?: TextOpts): UIChild;
export function Text<T>(source: Ref<T>, formatter: (v: T) => string, opts?: TextOpts): UIChild;
export function Text(
  contentOrSource: string | Ref<any>,
  formatterOrOpts?: any,
  opts?: TextOpts
): UIChild {
  if (typeof contentOrSource === "string") {
    return { type: "text", content: contentOrSource, opts: formatterOrOpts };
  }
  return { type: "text", content: contentOrSource, formatter: formatterOrOpts, opts };
}

export function Bar(opts: BarOpts): UIChild;
export function Bar<T>(source: Ref<T>, formatter: (v: T) => number, opts: BarOpts): UIChild;
export function Bar(sourceOrOpts: Ref<any> | BarOpts, formatter?: any, opts?: BarOpts): UIChild {
  if (isRef(sourceOrOpts)) {
    return { type: "bar", source: sourceOrOpts, formatter, opts: opts! };
  }
  return { type: "bar", opts: sourceOrOpts as BarOpts };
}

export function Html(content: string): UIChild {
  return { type: "html", content };
}

export function Toggle(value: Ref<boolean>, label: string): UIChild;
export function Toggle(featureKey: string, label: string): UIChild;
export function Toggle(valueOrKey: Ref<boolean> | string, label: string): UIChild {
  const source: BindingSource<boolean> = isRef(valueOrKey)
    ? { kind: "ref", ref: valueOrKey }
    : { kind: "feature", key: valueOrKey };
  return { type: "toggle", source, label };
}

export function Range(value: Ref<number>, label: string, opts: RangeOpts): UIChild;
export function Range(featureKey: string, label: string, opts: RangeOpts): UIChild;
export function Range(valueOrKey: Ref<number> | string, label: string, opts: RangeOpts): UIChild {
  const source: BindingSource<number> = isRef(valueOrKey)
    ? { kind: "ref", ref: valueOrKey }
    : { kind: "feature", key: valueOrKey };
  return { type: "range", source, label, opts };
}

export function Select(value: Ref<string>, label: string, options: SelectOption[]): UIChild;
export function Select(featureKey: string, label: string, options: SelectOption[]): UIChild;
export function Select(
  valueOrKey: Ref<string> | string,
  label: string,
  options: SelectOption[]
): UIChild {
  const source: BindingSource<string> = isRef(valueOrKey)
    ? { kind: "ref", ref: valueOrKey }
    : { kind: "feature", key: valueOrKey };
  return { type: "select", source, label, options };
}

export function Button(label: string, onClick: () => void): UIChild {
  return { type: "button", label, onClick };
}

export function Value(label: string, content: string | Ref<string>): UIChild {
  return { type: "value", label, content };
}

// useFeature creates a Ref<T> tagged for the mount system to wire two-way
// to app.features[key]. The actual binding is set up by the domRenderer.
export function useFeature<K extends keyof RenderConfig>(key: K): Ref<RenderConfig[K]> {
  const r = ref(undefined as any) as Ref<RenderConfig[K]>;
  (r as any)._featureKey = key;
  return r;
}

export function Menu(items: MenuItem[], onSelect: (item: MenuItem) => void): UIChild {
  const focusIndex = ref(0);
  return { type: "menu", items, onSelect, focusIndex };
}

export function List<T>(items: T[], renderItem: (item: T, index: number) => UIChild): UIChild {
  return { type: "list", children: items.map((item, i) => renderItem(item, i)) };
}

export function Split(opts: SplitOpts): UIChild {
  return { type: "split", opts };
}

export function Tabs(opts: TabsOpts): UIChild {
  return { type: "tabs", opts };
}

export function For<T>(opts: ForOpts<T>): UIChild {
  return { type: "for", opts };
}

export function Show(opts: ShowOpts): UIChild {
  return { type: "show", opts };
}

export function Floating(opts: FloatingOpts): UIChild {
  return { type: "floating", opts };
}

export type { TabSpec } from "./types";

export function useLayout(
  direction: "row" | "column",
  opts?: { gap?: number; align?: string }
): void {
  const ctx = requireUI("useLayout");
  ctx.layout.direction = direction;
  if (opts?.gap !== undefined) ctx.layout.gap = opts.gap;
  if (opts?.align !== undefined) ctx.layout.align = opts.align;
}

import type { Placement } from "./placement";

// Last write wins — there is only one placement per UI mount.
export function usePlacement(placement: Placement): void {
  const ctx = requireUI("usePlacement");
  ctx.placement = placement;
}

// The layer name must exist in the app's layer registry by mount time.
// Validation is deferred to mount because UIs are authored before being attached to an app.
// Last write wins.
export function withLayer(name: string): void {
  const ctx = requireUI("withLayer");
  ctx.layer = name;
}
