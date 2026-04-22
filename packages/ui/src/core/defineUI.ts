import { APP_NODE_KIND, type UINode } from "@dalpeng/core";
import { createElement, Fragment, type Child, type UIElement } from "./element";

/**
 * Define a scene-root UI descriptor. Returns a factory that, when invoked
 * by the Materializer during the scene walk, produces a `UINode` the
 * runtime materializes via a backend-specific UIRenderer.
 *
 * Setup runs inside a UI scope that the renderer pushes — `useLayout` /
 * `usePlacement` / `withLayer` / `useTheme` all resolve against it.
 *
 * The return value is the user's UIElement as-is (multiple nodes wrap into
 * a Fragment). Backends (`domUIRenderer` and future scene renderers) apply
 * their own layout / positioning based on the UIContext populated during
 * setup. `defineUI` itself never touches DOM.
 */
export function defineUI(setup: () => UIElement | Child[]): () => UINode;
export function defineUI<P>(setup: (props: P) => UIElement | Child[]): (props: P) => UINode;
export function defineUI<P = void>(setup: (props?: P) => UIElement | Child[]) {
  const bodyFn = (props?: P): UIElement => {
    const result = setup(props);
    if (Array.isArray(result)) {
      return createElement(Fragment, null, ...result);
    }
    return result;
  };
  return (props?: P): UINode =>
    ({
      [APP_NODE_KIND]: "ui",
      setup: bodyFn as (p: unknown) => unknown,
      props,
    }) as UINode;
}
