import { defineComponent, type UIElement } from "../../core/element";

export interface HtmlProps {
  /** Raw HTML string. Caller is responsible for trust / sanitization (dangerouslySetInnerHTML-equivalent). */
  content: string;
}

export const Html = defineComponent<HtmlProps>(
  ({ content }): UIElement => (
    <div
      ref={(el) => {
        (el as HTMLElement).innerHTML = content;
      }}
    />
  )
);
