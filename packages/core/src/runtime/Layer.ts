/**
 * Where a layer is rendered.
 * Constraint: all canvas layers must precede all dom layers — the browser
 * cannot interleave DOM elements between canvas content. Violated ordering throws.
 */
export type LayerBackend = "canvas" | "dom";

export type LayerSort =
  | "insertion"
  | "y"
  | "y-desc"
  | "manual"
  | { custom: (a: LayerMember, b: LayerMember) => number };

export interface LayerMember {
  readonly id: number;
  readonly y?: number;
  readonly sortingOrder?: number;
  readonly payload?: unknown;
}

export interface Layer {
  name: string;
  backend: LayerBackend;
  sort?: LayerSort;
}

export interface ResolvedLayer extends Layer {
  /** 0-based depth index; lower = drawn first. */
  readonly index: number;
  readonly sort: LayerSort;
}

export const DEFAULT_LAYERS: Layer[] = [
  { name: "world", backend: "canvas", sort: "y" },
  { name: "hud", backend: "dom", sort: "insertion" },
];

export class LayerRegistry {
  #layers = new Map<string, ResolvedLayer>();
  #ordered: ResolvedLayer[] = [];
  #userDeclared = false;

  constructor(initial: readonly Layer[] = DEFAULT_LAYERS) {
    this.#install(initial);
  }

  declareUser(layers: readonly Layer[]): void {
    if (this.#userDeclared) {
      throw new Error(
        "withLayers: layer set was already declared for this Application. " +
          "Call withLayers exactly once in defineApp setup.",
      );
    }
    this.#userDeclared = true;
    this.#install(layers);
  }

  get(name: string): ResolvedLayer | undefined {
    return this.#layers.get(name);
  }

  has(name: string): boolean {
    return this.#layers.has(name);
  }

  get ordered(): readonly ResolvedLayer[] {
    return this.#ordered;
  }

  get isUserDeclared(): boolean {
    return this.#userDeclared;
  }

  #install(layers: readonly Layer[]): void {
    if (layers.length === 0) {
      throw new Error(
        "withLayers: layer list cannot be empty. Provide at least one layer, " +
          "or omit the call entirely to use the default layer set.",
      );
    }

    const seen = new Set<string>();
    for (const l of layers) {
      if (!l.name) {
        throw new Error("withLayers: every layer needs a name.");
      }
      if (seen.has(l.name)) {
        throw new Error(`withLayers: duplicate layer name "${l.name}".`);
      }
      seen.add(l.name);
    }

    // canvas layers must all precede dom layers (browser constraint)
    let seenDom = false;
    for (const l of layers) {
      if (l.backend === "dom") {
        seenDom = true;
      } else if (l.backend === "canvas" && seenDom) {
        throw new Error(
          `withLayers: canvas layer "${l.name}" appears after a dom layer. ` +
            `Reorder so all canvas layers come before all dom layers.`,
        );
      }
    }

    this.#layers.clear();
    this.#ordered = layers.map((l, index) => {
      const resolved: ResolvedLayer = {
        name: l.name,
        backend: l.backend,
        sort: l.sort ?? "insertion",
        index,
      };
      this.#layers.set(l.name, resolved);
      return resolved;
    });
  }
}
