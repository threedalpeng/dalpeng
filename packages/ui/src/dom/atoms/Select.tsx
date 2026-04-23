import type { ReadonlyRef, Ref } from "@dalpeng/core";
import { defineComponent, type UIElement } from "../../core/element";
import { bindValue } from "../bindings";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  source: Ref<string>;
  label: string | ReadonlyRef<string>;
  options: SelectOption[];
}

export const Select = defineComponent<SelectProps>(
  ({ source, label, options }): UIElement => (
    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span>{label}</span>
      <select ref={(el) => bindValue(el as HTMLSelectElement, "value", source)}>
        {options.map((opt) => (
          <option value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  )
);
