import { defineWidget, type UIElement } from "../../core/element";

export interface HtmlProps {
  /** Raw HTML string. Caller is responsible for trust / sanitization (dangerouslySetInnerHTML-equivalent). */
  content: string;
}

export const Html = defineWidget<HtmlProps>(
  ({ content }): UIElement => (
    <div
      ref={(el) => {
        (el as HTMLElement).innerHTML = content;
      }}
    />
  )
);
