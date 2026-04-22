import { APP_NODE_KIND, type UINode } from "@dalpeng/core";
import { getThisUI } from "./context";
import { createElement, type Child, type UIElement } from "./element";

/**
 * Define a scene-root UI descriptor. Returns a factory that, when invoked
 * by the Materializer during the scene walk, produces a `UINode` the
 * runtime materializes via `domUIRenderer`.
 *
 * Setup runs inside a UI scope that the renderer pushes — `useLayout` /
 * `usePlacement` / `withLayer` / `useTheme` all resolve against it. The
 * return value is wrapped in a `<div>` container whose flex layout is
 * driven by `useLayout()` calls made during setup.
 */
export function defineUI(setup: () => UIElement | Child[]): () => UINode;
export function defineUI<P>(setup: (props: P) => UIElement | Child[]): (props: P) => UINode;
export function defineUI<P = void>(setup: (props?: P) => UIElement | Child[]) {
  const bodyFn = (props?: P): UIElement => {
    const result = setup(props);
    const children = Array.isArray(result) ? result : [result];
    // useLayout() mutated UIContext.layout during setup — read final state.
    const ui = getThisUI();
    const layout = ui?.layout ?? { direction: "column" as const, gap: 4 };
    return createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: layout.direction,
          gap: layout.gap,
          alignItems: layout.align,
        },
      },
      ...children
    );
  };
  return (props?: P): UINode =>
    ({
      [APP_NODE_KIND]: "ui",
      setup: bodyFn as (p: unknown) => unknown,
      props,
    }) as UINode;
}
