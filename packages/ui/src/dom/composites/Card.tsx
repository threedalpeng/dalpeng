import { defineComponent, h, type Child, type UIElement } from "../../core/element";

export type CardElevation = "flat" | "raised" | "high";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  elevation?: CardElevation;
  padding?: CardPadding;
  interactive?: boolean;
  onClick?: () => void;
  children?: Child;
}

/**
 * Surface container. `elevation` picks the surface tier token; `padding`
 * picks an inner spacing scale. Keep role-neutral — for branded highlights
 * use Badge / Section / IconButton on top of a Card.
 */
export const Card = defineComponent<CardProps>((props): UIElement => {
  const elevation = props.elevation ?? "raised";
  const padding = props.padding ?? "md";
  return h(
    "div",
    {
      onClick: props.onClick,
      style: {
        background: surfaceToken(elevation),
        border: `1px solid`,
        borderColor: "$color.neutral.border",
        borderRadius: "$radius.lg",
        padding: paddingToken(padding),
        boxShadow: elevation === "high" ? "$shadow.md" : "$shadow.none",
        cursor: props.interactive ? "pointer" : "default",
        transition: props.interactive
          ? "background var(--ui-motion-duration-fast) var(--ui-motion-easing-standard)"
          : undefined,
      },
    },
    props.children
  );
});

function surfaceToken(e: CardElevation): string {
  if (e === "flat") return "$color.surface.low";
  if (e === "high") return "$color.surface.high";
  return "$color.surface.base";
}

function paddingToken(p: CardPadding): string | number {
  if (p === "none") return 0;
  return `$spacing.${p}`;
}
