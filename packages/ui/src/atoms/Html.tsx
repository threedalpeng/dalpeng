import { defineComponent } from "../component";
import { h, type UIElement } from "../element";

/**
 * Escape hatch for raw HTML markup. Caller is responsible for trust /
 * sanitization — dangerouslySetInnerHTML-equivalent.
 */
export function Html(content: string): UIElement {
  return h(HtmlRoot, { content });
}

const HtmlRoot = defineComponent<{ content: string }>(({ content }) =>
  h("div", { ref: (el) => ((el as HTMLElement).innerHTML = content) })
);
