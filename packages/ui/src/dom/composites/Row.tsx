import type { ReadonlyRef } from "@dalpeng/core";
import { defineComponent, h, type Child, type UIElement } from "../../core/element";

export interface RowProps {
  /** Left slot — icon, checkbox, avatar. */
  leading?: Child;
  /** Main content — label or any node. */
  children?: Child;
  /** Right slot — badge, chevron, value. */
  trailing?: Child;
  /** Secondary line under main content (muted). */
  subtitle?: string | ReadonlyRef<string>;
  /** Highlight the row (current selection / hover target). */
  selected?: boolean | ReadonlyRef<boolean>;
  onClick?: () => void;
  density?: "compact" | "comfortable";
}

/**
 * One-line list row with leading / content / trailing slots. Used by
 * DevTools scene tree entries, dialogue choice lists, inspector rows.
 */
export const Row = defineComponent<RowProps>((props): UIElement => {
  const density = props.density ?? "compact";
  const paddingY = density === "compact" ? "$spacing.xs" : "$spacing.sm";
  const paddingX = "$spacing.sm";

  const content = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        flex: 1,
      },
    },
    h(
      "div",
      {
        style: {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "$font.size.sm",
          color: "$color.text.primary",
        },
      },
      props.children
    ),
    props.subtitle
      ? h(
          "div",
          {
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "$font.size.xs",
              color: "$color.text.secondary",
            },
          },
          props.subtitle
        )
      : null
  );

  return h(
    "div",
    {
      onClick: props.onClick,
      role: props.onClick ? "button" : undefined,
      tabIndex: props.onClick ? 0 : undefined,
      style: {
        display: "flex",
        alignItems: "center",
        gap: "$spacing.sm",
        paddingX,
        paddingY,
        background: props.selected ? "$color.primary.muted" : "$color.transparent",
        color: props.selected ? "$color.primary.text" : "$color.text.primary",
        borderRadius: "$radius.sm",
        cursor: props.onClick ? "pointer" : "default",
        minHeight: density === "compact" ? 24 : 32,
      },
    },
    props.leading ? h("div", { style: { display: "flex", flexShrink: 0 } }, props.leading) : null,
    content,
    props.trailing ? h("div", { style: { display: "flex", flexShrink: 0 } }, props.trailing) : null
  );
});
