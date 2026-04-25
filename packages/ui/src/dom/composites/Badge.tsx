import type { ReadonlyRef } from "@dalpeng/core";
import { defineWidget, type UIElement } from "../../core/element";

export type BadgeRole =
  | "primary"
  | "accent"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";
export type BadgeVariant = "solid" | "subtle" | "outline";

export interface BadgeProps {
  label: string | ReadonlyRef<string>;
  role?: BadgeRole;
  variant?: BadgeVariant;
  title?: string;
}

/**
 * Inline status pill. Reads role colors from theme tokens so theme swap
 * propagates automatically via CSS cascade.
 *
 * - `solid`   — role.bg  / role.fg          (strong emphasis)
 * - `subtle`  — role.muted / role.text      (default for counts/labels)
 * - `outline` — transparent / role.border / role.text
 */
export const Badge = defineWidget<BadgeProps>((props): UIElement => {
  const role: BadgeRole = props.role ?? "neutral";
  const variant: BadgeVariant = props.variant ?? "subtle";
  return (
    <span title={props.title} style={badgeStyle(role, variant)}>
      {props.label}
    </span>
  );
});

function badgeStyle(role: BadgeRole, variant: BadgeVariant) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "$spacing.xs",
    paddingX: "$spacing.sm",
    paddingY: "$spacing.xs",
    borderRadius: "$radius.full",
    fontSize: "$font.size.xs",
    fontWeight: "$font.weight.medium",
    lineHeight: 1,
    whiteSpace: "nowrap" as const,
  };
  switch (variant) {
    case "solid":
      return {
        ...base,
        background: `$color.${role}.bg`,
        color: `$color.${role}.fg`,
      };
    case "outline":
      return {
        ...base,
        background: "$color.transparent",
        color: `$color.${role}.text`,
        border: `1px solid`,
        borderColor: `$color.${role}.border`,
      };
    case "subtle":
    default:
      return {
        ...base,
        background: `$color.${role}.muted`,
        color: `$color.${role}.text`,
      };
  }
}
