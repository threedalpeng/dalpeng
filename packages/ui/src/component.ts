import type { Component, ComponentElement, UIElement } from "./element";

export type { Component, ComponentElement, UIElement };

export function defineComponent<P = Record<string, never>>(
  setup: (props: P) => UIElement
): Component<P> {
  // Setup body runs once per component instance at render time — fine-grained
  // reactivity invariant. Ref props update bindings, not setup.
  return (props: P) => setup(props);
}
