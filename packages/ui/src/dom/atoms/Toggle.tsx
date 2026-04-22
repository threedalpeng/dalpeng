import type { Ref } from "@dalpeng/core";
import { bindValue } from "../bindings";
import { h, type UIElement } from "../element";

export function Toggle(source: Ref<boolean>, label: string): UIElement {
  return h(
    "label",
    {
      style: { display: "flex", alignItems: "center", gap: 6, cursor: "pointer" },
    },
    h("input", {
      type: "checkbox",
      ref: (el) => bindValue(el as HTMLInputElement, "checked", source),
    }),
    h("span", null, label)
  );
}
