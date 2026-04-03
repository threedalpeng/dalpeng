export interface ExternalTextureSet {
  baseColor: string;
  normal: string;
  arm: string; // AO(R) + Roughness(G) + Metallic(B) — same channel layout as glTF MR
}

/** Local paths relative to public/ (served by Vite dev server) */
export const EXTERNAL_PRESETS = {
  brick: {
    baseColor: "/textures/brick/baseColor.jpg",
    normal: "/textures/brick/normal.jpg",
    arm: "/textures/brick/arm.jpg",
  },
  wood: {
    baseColor: "/textures/wood/baseColor.jpg",
    normal: "/textures/wood/normal.jpg",
    arm: "/textures/wood/arm.jpg",
  },
  stone: {
    baseColor: "/textures/stone/baseColor.jpg",
    normal: "/textures/stone/normal.jpg",
    arm: "/textures/stone/arm.jpg",
  },
} as const satisfies Record<string, ExternalTextureSet>;

/**
 * Check if external textures are available by probing one file.
 * Returns true if the textures have been downloaded.
 */
export async function hasExternalTextures(): Promise<boolean> {
  try {
    const res = await fetch(EXTERNAL_PRESETS.brick.baseColor, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}
