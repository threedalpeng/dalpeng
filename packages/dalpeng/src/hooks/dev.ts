import type { Application } from "@dalpeng/core";
import { createOverlayRoot, createPersistStore, makeSection, makeSlider } from "./ui";

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
  const section = (label: string, parent: HTMLElement, id: string) => {
    const open =
      persisted.sections && persisted.sections[id] !== undefined ? !!persisted.sections[id] : true;
    const sec = makeSection(parent, label, open);
    sec.head.addEventListener("click", () => {
      const prev = (store.get<Record<string, boolean>>("sections", {}) as any) || {};
      const isOpen = sec.body.style.display !== "none";
      store.set("sections", { ...prev, [id]: isOpen });
    });
    return sec;
  };

  // Status panel (updated periodically)
  const secStatus = section("Status", contentWrap, "status");
  const status = document.createElement("div");
  status.style.display = "grid";
  status.style.gridTemplateColumns = "auto 1fr";
  status.style.columnGap = "8px";
  status.style.rowGap = "2px";
  status.style.marginBottom = "6px";
  secStatus.body.appendChild(status);
  const row = (k: string) => {
    const kEl = document.createElement("div");
    const vEl = document.createElement("div");
    kEl.style.opacity = "0.8";
    kEl.textContent = k;
    status.appendChild(kEl);
    status.appendChild(vEl);
    return vEl;
  };
  const vFPS = row("FPS");
  const vPost = row("ToneMap");
  const vCaps = row("HDR Blend");
  const vFBO = row("FBO Status");
  const vLastErr = row("Last GL Err");
  // Lighting debug view selector
  const selWrap = document.createElement("div");
  selWrap.style.margin = "6px 0";
  const sel = document.createElement("select");
  const addOpt = (v: number, label: string) => {
    const o = document.createElement("option");
    o.value = String(v);
    o.textContent = label;
    sel.appendChild(o);
  };
  addOpt(0, "View: Shaded");
  addOpt(1, "View: Normals");
  addOpt(2, "View: Albedo");
  addOpt(3, "View: Emissive");
  addOpt(4, "View: Metallic");
  addOpt(5, "View: Roughness");
  addOpt(6, "View: Position");
  sel.value = String(persisted.debugLightingView ?? app.features.debugLightingView ?? 0);
  app.features.debugLightingView = parseInt(sel.value) || 0;
  sel.addEventListener("change", () => {
    const v = parseInt(sel.value) || 0;
    app.features.debugLightingView = v;
    store.set("debugLightingView", v);
  });
  selWrap.appendChild(sel);
  const secLighting = section("Lighting", contentWrap, "lighting");
  const secView = section("Views", secLighting.body, "lighting-views");
  secView.body.appendChild(selWrap);

  // Tone mapping group
  const secTone = section("Tone Mapping", secLighting.body, "lighting-tone");
  // Toggle
  const toneToggle = document.createElement("input");
  toneToggle.type = "checkbox";
  const applyToneToggle = (v: boolean) => {
    app.features.postToneMapping = v;
    store.set("postToneMapping", v);
  };
  toneToggle.checked = persisted.postToneMapping ?? !!app.features.postToneMapping;
  applyToneToggle(toneToggle.checked);
  toneToggle.addEventListener("change", () => applyToneToggle(toneToggle.checked));
  const toneRow = document.createElement("label");
  toneRow.style.display = "flex";
  toneRow.style.alignItems = "center";
  toneRow.style.gap = "6px";
  toneRow.style.margin = "4px 0";
  const toneText = document.createElement("span");
  toneText.textContent = "Enable Tone Mapping (T)";
  toneRow.appendChild(toneToggle);
  toneRow.appendChild(toneText);
  secTone.body.appendChild(toneRow);
  // Sliders
  const expSlider = makeSlider(
    secTone.body,
    store,
    "toneExposure",
    "Exposure",
    persisted.toneExposure ?? app.features.toneExposure ?? 1.0,
    0.0,
    4.0,
    0.01,
    (n) => {
      app.features.toneExposure = n;
    }
  );
  const gamSlider = makeSlider(
    secTone.body,
    store,
    "toneGamma",
    "Gamma",
    persisted.toneGamma ?? app.features.toneGamma ?? 2.2,
    1.2,
    3.0,
    0.01,
    (n) => {
      app.features.toneGamma = n;
    }
  );
  // sliders already appended by makeSlider

  // Controls (debug/general)
  const secControls = section("Controls", contentWrap, "controls");
  const mkRow = (label: string, input: HTMLElement) => {
    const row = document.createElement("label");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "6px";
    row.style.margin = "4px 0";
    const span = document.createElement("span");
    span.textContent = label;
    row.appendChild(input);
    row.appendChild(span);
    secControls.body.appendChild(row);
  };

  // Debug GL toggle
  const dbg = document.createElement("input");
  dbg.type = "checkbox";
  const applyDbg = (v: boolean) => {
    app.features.debugGL = v;
    store.set("debugGL", v);
  };
  dbg.checked = persisted.debugGL ?? !!app.features.debugGL;
  applyDbg(dbg.checked);
  dbg.addEventListener("change", () => applyDbg(dbg.checked));
  mkRow("Debug GL logs", dbg);

  // Verbose per-frame logs
  const vdbg = document.createElement("input");
  vdbg.type = "checkbox";
  const applyVdbg = (v: boolean) => {
    app.features.debugGLVerbose = v;
    store.set("debugGLVerbose", v);
  };
  vdbg.checked = persisted.debugGLVerbose ?? !!app.features.debugGLVerbose;
  applyVdbg(vdbg.checked);
  vdbg.addEventListener("change", () => applyVdbg(vdbg.checked));
  mkRow("Verbose (per-frame)", vdbg);

  // Manual dump / reset
  const dumpBtn = document.createElement("button");
  dumpBtn.textContent = "Dump GL State";
  dumpBtn.style.cursor = "pointer";
  dumpBtn.style.padding = "4px 6px";
  dumpBtn.style.border = "1px solid rgba(255,255,255,0.2)";
  dumpBtn.style.background = "rgba(255,255,255,0.1)";
  dumpBtn.style.color = "#fff";
  dumpBtn.style.borderRadius = "4px";
  dumpBtn.addEventListener("click", () => {
    (app as any).renderer?.debugDumpState?.(app, "manual dump");
    (app as any).renderer?.debugCheckError?.("manual dump");
  });
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset Defaults";
  resetBtn.style.cursor = "pointer";
  resetBtn.style.padding = "4px 6px";
  resetBtn.style.border = "1px solid rgba(255,255,255,0.2)";
  resetBtn.style.background = "rgba(255,255,255,0.1)";
  resetBtn.style.color = "#fff";
  resetBtn.style.borderRadius = "4px";
  resetBtn.style.marginLeft = "6px";
  resetBtn.addEventListener("click", () => {
    const def = resetDefaults();
    overlay.setMinimized(!!(def as any).minimized);
    applyToneToggle(!!(def as any).postToneMapping);
    toneToggle.checked = !!(def as any).postToneMapping;
    applyDbg(!!(def as any).debugGL);
    dbg.checked = !!(def as any).debugGL;
    applyVdbg(!!(def as any).debugGLVerbose);
    vdbg.checked = !!(def as any).debugGLVerbose;
    app.features.debugLightingView = (def as any).debugLightingView ?? 0;
    sel.value = String(app.features.debugLightingView);
    app.features.toneExposure = (def as any).toneExposure;
    app.features.toneGamma = (def as any).toneGamma;
    expSlider.range.value = String(app.features.toneExposure);
    gamSlider.range.value = String(app.features.toneGamma);
  });
  const btnWrap = document.createElement("div");
  btnWrap.style.marginTop = "6px";
  btnWrap.appendChild(dumpBtn);
  btnWrap.appendChild(resetBtn);
  secControls.body.appendChild(btnWrap);

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
    vFPS.textContent = `${fps}`;
    vPost.textContent = app.features.postToneMapping ? "On" : "Off";
    sel.value = String(app.features.debugLightingView ?? 0);
    if (app.features.toneExposure != null)
      expSlider.range.value = String(app.features.toneExposure);
    if (app.features.toneGamma != null) gamSlider.range.value = String(app.features.toneGamma);

    const caps = (app as any).renderer?.debugGetCaps?.() as any;
    vCaps.textContent = caps ? (caps.extFloatBlend ? "Yes" : "No (LDR)") : "?";

    const st = (app as any).renderer?.debugCollectState?.(app) as any;
    if (st && st.rtStatus) {
      const mapStatus = (x: number) => (x === 0x8cd5 ? "OK" : `0x${x.toString(16)}`);
      const gb = st.rtStatus.gbuffer;
      const lt = st.rtStatus.lighting;
      vFBO.textContent = `G:${gb !== undefined ? mapStatus(gb) : "-"} L:${
        lt !== undefined ? mapStatus(lt) : "-"
      }`;
    } else {
      vFBO.textContent = "-";
    }

    const lastErr = (app as any).renderer?.debugGetLastError?.() as any;
    vLastErr.textContent = lastErr ? `${lastErr.name} (${lastErr.tag ?? ""})` : "-";

    raf = requestAnimationFrame(update);
  };
  raf = requestAnimationFrame(update);

  // Hotkeys
  const onKey = (e: KeyboardEvent) => {
    if (!hotkeys) return;
    if (e.code === "KeyT") {
      toneToggle.checked = !toneToggle.checked;
      toneToggle.dispatchEvent(new Event("change"));
    }
  };
  window.addEventListener("keydown", onKey);

  return () => {
    window.removeEventListener("keydown", onKey);
    if (root.parentElement) root.parentElement.removeChild(root);
    if (raf) cancelAnimationFrame(raf);
  };
}
