import { ref, watch, type ReadonlyRef } from "@dalpeng/core";
import { defineComponent, h, type Child, type UIElement } from "../../core/element";

export interface SectionProps {
  title: string | ReadonlyRef<string>;
  /** Controlled-collapsed state. If omitted, Section manages its own state. */
  collapsed?: ReadonlyRef<boolean>;
  /** Default open state when uncontrolled. */
  defaultCollapsed?: boolean;
  /** Called when user toggles header. Consumers that pass `collapsed` must handle this. */
  onToggle?: (collapsed: boolean) => void;
  /** Right-aligned content in the header (controls, badge, etc). */
  actions?: Child;
  children?: Child;
}

/**
 * Named container with a collapsible body. Used by DevTools panels to group
 * related controls (e.g. "Cameras" / "Lights" in scene panel).
 *
 * Controlled + uncontrolled — pass `collapsed` Ref for external state, or
 * rely on internal state via `defaultCollapsed`.
 */
export const Section = defineComponent<SectionProps>((props): UIElement => {
  const internal = ref(props.defaultCollapsed ?? false);
  const state = props.collapsed ?? internal;

  const onHeaderClick = (): void => {
    const next = !state.value;
    if (!props.collapsed) internal.value = next;
    props.onToggle?.(next);
  };

  // Body visibility mirrors state. Caveat: children render regardless —
  // collapsing hides but keeps DOM. For heavy subtrees use <Show> inside.
  const body = h(
    "div",
    {
      ref: (el) => {
        const root = el as HTMLElement;
        const apply = (collapsed: boolean): void => {
          root.style.display = collapsed ? "none" : "block";
        };
        apply(state.value);
        return watch(state, (v) => apply(v));
      },
      style: {
        paddingX: "$spacing.sm",
        paddingY: "$spacing.xs",
      },
    },
    props.children
  );

  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        borderBottom: "1px solid",
        borderColor: "$color.neutral.border",
      },
    },
    h(
      "div",
      {
        onClick: onHeaderClick,
        role: "button",
        tabIndex: 0,
        style: {
          display: "flex",
          alignItems: "center",
          gap: "$spacing.xs",
          paddingX: "$spacing.sm",
          paddingY: "$spacing.xs",
          cursor: "pointer",
          background: "$color.surface.low",
          fontSize: "$font.size.sm",
          fontWeight: "$font.weight.semibold",
          color: "$color.text.primary",
          userSelect: "none",
        },
      },
      h(
        "span",
        {
          ref: (el) => {
            const caret = el as HTMLElement;
            const apply = (collapsed: boolean): void => {
              caret.style.transform = collapsed ? "rotate(-90deg)" : "rotate(0deg)";
            };
            apply(state.value);
            return watch(state, (v) => apply(v));
          },
          style: {
            display: "inline-block",
            width: 12,
            transition: "transform var(--ui-motion-duration-fast) var(--ui-motion-easing-standard)",
          },
        },
        "▾"
      ),
      h("span", { style: { flex: 1 } }, props.title),
      props.actions
        ? h(
            "div",
            {
              onClick: (e: MouseEvent) => e.stopPropagation(),
              style: { display: "flex", alignItems: "center", gap: "$spacing.xs" },
            },
            props.actions
          )
        : null
    ),
    body
  );
});
