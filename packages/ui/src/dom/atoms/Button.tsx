import { h, type UIElement } from "../element";

export function Button(label: string, onClick: () => void): UIElement {
  return h("button", { type: "button", onClick }, label);
}
