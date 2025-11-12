import type { Application } from "@dalpeng/core";
import { createOverlayBuilder } from "./builder";
import { createOverlayRoot, createPersistStore, makeSection } from "./ui";

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

  // Helper: collapsible section with persistence
  const section = (label: string, parent: HTMLElement, id: string, indent = 0) => {
    const open =
      persisted.sections && persisted.sections[id] !== undefined ? !!persisted.sections[id] : true;
    const sec = makeSection(parent, label, open, indent);
    sec.head.addEventListener("click", () => {
      const prev = (store.get<Record<string, boolean>>("sections", {}) as any) || {};
      const isOpen = sec.body.style.display !== "none";
      store.set("sections", { ...prev, [id]: isOpen });
    });
    return sec;
  };

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
  )
    .group("Status", "status", (s) => {
      s.value("status:fps", "FPS", "-")
        .value("status:post", "ToneMap", "-")
        .value("status:caps", "HDR Blend", "-")
        .value("status:fbo", "FBO Status", "-")
        .value("status:err", "Last GL Err", "-");
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
        (app as any).renderer?.debugDumpState?.(app, "manual dump");
        (app as any).renderer?.debugCheckError?.("manual dump");
      }).button("Reset Defaults", () => {
        const def = resetDefaults();
        overlay.setMinimized(!!(def as any).minimized);
        app.features.postToneMapping = !!(def as any).postToneMapping;
        app.features.debugGL = !!(def as any).debugGL;
        app.features.debugGLVerbose = !!(def as any).debugGLVerbose;
        app.features.debugLightingView = (def as any).debugLightingView ?? 0;
        app.features.toneExposure = (def as any).toneExposure;
        app.features.toneGamma = (def as any).toneGamma;
        const q = (sel: string) =>
          root.querySelector(sel) as HTMLInputElement | HTMLSelectElement | null;
        const toneChk = q(
          'input[type="checkbox"][data-key="postToneMapping"]'
        ) as HTMLInputElement | null;
        if (toneChk) {
          toneChk.checked = !!(def as any).postToneMapping;
          toneChk.dispatchEvent(new Event("change"));
        }
        const selView = q('select[data-key="debugLightingView"]') as HTMLSelectElement | null;
        if (selView) {
          selView.value = String((def as any).debugLightingView ?? 0);
          selView.dispatchEvent(new Event("change"));
        }
        const exp = q('input[type="range"][data-key="toneExposure"]') as HTMLInputElement | null;
        if (exp) {
          exp.value = String((def as any).toneExposure);
          exp.dispatchEvent(new Event("input"));
        }
        const gam = q('input[type="range"][data-key="toneGamma"]') as HTMLInputElement | null;
        if (gam) {
          gam.value = String((def as any).toneGamma);
          gam.dispatchEvent(new Event("input"));
        }
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

    const caps = (app as any).renderer?.debugGetCaps?.() as any;
    const sCaps = root.querySelector('[data-key="status:caps"]') as HTMLElement | null;
    if (sCaps) sCaps.textContent = caps ? (caps.extFloatBlend ? "Yes" : "No (LDR)") : "?";

    const st = (app as any).renderer?.debugCollectState?.(app) as any;
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

    const lastErr = (app as any).renderer?.debugGetLastError?.() as any;
    const sErr = root.querySelector('[data-key="status:err"]') as HTMLElement | null;
    if (sErr) sErr.textContent = lastErr ? `${lastErr.name} (${lastErr.tag ?? ""})` : "-";

    raf = requestAnimationFrame(update);
  };
  raf = requestAnimationFrame(update);

  // Hotkeys
  const onKey = (e: KeyboardEvent) => {
    if (!hotkeys) return;
    if (e.code === "KeyT") {
      const toneChk = root.querySelector(
        'input[type="checkbox"][data-key="postToneMapping"]'
      ) as HTMLInputElement | null;
      if (toneChk) {
        toneChk.checked = !toneChk.checked;
        toneChk.dispatchEvent(new Event("change"));
      } else {
        app.features.postToneMapping = !app.features.postToneMapping;
        store.set("postToneMapping", app.features.postToneMapping);
      }
    }
  };
  window.addEventListener("keydown", onKey);

  return () => {
    window.removeEventListener("keydown", onKey);
    if (root.parentElement) root.parentElement.removeChild(root);
    if (raf) cancelAnimationFrame(raf);
  };
}
