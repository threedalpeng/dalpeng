import type { RenderConfig } from "@dalpeng/core";
import type { Ref } from "../reactive";
import { ref, isRef } from "../reactive";
import { requireUI, getThisUI, setThisUI, beginCleanupScope, endCleanupScope } from "../context";
import type { NodeDescriptor, UITemplate, TextOpts, BarOpts, RangeOpts, SelectOption, BindingSource } from "./types";

// ============================================================================
// Container definition
// ============================================================================

export function defineUI(setup: () => NodeDescriptor[]): UITemplate;
export function defineUI<P>(setup: (props: P) => NodeDescriptor[]): (props: P) => UITemplate;
export function defineUI<P = void>(setup: (props?: P) => NodeDescriptor[]) {
  const factory = (props?: P): UITemplate => {
    let capturedLayout: { direction: "column" | "row"; gap: number; align?: string } | undefined;
    let capturedNodes: NodeDescriptor[] = [];

    return {
      _setup() {
        const prevUI = getThisUI();
        const ctx = { nodes: [] as NodeDescriptor[], layout: { direction: "column" as const, gap: 4 } };
        setThisUI(ctx);
        const cleanups = beginCleanupScope();
        try {
          capturedNodes = setup(props as P);
          capturedLayout = { ...ctx.layout };
        } finally {
          endCleanupScope();
          setThisUI(prevUI);
        }
        // Store cleanup info on the template (domRenderer will wire it up)
        (this as any)._cleanups = cleanups;
        return capturedNodes;
      },
      get _layout() {
        return capturedLayout;
      },
    };
  };

  return (setup.length === 0 ? factory() : factory) as any;
}

// ============================================================================
// Display atoms
// ============================================================================

// defineText — static string or reactive Ref
export function defineText(content: string, opts?: TextOpts): NodeDescriptor;
export function defineText<T>(source: Ref<T>, formatter: (v: T) => string, opts?: TextOpts): NodeDescriptor;
export function defineText(contentOrSource: string | Ref<any>, formatterOrOpts?: any, opts?: TextOpts): NodeDescriptor {
  if (typeof contentOrSource === "string") {
    return { type: "text", content: contentOrSource, opts: formatterOrOpts };
  }
  return { type: "text", content: contentOrSource, formatter: formatterOrOpts, opts };
}

// defineBar — static or reactive bar
export function defineBar(opts: BarOpts): NodeDescriptor;
export function defineBar<T>(source: Ref<T>, formatter: (v: T) => number, opts: BarOpts): NodeDescriptor;
export function defineBar(sourceOrOpts: Ref<any> | BarOpts, formatter?: any, opts?: BarOpts): NodeDescriptor {
  if (isRef(sourceOrOpts)) {
    return { type: "bar", source: sourceOrOpts, formatter, opts: opts! };
  }
  return { type: "bar", opts: sourceOrOpts as BarOpts };
}

// defineHtml — raw HTML escape hatch
export function defineHtml(content: string): NodeDescriptor {
  return { type: "html", content };
}

// ============================================================================
// Interactive atoms — each with Ref | featureKey overload
// ============================================================================

// defineToggle
export function defineToggle(value: Ref<boolean>, label: string): NodeDescriptor;
export function defineToggle(featureKey: string, label: string): NodeDescriptor;
export function defineToggle(valueOrKey: Ref<boolean> | string, label: string): NodeDescriptor {
  const source: BindingSource<boolean> = isRef(valueOrKey)
    ? { kind: "ref", ref: valueOrKey }
    : { kind: "feature", key: valueOrKey };
  return { type: "toggle", source, label };
}

// defineRange
export function defineRange(value: Ref<number>, label: string, opts: RangeOpts): NodeDescriptor;
export function defineRange(featureKey: string, label: string, opts: RangeOpts): NodeDescriptor;
export function defineRange(valueOrKey: Ref<number> | string, label: string, opts: RangeOpts): NodeDescriptor {
  const source: BindingSource<number> = isRef(valueOrKey)
    ? { kind: "ref", ref: valueOrKey }
    : { kind: "feature", key: valueOrKey };
  return { type: "range", source, label, opts };
}

// defineSelect
export function defineSelect(value: Ref<string>, label: string, options: SelectOption[]): NodeDescriptor;
export function defineSelect(featureKey: string, label: string, options: SelectOption[]): NodeDescriptor;
export function defineSelect(valueOrKey: Ref<string> | string, label: string, options: SelectOption[]): NodeDescriptor {
  const source: BindingSource<string> = isRef(valueOrKey)
    ? { kind: "ref", ref: valueOrKey }
    : { kind: "feature", key: valueOrKey };
  return { type: "select", source, label, options };
}

// defineButton
export function defineButton(label: string, onClick: () => void): NodeDescriptor {
  return { type: "button", label, onClick };
}

// defineValue — read-only display
export function defineValue(label: string, content: string | Ref<string>): NodeDescriptor {
  return { type: "value", label, content };
}

// ============================================================================
// Logic composables
// ============================================================================

// useFeature — creates a Ref that stays in sync with app.features[key]
// This is resolved at render/mount time by the domRenderer, not here.
// For use in defineUI setup, it returns a Ref<T> that will be wired up.
export function useFeature<K extends keyof RenderConfig>(key: K): Ref<RenderConfig[K]> {
  // Placeholder — the actual two-way binding is set up by the mount system
  // which has access to app.watchFeature. Here we just create a ref
  // that the mount system will sync.
  const r = ref(undefined as any) as Ref<RenderConfig[K]>;
  (r as any)._featureKey = key; // tag for mount system to resolve
  return r;
}

// useLayout — sets layout on current UI context
export function useLayout(
  direction: "row" | "column",
  opts?: { gap?: number; align?: string }
): void {
  const ctx = requireUI("useLayout");
  ctx.layout.direction = direction;
  if (opts?.gap !== undefined) ctx.layout.gap = opts.gap;
  if (opts?.align !== undefined) ctx.layout.align = opts.align;
}
