import type { ReadonlyRef } from "@dalpeng/core";
import { h, type UIElement } from "../element";

/** Label / value row. `content` can be static string or a reactive Ref. */
export function Value(label: string, content: string | ReadonlyRef<string>): UIElement {
  return h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 6 } },
    h("span", null, label),
    h("span", null, content)
  );
}
