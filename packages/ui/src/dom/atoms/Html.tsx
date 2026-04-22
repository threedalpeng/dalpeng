import { h, type UIElement } from "../../core/element";

/**
 * Escape hatch for raw HTML markup. Caller is responsible for trust /
 * sanitization — dangerouslySetInnerHTML-equivalent.
 */
export function Html(content: string): UIElement {
  return h("div", {
    ref: (el) => {
      (el as HTMLElement).innerHTML = content;
    },
  });
}
