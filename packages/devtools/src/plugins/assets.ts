import { ref, watch } from "@dalpeng/core";
import { defineUI, type UIChild } from "@dalpeng/ui";
import type { DevToolsHost, TextureInfo } from "../host";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

const PALETTE = {
  fg: "#cbd5e1",
  fgMuted: "#9ba3b0",
  fgDim: "#6b7280",
  accent: "#7be0a1",
  bg: "rgba(0,0,0,0.25)",
  hover: "rgba(255,255,255,0.05)",
  selected: "rgba(123,224,161,0.15)",
};

function formatBytes(pixels: number, bytesPerPixel = 4): string {
  const bytes = pixels * bytesPerPixel;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function buildTexturesPanel(host: DevToolsHost) {
  const root = document.createElement("div");
  root.style.cssText = "display:flex;flex-direction:column;height:100%;min-height:0;font-size:11px";

  const bar = document.createElement("div");
  bar.style.cssText =
    "display:flex;gap:4px;padding:4px 6px;border-bottom:1px solid var(--dt-border);align-items:center";

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "🔍 filter textures…";
  searchInput.style.cssText =
    "flex:1;background:var(--dt-bg-sunken);color:var(--dt-fg);border:1px solid var(--dt-border);border-radius:2px;padding:2px 6px;font:inherit;font-size:10px;outline:none";

  const countBadge = document.createElement("span");
  countBadge.style.cssText = `color:${PALETTE.fgDim};font-size:10px;min-width:40px;text-align:right`;

  bar.appendChild(searchInput);
  bar.appendChild(countBadge);

  const grid = document.createElement("div");
  grid.style.cssText =
    "flex:1;overflow:auto;padding:6px;display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px;align-content:start";

  const detail = document.createElement("div");
  detail.style.cssText = `border-top:1px solid var(--dt-border);padding:6px 8px;background:${PALETTE.bg};min-height:120px`;
  detail.innerHTML = `<div style="color:${PALETTE.fgDim}">select a texture</div>`;

  root.appendChild(bar);
  root.appendChild(grid);
  root.appendChild(detail);

  const selected = ref<string | null>(null);
  let filter = "";
  let entries: TextureInfo[] = [];

  searchInput.addEventListener("input", () => {
    filter = searchInput.value.trim().toLowerCase();
    renderGrid();
  });

  function renderGrid(): void {
    const filtered = filter ? entries.filter((t) => t.url.toLowerCase().includes(filter)) : entries;
    countBadge.textContent = filter
      ? `${filtered.length}/${entries.length}`
      : String(entries.length);

    grid.innerHTML = "";
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = entries.length === 0 ? "no textures loaded" : "no matches";
      empty.style.cssText = `color:${PALETTE.fgDim};padding:8px;grid-column:1/-1`;
      grid.appendChild(empty);
      return;
    }

    for (const tex of filtered) {
      const card = document.createElement("div");
      const isSel = selected.value === tex.url;
      card.style.cssText = `display:flex;flex-direction:column;align-items:center;padding:4px;background:${isSel ? PALETTE.selected : "transparent"};border:1px solid ${isSel ? PALETTE.accent : "transparent"};border-radius:3px;cursor:pointer`;

      const thumbWrap = document.createElement("div");
      thumbWrap.style.cssText = `width:64px;height:64px;display:flex;align-items:center;justify-content:center;background:${PALETTE.bg};border:1px solid var(--dt-border);image-rendering:pixelated;overflow:hidden`;
      const img = document.createElement("img");
      img.src = tex.url;
      img.style.cssText =
        "max-width:100%;max-height:100%;image-rendering:pixelated;object-fit:contain";
      img.onerror = () => {
        thumbWrap.textContent = "?";
        thumbWrap.style.color = PALETTE.fgDim;
      };
      thumbWrap.appendChild(img);
      card.appendChild(thumbWrap);

      const name = document.createElement("div");
      const short = tex.url.split("/").pop() ?? tex.url;
      name.textContent = short;
      name.title = tex.url;
      name.style.cssText = `color:${PALETTE.fg};font-size:10px;margin-top:3px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`;
      card.appendChild(name);

      const size = document.createElement("div");
      size.textContent = `${tex.width}×${tex.height}`;
      size.style.cssText = `color:${PALETTE.fgDim};font-size:9px`;
      card.appendChild(size);

      card.addEventListener("click", () => {
        selected.value = tex.url;
        renderGrid();
        renderDetail();
      });
      card.addEventListener("mouseenter", () => {
        if (!isSel) card.style.background = PALETTE.hover;
      });
      card.addEventListener("mouseleave", () => {
        if (!isSel) card.style.background = "transparent";
      });

      grid.appendChild(card);
    }
  }

  function renderDetail(): void {
    const url = selected.value;
    if (!url) {
      detail.innerHTML = `<div style="color:${PALETTE.fgDim}">select a texture</div>`;
      return;
    }
    const tex = entries.find((t) => t.url === url);
    if (!tex) {
      detail.innerHTML = `<div style="color:${PALETTE.fgDim}">texture unloaded</div>`;
      return;
    }
    detail.innerHTML = "";

    const preview = document.createElement("div");
    preview.style.cssText = `width:100%;max-height:240px;display:flex;align-items:center;justify-content:center;background:${PALETTE.bg};border:1px solid var(--dt-border);margin-bottom:4px;overflow:hidden`;
    const img = document.createElement("img");
    img.src = tex.url;
    img.style.cssText = "max-width:100%;max-height:240px;image-rendering:pixelated";
    preview.appendChild(img);
    detail.appendChild(preview);

    const info = document.createElement("div");
    info.style.cssText = `color:${PALETTE.fgMuted};font-size:10px;line-height:1.5`;
    info.innerHTML = `
<div style="color:${PALETTE.fg};word-break:break-all">${tex.url}</div>
<div>size: ${tex.width}×${tex.height}</div>
<div>~memory: ${formatBytes(tex.width * tex.height)}</div>
`;
    detail.appendChild(info);
  }

  function refresh(): void {
    entries = host.textures();
    renderGrid();
    if (selected.value && !entries.find((t) => t.url === selected.value)) {
      selected.value = null;
    }
    renderDetail();
  }

  return { root, refresh };
}

export function assetsPlugin(): DevToolsPlugin {
  const panel: { root: HTMLElement; refresh: () => void } = {
    root: document.createElement("div"),
    refresh: () => {},
  };

  const rootNode: UIChild = { type: "live", element: panel.root, cleanups: new Set() };

  return definePlugin({
    name: "@dalpeng/devtools/assets",
    version: "0.1.0",

    setup(host) {
      const built = buildTexturesPanel(host);
      panel.root.replaceWith(built.root);
      (rootNode as { element: HTMLElement }).element = built.root;
      panel.refresh = built.refresh;

      built.refresh();

      const unwatchScene = watch(host.activeScene, () => built.refresh());

      // TextureManager has no change signal; poll for new textures
      const interval = setInterval(() => built.refresh(), 1000);

      return () => {
        unwatchScene();
        clearInterval(interval);
      };
    },

    panels: [
      {
        id: "textures",
        title: "Textures",
        defaultDock: "right",
        ui: defineUI(() => [rootNode]),
      },
    ],
  });
}
