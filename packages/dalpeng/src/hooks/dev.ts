import type { Application } from "@dalpeng/core";

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

  // Root container
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.zIndex = "9999";
  root.style.padding = "8px";
  root.style.minWidth = "200px";
  root.style.font = "12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  root.style.color = "#fff";
  root.style.background = "rgba(0,0,0,0.5)";
  root.style.borderRadius = "6px";
  root.style.backdropFilter = "blur(2px)";
  const [y, x] = position.split("-");
  if (y === "top") root.style.top = "8px";
  else root.style.bottom = "8px";
  if (x === "left") root.style.left = "8px";
  else root.style.right = "8px";

  const title = document.createElement("div");
  title.textContent = "Dalpeng Debug";
  title.style.fontWeight = "600";
  title.style.marginBottom = "6px";
  root.appendChild(title);

  // Status panel (updated periodically)
  const status = document.createElement("div");
  status.style.display = "grid";
  status.style.gridTemplateColumns = "auto 1fr";
  status.style.columnGap = "8px";
  status.style.rowGap = "2px";
  status.style.marginBottom = "6px";
  root.appendChild(status);
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
  sel.value = String(app.features.debugLightingView ?? 0);
  sel.addEventListener("change", () => {
    app.features.debugLightingView = parseInt(sel.value) || 0;
  });
  selWrap.appendChild(sel);
  root.appendChild(selWrap);

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
    root.appendChild(row);
  };

  // Tone mapping toggle
  const tone = document.createElement("input");
  tone.type = "checkbox";
  tone.checked = !!app.features.postToneMapping;
  tone.addEventListener("change", () => {
    app.features.postToneMapping = tone.checked;
  });
  mkRow("Tone Mapping (T)", tone);

  // Debug GL toggle
  const dbg = document.createElement("input");
  dbg.type = "checkbox";
  dbg.checked = !!app.features.debugGL;
  dbg.addEventListener("change", () => {
    app.features.debugGL = dbg.checked;
  });
  mkRow("Debug GL logs", dbg);

  // Verbose per-frame logs
  const vdbg = document.createElement("input");
  vdbg.type = "checkbox";
  vdbg.checked = !!app.features.debugGLVerbose;
  vdbg.addEventListener("change", () => {
    app.features.debugGLVerbose = vdbg.checked;
  });
  mkRow("Verbose (per-frame)", vdbg);

  // Manual dump button
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
  const btnWrap = document.createElement("div");
  btnWrap.style.marginTop = "6px";
  btnWrap.appendChild(dumpBtn);
  root.appendChild(btnWrap);

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
      tone.checked = !tone.checked;
      tone.dispatchEvent(new Event("change"));
    }
  };
  window.addEventListener("keydown", onKey);

  return () => {
    window.removeEventListener("keydown", onKey);
    if (root.parentElement) root.parentElement.removeChild(root);
    if (raf) cancelAnimationFrame(raf);
  };
}
