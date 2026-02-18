import type { Application } from "@dalpeng/core";
import { createOverlayBuilder } from "./builder";
import { createOverlayRoot, createPersistStore } from "./ui";

type ToggleOptions = {
  key?: string; // KeyboardEvent.code, e.g., 'KeyT'
  overlay?: boolean; // Show small UI label in the corner
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

export function enablePostToneMappingToggle(app: Application, opts: ToggleOptions = {}) {
  const key = opts.key ?? "KeyT";
  const showOverlay = !!opts.overlay;
  const position = opts.position ?? "top-right";

  let label: HTMLDivElement | null = null;
  if (showOverlay) {
    label = document.createElement("div");
    label.style.position = "fixed";
    label.style.zIndex = "9999";
    label.style.padding = "4px 8px";
    label.style.font = "12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    label.style.color = "#fff";
    label.style.background = "rgba(0,0,0,0.5)";
    label.style.borderRadius = "4px";
    const [y, x] = position.split("-");
    if (y === "top") label.style.top = "8px";
    else label.style.bottom = "8px";
    if (x === "left") label.style.left = "8px";
    else label.style.right = "8px";
    label.textContent = `ToneMapping: ${app.features.postToneMapping ? "On" : "Off"} (T)`;
    document.body.appendChild(label);
  }

  const update = () => {
    if (label)
      label.textContent = `ToneMapping: ${app.features.postToneMapping ? "On" : "Off"} (T)`;
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.code !== key) return;
    app.features.postToneMapping = !app.features.postToneMapping;
    update();
  };
  window.addEventListener("keydown", onKey);

  return () => {
    window.removeEventListener("keydown", onKey);
    if (label && label.parentElement) label.parentElement.removeChild(label);
  };
}

type OverlayOptions = {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  hotkeys?: boolean; // enable default hotkeys like T for tone-mapping
};

