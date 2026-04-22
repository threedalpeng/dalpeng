import type { Cleanup } from "../core/context";
import type { AdoptedElement } from "../core/element";

/**
 * Wrap a pre-existing DOM Node as a UIElement. Optional cleanups fire on unmount.
 *
 * Public escape hatch for integrating external DOM (legacy widgets, 3rd-party
 * libraries, imperative one-offs) — not the preferred way to author
 * dalpeng-owned UI. Scene backends provide their own equivalent with a
 * backend-specific node type.
 */
export function adopt(element: Node, cleanups?: ReadonlySet<Cleanup>): AdoptedElement {
  return { kind: "adopted", element, cleanups };
}
