import type { UIElement } from "../../core/element";

export function Button(label: string, onClick: () => void): UIElement {
  return (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  );
}
