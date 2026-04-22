import type { Ref } from "@dalpeng/core";
import type { UIElement } from "../../core/element";
import { bindValue } from "../bindings";

export interface SelectOption {
  value: string;
  label: string;
}

export function Select(source: Ref<string>, label: string, options: SelectOption[]): UIElement {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span>{label}</span>
      <select ref={(el) => bindValue(el as HTMLSelectElement, "value", source)}>
        {options.map((opt) => (
          <option value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
