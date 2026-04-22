import { ref, type Ref } from "@dalpeng/core";
import type { UIElement } from "../../core/element";

export interface RangeOpts {
  min: number;
  max: number;
  step?: number;
}

export function Range(source: Ref<number>, label: string, opts: RangeOpts): UIElement {
  const display = ref(String(source.value));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span>{label}</span>
      <input
        type="range"
        min={opts.min}
        max={opts.max}
        step={opts.step ?? 1}
        ref={(el) => {
          const input = el as HTMLInputElement;
          input.value = String(source.value);
          display.value = String(source.value);
          const unsubRef = source.subscribe((v) => {
            input.value = String(v);
            display.value = String(v);
          });
          const handler = (): void => {
            const n = Number(input.value);
            source.value = n;
            display.value = input.value;
          };
          input.addEventListener("input", handler);
          return () => {
            unsubRef();
            input.removeEventListener("input", handler);
          };
        }}
      />
      <span style={{ minWidth: 40, textAlign: "right" }}>{display}</span>
    </div>
  );
}
