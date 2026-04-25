import { defineWidget, type Child, type UIElement } from "../../core/element";

export type ToolbarDensity = "compact" | "comfortable";
export type ToolbarAlign = "start" | "center" | "end" | "between";

export interface ToolbarProps {
  density?: ToolbarDensity;
  align?: ToolbarAlign;
  border?: boolean;
  children?: Child;
}

/**
 * Horizontal strip hosting IconButtons, Badges, compact inputs. Used as
 * panel headers / section controls. Keep it role-neutral — don't paint.
 */
export const Toolbar = defineWidget<ToolbarProps>((props): UIElement => {
  const density = props.density ?? "compact";
  const align = props.align ?? "start";
  return (
    <div
      role="toolbar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: density === "compact" ? "$spacing.xs" : "$spacing.sm",
        paddingX: density === "compact" ? "$spacing.sm" : "$spacing.md",
        paddingY: density === "compact" ? "$spacing.xs" : "$spacing.sm",
        justifyContent: justifyContent(align),
        borderBottom: props.border ? "1px solid" : undefined,
        borderColor: props.border ? "$color.neutral.border" : undefined,
        minHeight: density === "compact" ? 28 : 40,
      }}
    >
      {props.children}
    </div>
  );
});

function justifyContent(a: ToolbarAlign): string {
  if (a === "center") return "center";
  if (a === "end") return "flex-end";
  if (a === "between") return "space-between";
  return "flex-start";
}
