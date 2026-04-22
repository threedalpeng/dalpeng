import type { Ref } from "@dalpeng/core";
import { h, type UIElement } from "../../core/element";
import { bindValue } from "../bindings";

export interface SelectOption {
  value: string;
  label: string;
}

export function Select(source: Ref<string>, label: string, options: SelectOption[]): UIElement {
  const optionEls: UIElement[] = options.map((opt) => h("option", { value: opt.value }, opt.label));
  return h(
    "label",
    {
      style: { display: "flex", alignItems: "center", gap: 6 },
    },
    h("span", null, label),
    h(
      "select",
      {
        ref: (el) => bindValue(el as HTMLSelectElement, "value", source),
      },
      ...optionEls
    )
  );
}
