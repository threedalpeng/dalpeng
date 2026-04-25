import { defineWidget, type Child, type UIElement } from "../../core/element";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonVariant = "ghost" | "subtle" | "solid";

export interface IconButtonProps {
  onClick: () => void;
  title?: string;
  label?: string;
  disabled?: boolean;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  children?: Child;
}

const SIZE_PX: Record<IconButtonSize, number> = { sm: 20, md: 28, lg: 36 };
const ICON_SIZE: Record<IconButtonSize, string> = {
  sm: "$font.size.sm",
  md: "$font.size.md",
  lg: "$font.size.lg",
};

/**
 * Square icon-first button. Accessible label via `label` (aria-label) or
 * `title`. Children render as the icon slot (text glyph, inline SVG, etc).
 */
export const IconButton = defineWidget<IconButtonProps>((props): UIElement => {
  const size = props.size ?? "md";
  const variant = props.variant ?? "ghost";
  const dim = SIZE_PX[size];
  return (
    <button
      type="button"
      aria-label={props.label ?? props.title}
      title={props.title}
      disabled={props.disabled ?? false}
      onClick={props.onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        padding: 0,
        border: variant === "subtle" || variant === "solid" ? "0" : "1px solid transparent",
        borderRadius: "$radius.md",
        background: variantBg(variant),
        color: variantFg(variant),
        cursor: props.disabled ? "not-allowed" : "pointer",
        fontSize: ICON_SIZE[size],
        fontFamily: "inherit",
        lineHeight: 1,
        opacity: props.disabled ? 0.5 : 1,
        transition: "background var(--ui-motion-duration-fast) var(--ui-motion-easing-standard)",
      }}
    >
      {props.children}
    </button>
  );
});

function variantBg(v: IconButtonVariant): string {
  if (v === "solid") return "$color.primary.bg";
  if (v === "subtle") return "$color.neutral.muted";
  return "$color.transparent";
}

function variantFg(v: IconButtonVariant): string {
  if (v === "solid") return "$color.primary.fg";
  return "$color.text.primary";
}
