import { computed, isRef, type ReadonlyRef } from "@dalpeng/core";
import type { UIElement } from "../../core/element";
import type { Style } from "../../core/style";

export interface TextOpts {
  size?: number | string;
  color?: string;
  bold?: boolean;
  align?: string;
}

export function Text(content: string | number, opts?: TextOpts): UIElement;
export function Text(source: ReadonlyRef<string | number>, opts?: TextOpts): UIElement;
export function Text<T>(
  source: ReadonlyRef<T>,
  formatter: (v: T) => string,
  opts?: TextOpts
): UIElement;
export function Text(
  contentOrSource: string | number | ReadonlyRef<unknown>,
  formatterOrOpts?: ((v: unknown) => string) | TextOpts,
  opts?: TextOpts
): UIElement {
  // (Ref, formatter, opts?) overload — wrap source in computed to project to text.
  if (isRef(contentOrSource) && typeof formatterOrOpts === "function") {
    const source = contentOrSource as ReadonlyRef<unknown>;
    const fmt = formatterOrOpts as (v: unknown) => string;
    const projected = computed(() => fmt(source.value));
    const props = toProps(opts);
    return props ? <span style={props.style}>{projected}</span> : <span>{projected}</span>;
  }
  // (content, opts?) — content is string / number / Ref<string|number>.
  const textOpts = typeof formatterOrOpts === "object" ? formatterOrOpts : undefined;
  const props = toProps(textOpts);
  return props ? (
    <span style={props.style}>
      {contentOrSource as string | number | ReadonlyRef<string | number>}
    </span>
  ) : (
    <span>{contentOrSource as string | number | ReadonlyRef<string | number>}</span>
  );
}

function toProps(opts?: TextOpts): { style?: Style } | null {
  if (!opts) return null;
  const style: Style = {};
  if (opts.size !== undefined) style.fontSize = opts.size;
  if (opts.color !== undefined) style.color = opts.color;
  if (opts.bold) style.fontWeight = 700;
  if (opts.align !== undefined) style.textAlign = opts.align;
  return Object.keys(style).length > 0 ? { style } : null;
}
