import type { ReadonlyRef } from "@dalpeng/core";
import type { UIElement } from "../../core/element";

/** Label / value row. `content` can be static string or a reactive Ref. */
export function Value(label: string, content: string | ReadonlyRef<string>): UIElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span>{label}</span>
      <span>{content}</span>
    </div>
  );
}
