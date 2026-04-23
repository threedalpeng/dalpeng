import { ref, type ReadonlyRef, type Ref } from "@dalpeng/core";
import { defineComponent, type UIElement } from "../../core/element";

export interface RangeProps {
  source: Ref<number>;
  label: string | ReadonlyRef<string>;
  min: number;
  max: number;
  step?: number;
}

export const Range = defineComponent<RangeProps>(({ source, label, min, max, step }): UIElement => {
  const display = ref(String(source.value));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
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
});
