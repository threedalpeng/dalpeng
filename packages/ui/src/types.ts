import type { ReadonlyRef, Ref, UINode } from "@dalpeng/core";

export type BindingSource<T> = { kind: "ref"; ref: Ref<T> } | { kind: "feature"; key: string };

export interface TextOpts {
  size?: number;
  color?: string;
  bold?: boolean;
  align?: string;
}

export interface BarOpts {
  width: number;
  height: number;
  radius?: number;
  color?: string | ((v: number) => string);
  bgColor?: string;
}

export interface RangeOpts {
  min: number;
  max: number;
  step?: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface MenuItem {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SplitOpts {
  direction: "row" | "col";
  /** Reactive size weights — one entry per child slot. Proportional; renderer normalises to fill parent. */
  sizes: Ref<number[]>;
  slots: UINode[];
}

export interface TabSpec {
  id: string;
  title: string;
  body: UINode;
}

export interface TabsOpts {
  tabs: ReadonlyRef<TabSpec[]>;
  active: Ref<number>;
  /**
   * Optional drag callback — fires when the user starts dragging a tab.
   * The host frame wires this to its DnD orchestrator.
   */
  onDragStart?: (tabId: string, ev: MouseEvent) => void;
  /**
   * Optional `data-*` attributes applied to the tabs root element.
   * Used by drop-zone hit-testing to identify which tabs node the cursor is over.
   */
  dataAttrs?: Record<string, string>;
}

export interface ForOpts<T> {
  items: ReadonlyRef<readonly T[]>;
  render: (item: T, idx: number) => UINode;
  empty?: UINode;
}

export interface ShowOpts {
  when: ReadonlyRef<boolean>;
  body: UINode;
  fallback?: UINode;
}

export interface FloatingOpts {
  body: UINode;
  visible: Ref<boolean>;
  x: number | Ref<number>;
  y: number | Ref<number>;
  width?: number | Ref<number>;
  height?: number | Ref<number>;
  /** Close on click outside. Default true. */
  closeOnOutside?: boolean;
  /** Close on Escape. Default true. */
  closeOnEsc?: boolean;
}

export type UIChild =
  | { type: "text"; content: string | Ref<any>; formatter?: (v: any) => string; opts?: TextOpts }
  | { type: "bar"; source?: Ref<any>; formatter?: (v: any) => number; opts: BarOpts }
  | { type: "html"; content: string }
  | { type: "toggle"; source: BindingSource<boolean>; label: string }
  | { type: "range"; source: BindingSource<number>; label: string; opts: RangeOpts }
  | { type: "select"; source: BindingSource<string>; label: string; options: SelectOption[] }
  | { type: "button"; label: string; onClick: () => void }
  | { type: "value"; label: string; content: string | Ref<string> }
  | { type: "ui"; descriptor: UINode }
  | { type: "menu"; items: MenuItem[]; onSelect: (item: MenuItem) => void; focusIndex: Ref<number> }
  | { type: "list"; children: UIChild[] }
  | { type: "split"; opts: SplitOpts }
  | { type: "tabs"; opts: TabsOpts }
  | { type: "for"; opts: ForOpts<any> }
  | { type: "show"; opts: ShowOpts }
  | { type: "floating"; opts: FloatingOpts }
  | { type: "live"; element: HTMLElement; cleanups?: Set<() => void> };
