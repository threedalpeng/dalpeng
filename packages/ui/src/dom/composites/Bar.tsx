import { isRef, type Ref } from "@dalpeng/core";
import type { UIElement } from "../../core/element";

export interface BarOpts {
  width: number;
  height: number;
  radius?: number;
  color?: string | ((v: number) => string);
  bgColor?: string;
}

/**
 * Value-to-width bar (progress/HP/etc). `source` + `formatter` map a reactive
 * value to a `[0..1]` ratio; static `Bar(opts)` renders empty.
 */
export function Bar(opts: BarOpts): UIElement;
export function Bar<T>(source: Ref<T>, formatter: (v: T) => number, opts: BarOpts): UIElement;
export function Bar<T>(
  sourceOrOpts: Ref<T> | BarOpts,
  formatter?: (v: T) => number,
  opts?: BarOpts
): UIElement {
  const actualOpts = isRef(sourceOrOpts) ? opts! : (sourceOrOpts as BarOpts);
  const source = isRef(sourceOrOpts) ? (sourceOrOpts as Ref<T>) : null;

  return (
    <div
      style={{
        width: actualOpts.width,
        height: actualOpts.height,
        backgroundColor: actualOpts.bgColor ?? "rgba(255,255,255,0.2)",
        borderRadius: actualOpts.radius,
        overflow: "hidden",
      }}
      ref={(el) => {
        const outer = el as HTMLElement;
        const inner = el.ownerDocument!.createElement("div");
        inner.style.cssText = "height:100%;transition:width 0.15s ease";
        outer.appendChild(inner);

        const apply = (ratio: number): void => {
          const clamped = Math.max(0, Math.min(1, ratio));
          inner.style.width = `${clamped * 100}%`;
          inner.style.backgroundColor =
            typeof actualOpts.color === "function"
              ? actualOpts.color(clamped)
              : (actualOpts.color ?? "#4caf50");
        };

        if (source && formatter) {
          apply(formatter(source.value));
          const unsub = source.subscribe((v) => apply(formatter(v)));
          return () => unsub();
        }
        apply(0);
        return undefined;
      }}
    />
  );
}