export function enableDebugOverlay(app: Application, opts: OverlayOptions = {}) {
  const position = opts.position ?? "top-right";
  const hotkeys = opts.hotkeys ?? true;
  const store = createPersistStore("dalpeng.debug.overlay");
  const resetDefaults = () => {
    const def = {
      minimized: false,
      postToneMapping: false,
      debugGL: false,
      debugGLVerbose: false,
      debugLightingView: 0,
      toneExposure: 1.0,
      toneGamma: 2.2,
      bloom: false,
      bloomThreshold: 1.0,
      bloomIntensity: 0.5,
      bloomRadius: 5,
      sections: {},
    } as any;
    store.reset(def);
    return def;
  };
  const persisted = store.raw() as any;

  // Overlay root (with minimize toggle)
  const overlay = createOverlayRoot({
    title: "Dalpeng Debug",
    position,
    minimized: !!persisted.minimized,
  });
  const root = overlay.root;
  const contentWrap = overlay.content;
  overlay.onToggle((m) => store.set("minimized", m));

  // Build UI via builder
  const builder = createOverlayBuilder(
    contentWrap,
    {
      get: (k, f) => store.get(k as any, f as any) as any,
      set: (k, v) => store.set(k as any, v as any),
    },
    persisted.sections ?? {},
    (id, open) => {
      const prev = (store.get<Record<string, boolean>>("sections", {}) as any) || {};
      store.set("sections", { ...prev, [id]: open });
    }
  );
  builder
    .group("Status", "status", (s) => {
      s.value("status:fps", "FPS", "-")
        .value("status:post", "ToneMap", "-")
        .value("status:caps", "HDR Blend", "-")
        .value("status:fbo", "FBO Status", "-")
        .value("status:err", "Last GL Err", "-")
        .value("status:bloom", "Bloom", "-");
    })
    .group("Lighting", "lighting", (g) => {
      g.group("Views", "lighting-views", (v) => {
        v.select(
          "debugLightingView",
          "View",
          [
            { value: "0", label: "Shaded" },
            { value: "1", label: "Normals" },
            { value: "2", label: "Albedo" },
            { value: "3", label: "Emissive" },
            { value: "4", label: "Metallic" },
            { value: "5", label: "Roughness" },
            { value: "6", label: "Position" },
          ],
          String(persisted.debugLightingView ?? app.features.debugLightingView ?? 0),
          (val) => (app.features.debugLightingView = parseInt(val) || 0)
        );
      });
      g.group("Tone Mapping", "lighting-tone", (t) => {
        t.checkbox(
          "postToneMapping",
          "Enable (T)",
          persisted.postToneMapping ?? !!app.features.postToneMapping,
          (v) => (app.features.postToneMapping = v)
        )
          .slider(
            "toneExposure",
            "Exposure",
            persisted.toneExposure ?? app.features.toneExposure ?? 1.0,
            0.0,
            4.0,
            0.01,
            (n) => (app.features.toneExposure = n)
          )
          .slider(
            "toneGamma",
            "Gamma",
            persisted.toneGamma ?? app.features.toneGamma ?? 2.2,
            1.2,
            3.0,
            0.01,
            (n) => (app.features.toneGamma = n)
          );
      });
      g.group("Shadows", "lighting-shadows", (s) => {
        s.checkbox(
          "shadows",
          "Enable",
          !!app.features.shadows,
          (v) => (app.features.shadows = v)
        )
          .slider(
            "shadowBias",
            "Bias",
            persisted.shadowBias ?? 0.005,
            0.0,
            0.05,
            0.001,
            (n) => (app.features.shadowBias = n)
          )
          .slider(
            "shadowSlopeScale",
            "Slope Scale",
            persisted.shadowSlopeScale ?? 1.0,
            0.0,
            5.0,
            0.01,
            (n) => (app.features.shadowSlopeScale = n)
          )
          .slider(
            "shadowStrength",
            "Strength",
            persisted.shadowStrength ?? 1.0,
            0.0,
            1.0,
            0.01,
            (n) => (app.features.shadowStrength = n)
          )
          .slider(
            "shadowMapSize",
            "Map Size",
            persisted.shadowMapSize ?? 1024,
            128,
            4096,
            128,
            (n) => (app.features.shadowMapSize = Math.max(16, Math.floor(n)))
          )
          .slider(
            "shadowDistance",
            "Max Dist (0=auto)",
            persisted.shadowDistance ?? 0,
            0,
            200,
            1,
            (n) => (app.features.shadowDistance = n)
          )
          .select(
            "shadowDebug",
            "Debug",
            [
              { value: "0", label: "Off" },
              { value: "1", label: "Visibility" },
              { value: "2", label: "UV+Depth" },
            ],
            String(persisted.shadowDebug ?? app.features.shadowDebug ?? 0),
            (v) => (app.features.shadowDebug = parseInt(v) || 0)
          );
      });
      g.group("Bloom", "lighting-bloom", (b) => {
        b.checkbox("bloom", "Enable", !!app.features.bloom, (v) => (app.features.bloom = v))
          .slider(
            "bloomThreshold",
            "Threshold",
            persisted.bloomThreshold ?? app.features.bloomThreshold ?? 1.0,
            0.0,
            3.0,
            0.01,
            (n) => (app.features.bloomThreshold = n)
          )
          .slider(
            "bloomIntensity",
            "Intensity",
            persisted.bloomIntensity ?? app.features.bloomIntensity ?? 0.5,
            0.0,
            2.0,
            0.01,
            (n) => (app.features.bloomIntensity = n)
          )
          .slider(
            "bloomRadius",
            "Radius (iters)",
            persisted.bloomRadius ?? app.features.bloomRadius ?? 5,
            1,
            10,
            1,
            (n) => (app.features.bloomRadius = Math.max(1, Math.floor(n)))
          );
      });
    })
    .group("Controls", "controls", (c) => {
      c.checkbox(
        "debugGL",
        "Debug GL logs",
        persisted.debugGL ?? !!app.features.debugGL,
        (v) => (app.features.debugGL = v)
      ).checkbox(
        "debugGLVerbose",
        "Verbose (per-frame)",
        persisted.debugGLVerbose ?? !!app.features.debugGLVerbose,
        (v) => (app.features.debugGLVerbose = v)
      );
      c.button("Dump GL State", () => {
        app.renderer.debugDumpState?.("manual dump");
        app.renderer.debugCheckError?.("manual dump");
      }).button("Reset Defaults", () => {
        const def = resetDefaults();
        overlay.setMinimized(!!def.minimized);
        builder.resetAll(def);
      });
    });

  document.body.appendChild(root);

  // Periodic updater (compact, no console spam)
  let raf = 0;
  let lastT = performance.now();
  let frames = 0;
  let fps = 0;
  const update = () => {
    const now = performance.now();
    frames++;
    if (now - lastT >= 500) {
      fps = Math.round((frames * 1000) / (now - lastT));
      frames = 0;
      lastT = now;
    }
    const sFps = root.querySelector('[data-key="status:fps"]') as HTMLElement | null;
    if (sFps) sFps.textContent = String(fps);
    const sPost = root.querySelector('[data-key="status:post"]') as HTMLElement | null;
    if (sPost) sPost.textContent = app.features.postToneMapping ? "On" : "Off";

    const caps = app.renderer.debugGetCaps?.() as any;
    const sCaps = root.querySelector('[data-key="status:caps"]') as HTMLElement | null;
    if (sCaps) sCaps.textContent = caps ? (caps.extFloatBlend ? "Yes" : "No (LDR)") : "?";

    const st = app.renderer.debugCollectState?.() as any;
    if (st && st.rtStatus) {
      const mapStatus = (x: number) => (x === 0x8cd5 ? "OK" : `0x${x.toString(16)}`);
      const gb = st.rtStatus.gbuffer;
      const lt = st.rtStatus.lighting;
      const sFbo = root.querySelector('[data-key="status:fbo"]') as HTMLElement | null;
      if (sFbo)
        sFbo.textContent = `G:${gb !== undefined ? mapStatus(gb) : "-"} L:${
          lt !== undefined ? mapStatus(lt) : "-"
        }`;
    } else {
      const sFbo = root.querySelector('[data-key="status:fbo"]') as HTMLElement | null;
      if (sFbo) sFbo.textContent = "-";
    }

    const lastErr = app.renderer.debugGetLastError?.() as any;
    const sErr = root.querySelector('[data-key="status:err"]') as HTMLElement | null;
    if (sErr) sErr.textContent = lastErr ? `${lastErr.name} (${lastErr.tag ?? ""})` : "-";

    const sBloom = root.querySelector('[data-key="status:bloom"]') as HTMLElement | null;
    if (sBloom) sBloom.textContent = app.features.bloom ? "On" : "Off";

    raf = requestAnimationFrame(update);
  };
  raf = requestAnimationFrame(update);

  // Hotkeys
  const onKey = (e: KeyboardEvent) => {
    if (!hotkeys) return;
    if (e.code === "KeyT") {
      builder.setControlValue("postToneMapping", !app.features.postToneMapping);
    }
  };
  window.addEventListener("keydown", onKey);

  return () => {
    window.removeEventListener("keydown", onKey);
    if (root.parentElement) root.parentElement.removeChild(root);
    if (raf) cancelAnimationFrame(raf);
  };
}
