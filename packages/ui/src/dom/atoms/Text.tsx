import { computed, isRef, type ReadonlyRef } from "@dalpeng/core";
import { defineWidget, type UIElement } from "../../core/element";
import type { Style } from "../../core/style";

export interface TextProps<T = string | number> {
  /** Raw value or reactive Ref. Supports string/number when no `format` is provided; any Ref<T> with `format`. */
  value: T | ReadonlyRef<T>;
  /** Transform a Ref<T> into display string. Required when T is not string/number. */
  format?: (v: T) => string;
  size?: number | string;
  color?: string;
  bold?: boolean;
  align?: string;
}

export const Text = defineWidget<TextProps<unknown>>(
  ({ value, format, size, color, bold, align }): UIElement => {
    const style: Style = {};
    if (size !== undefined) style.fontSize = size;
    if (color !== undefined) style.color = color;
    if (bold) style.fontWeight = 700;
    if (align !== undefined) style.textAlign = align;

    // Ref<T> + format → computed(fmt(value)) — lets <Text value={ref} format={fn} /> project non-text Refs.
    if (isRef(value) && typeof format === "function") {
      const projected = computed(() =>
        (format as (v: unknown) => string)((value as ReadonlyRef<unknown>).value)
      );
      return <span style={style}>{projected}</span>;
    }
    // Value is primitive or Ref<string|number> — render directly.
    return <span style={style}>{value as string | number | ReadonlyRef<string | number>}</span>;
  }
) as <T = string | number>(props: TextProps<T>) => UIElement;
