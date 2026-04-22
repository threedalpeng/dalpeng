import type { Ref } from "@dalpeng/core";
import type { UIElement } from "../../core/element";
import { bindValue } from "../bindings";

export function Toggle(source: Ref<boolean>, label: string): UIElement {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
      <input type="checkbox" ref={(el) => bindValue(el as HTMLInputElement, "checked", source)} />
      <span>{label}</span>
    </label>
  );
}
