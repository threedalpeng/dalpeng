import type { ReadonlyRef, Ref } from "@dalpeng/core";
import { defineWidget, type UIElement } from "../../core/element";
import { bindValue } from "../bindings";

export interface ToggleProps {
  source: Ref<boolean>;
  label: string | ReadonlyRef<string>;
}

export const Toggle = defineWidget<ToggleProps>(
  ({ source, label }): UIElement => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
      <input type="checkbox" ref={(el) => bindValue(el as HTMLInputElement, "checked", source)} />
      <span>{label}</span>
    </label>
  )
);
