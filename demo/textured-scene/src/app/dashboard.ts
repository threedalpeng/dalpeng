import { ref, watch, defineControlGroup, defineSelect, defineToggle, type ControlGroup } from "dalpeng";

type TextureSource = "procedural" | "external";

export interface DashboardOptions {
  externalAvailable: boolean;
  onSourceChange: (source: TextureSource) => void;
  onMaskChange: (mask: number) => void;
}

export function createTextureControls(opts: DashboardOptions): ControlGroup {
  const source = ref<string>("procedural");
  const baseColor = ref(true);
  const normal = ref(true);
  const metallicRoughness = ref(true);
  const emissive = ref(true);

  function updateMask() {
    let mask = 0;
    if (baseColor.value) mask |= 1;
    if (normal.value) mask |= 2;
    if (metallicRoughness.value) mask |= 4;
    if (emissive.value) mask |= 8;
    opts.onMaskChange(mask);
  }

  watch(source, (v) => opts.onSourceChange(v as TextureSource));
  watch(baseColor, updateMask);
  watch(normal, updateMask);
  watch(metallicRoughness, updateMask);
  watch(emissive, updateMask);

  // Fire initial callbacks
  opts.onSourceChange("procedural");
  updateMask();

  return defineControlGroup("Textures", () => [
    defineSelect(source, "Source", [
      { value: "procedural", label: "Procedural" },
      { value: "external", label: opts.externalAvailable ? "External (Poly Haven)" : "External (N/A)" },
    ]),
    defineToggle(baseColor, "Base Color"),
    defineToggle(normal, "Normal"),
    defineToggle(metallicRoughness, "Metallic/Roughness"),
    defineToggle(emissive, "Emissive"),
  ], { priority: 200 });
}
