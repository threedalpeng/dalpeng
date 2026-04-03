import type { Ref } from "../reactive";

// ─── Binding Source ─────────────────────────────────────────────────────────
// Controls can bind to either a Ref directly or a feature key (resolved at mount time)
export type BindingSource<T> =
  | { kind: "ref"; ref: Ref<T> }
  | { kind: "feature"; key: string };

// ─── Option Types ───────────────────────────────────────────────────────────
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

// ─── Unified NodeDescriptor ─────────────────────────────────────────────────
// Single discriminated union covering display + interactive atoms
export type NodeDescriptor =
  // Display atoms
  | { type: "text"; content: string | Ref<any>; formatter?: (v: any) => string; opts?: TextOpts }
  | { type: "bar"; source?: Ref<any>; formatter?: (v: any) => number; opts: BarOpts }
  | { type: "html"; content: string }
  // Interactive atoms
  | { type: "toggle"; source: BindingSource<boolean>; label: string }
  | { type: "range"; source: BindingSource<number>; label: string; opts: RangeOpts }
  | { type: "select"; source: BindingSource<string>; label: string; options: SelectOption[] }
  | { type: "button"; label: string; onClick: () => void }
  | { type: "value"; label: string; content: string | Ref<string> }
  // Composite
  | { type: "ui"; template: UITemplate };

// ─── UITemplate ─────────────────────────────────────────────────────────────
export interface UITemplate {
  _setup: () => NodeDescriptor[];
  _layout?: { direction: "column" | "row"; gap: number; align?: string };
}

// ─── UIHandle ───────────────────────────────────────────────────────────────
export interface UIHandle {
  destroy(): void;
}

// ─── SlotPosition ───────────────────────────────────────────────────────────
export type SlotPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
