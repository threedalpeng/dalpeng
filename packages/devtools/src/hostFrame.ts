import {
  computed,
  ref,
  watch,
  type Application,
  type ReadonlyRef,
  type Ref,
  type UINode,
} from "@dalpeng/core";
import {
  Floating,
  For,
  Split,
  Tabs,
  Text,
  defineUI,
  renderUI,
  type TabSpec,
  type UIChild,
} from "@dalpeng/ui";
import {
  collectAllKeys,
  dropPanelOnTabs,
  ensurePanelInWorkspace,
  findTabsForPanel,
  removePanel,
  type DropZone,
  type LayoutNode,
  type SplitNode,
  type TabsNode,
} from "./layout";
import type { PluginRegistry, RegisteredPanel } from "./registry";
import {
  applySizingVariables,
  applyThemeVariables,
  getSettings,
  getTheme,
  listThemes,
  type DevToolsSettings,
} from "./settings";

export interface DevToolsRootHostOptions {
  container?: HTMLElement;
  ownerDoc?: Document;
  layout?: "dock" | "fill";
}

export class DevToolsRootHost {
  #app: Application;
  #ownerDoc: Document;
  #layoutMode: "dock" | "fill";
  #settings: DevToolsSettings;
  #registry: PluginRegistry;

  #rootDiv: HTMLElement;
  #uiCleanups: Set<() => void> = new Set();
  #uiElement: HTMLElement | null = null;

  #settingsPopoverOpen = ref(false);

  #tabsActiveRefs = new Map<string, Ref<number>>();
  #splitSizesRefs = new Map<string, Ref<number[]>>();

  #unwatchPanels: () => void;
  #unwatchSettings: Array<() => void> = [];

  #poppedWindow: Window | null = null;
  #onPopupBeforeUnload: (() => void) | null = null;

  constructor(app: Application, registry: PluginRegistry, opts: DevToolsRootHostOptions = {}) {
    this.#app = app;
    this.#registry = registry;
    this.#ownerDoc = opts.ownerDoc ?? document;
    this.#layoutMode = opts.layout ?? "dock";
    this.#settings = getSettings();

    const root = this.#ownerDoc.createElement("div");
    root.id = "dalpeng-devtools-root";
    Object.assign(root.style, this.#baseRootStyle());
    (opts.container ?? this.#ownerDoc.body).appendChild(root);
    this.#rootDiv = root;

    this.#applyAllStyles();
    this.#applyDockLayout();
    this.#mountHostUI();

    this.#unwatchPanels = watch(
      this.#registry.panels,
      (panels) => this.#syncWorkspaceWithPanels(panels),
      { immediate: true }
    );

    this.#unwatchSettings.push(
      watch(this.#settings.theme, () => this.#applyTheme()),
      watch(this.#settings.fontSize, () => this.#applySizing()),
      watch(this.#settings.density, () => this.#applySizing()),
      watch(this.#settings.side, () => this.#applyDockLayout()),
      watch(this.#settings.width, () => this.#applyDockLayout()),
      watch(this.#settings.workspace, () => {
        this.#unmountHostUI();
        this.#tabsActiveRefs.clear();
        this.#splitSizesRefs.clear();
        this.#mountHostUI();
      })
    );
  }

  #baseRootStyle(): Partial<CSSStyleDeclaration> {
    return {
      background: "var(--dt-bg)",
      color: "var(--dt-fg)",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: "var(--dt-font-size)",
      display: "flex",
      flexDirection: "column",
      pointerEvents: "auto",
      overflow: "hidden",
      backdropFilter: "blur(6px)",
    };
  }

  #applyAllStyles(): void {
    this.#applyTheme();
    this.#applySizing();
  }

  #applyTheme(): void {
    applyThemeVariables(this.#rootDiv, getTheme(this.#settings.theme.value));
  }

  #applySizing(): void {
    applySizingVariables(
      this.#rootDiv,
      this.#settings.fontSize.value,
      this.#settings.density.value
    );
  }

  #applyDockLayout(): void {
    const root = this.#rootDiv;
    if (this.#layoutMode === "fill") {
      Object.assign(root.style, {
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        width: "auto",
        borderLeft: "none",
        borderRight: "none",
        boxShadow: "none",
      } satisfies Partial<CSSStyleDeclaration>);
      return;
    }
    const side = this.#settings.side.value;
    const width = `${this.#settings.width.value}px`;
    Object.assign(root.style, {
      position: "fixed",
      top: "0",
      bottom: "0",
      width,
      zIndex: "2147483646",
      ...(side === "right"
        ? {
            right: "0",
            left: "auto",
            borderLeft: "1px solid var(--dt-border)",
            borderRight: "none",
            boxShadow: "-2px 0 12px var(--dt-shadow)",
          }
        : {
            left: "0",
            right: "auto",
            borderRight: "1px solid var(--dt-border)",
            borderLeft: "none",
            boxShadow: "2px 0 12px var(--dt-shadow)",
          }),
    } satisfies Partial<CSSStyleDeclaration>);
  }

  #syncWorkspaceWithPanels(panels: readonly RegisteredPanel[]): void {
    const ws = this.#settings.workspace.value;
    const knownInWs = collectAllKeys(ws);
    let mutated = false;
    for (const p of panels) {
      if (!knownInWs.has(p.key)) {
        ensurePanelInWorkspace(ws, p.key);
        mutated = true;
      }
    }
    if (mutated) {
      this.#settings.workspace.value = { ...ws };
    }
  }

  #getActiveRef(tabsNode: TabsNode): Ref<number> {
    let r = this.#tabsActiveRefs.get(tabsNode.id);
    if (r) return r;
    r = ref(tabsNode.activeIdx);
    this.#tabsActiveRefs.set(tabsNode.id, r);
    watch(r, (v) => {
      tabsNode.activeIdx = v;
      this.#settings.workspace.value = { ...this.#settings.workspace.value };
    });
    return r;
  }

  #getSizesRef(splitNode: SplitNode): Ref<number[]> {
    let r = this.#splitSizesRefs.get(splitNode.id);
    if (r) return r;
    r = ref(splitNode.sizes);
    this.#splitSizesRefs.set(splitNode.id, r);
    watch(r, (v) => {
      splitNode.sizes = [...v];
      this.#settings.workspace.value = { ...this.#settings.workspace.value };
    });
    return r;
  }

  #findPanel(key: string): RegisteredPanel | null {
    return this.#registry.panels.value.find((p) => p.key === key) ?? null;
  }

  #mountHostUI(): void {
    const HostFrame = this.#defineHostFrame();
    const result = renderUI(HostFrame, {
      doc: this.#ownerDoc,
      features: this.#app.features as Record<string, any>,
      watchFeature: this.#app.watchFeature,
    });
    result.element.style.flex = "1";
    result.element.style.minHeight = "0";
    result.element.style.display = "flex";
    result.element.style.flexDirection = "column";
    this.#rootDiv.appendChild(result.element);
    this.#uiElement = result.element;
    this.#uiCleanups = result.cleanups;
  }

  #unmountHostUI(): void {
    if (this.#uiElement) {
      this.#uiElement.remove();
      this.#uiElement = null;
    }
    this.#uiCleanups.forEach((fn) => fn());
    this.#uiCleanups = new Set();
  }

  #defineHostFrame(): UINode {
    const emptyPanel = (): UINode => defineUI(() => [Text("(missing panel)")])();

    const renderTabs = (node: TabsNode): UINode => {
      const active = this.#getActiveRef(node);
      const tabsRef: ReadonlyRef<TabSpec[]> = computed(() => {
        const out: TabSpec[] = [];
        for (const key of node.panelKeys) {
          const reg = this.#findPanel(key);
          out.push({
            id: key,
            title: reg ? reg.panel.title : (key.split(":").pop() ?? key),
            body: reg ? reg.panel.ui() : emptyPanel(),
          });
        }
        return out;
      });
      return defineUI(() => [
        Tabs({
          tabs: tabsRef,
          active,
          onDragStart: (panelKey, ev) => this.#beginTabDrag(panelKey, ev),
          dataAttrs: { devtoolsTabs: node.id },
        }),
      ])();
    };

    const renderLayout = (node: LayoutNode): UINode => {
      if (node.kind === "split") {
        const sizes = this.#getSizesRef(node);
        const slots = node.children.map((c) => renderLayout(c));
        return defineUI(() => [Split({ direction: node.direction, sizes, slots })])();
      }
      return renderTabs(node);
    };

    const footerEl = this.#buildFooterElement();

    const SettingsPopover = defineUI(() => {
      const themes = listThemes();
      return [
        Text("preferences", { size: 11, color: "var(--dt-fg-muted)" }),
        For<string>({
          items: ref(themes) as ReadonlyRef<string[]>,
          render: (name) =>
            defineUI(() => [
              {
                type: "button",
                label: name,
                onClick: () => {
                  this.#settings.theme.value = name as never;
                },
              },
            ])(),
        }),
        Text("font", { size: 11, color: "var(--dt-fg-muted)" }),
        For<string>({
          items: ref(["small", "medium", "large"]) as ReadonlyRef<string[]>,
          render: (name) =>
            defineUI(() => [
              {
                type: "button",
                label: name,
                onClick: () => {
                  this.#settings.fontSize.value = name as never;
                },
              },
            ])(),
        }),
        Text("density", { size: 11, color: "var(--dt-fg-muted)" }),
        For<string>({
          items: ref(["compact", "comfortable"]) as ReadonlyRef<string[]>,
          render: (name) =>
            defineUI(() => [
              {
                type: "button",
                label: name,
                onClick: () => {
                  this.#settings.density.value = name as never;
                },
              },
            ])(),
        }),
      ];
    });

    return defineUI(() => {
      const ws = this.#settings.workspace.value;
      const workspaceNode: UIChild = {
        type: "ui",
        descriptor: renderLayout(ws.main),
      };
      const footerNode: UIChild = {
        type: "live",
        element: footerEl,
      };
      const popoverNode = Floating({
        body: SettingsPopover(),
        visible: this.#settingsPopoverOpen,
        x: 12,
        y: 60,
        closeOnEsc: true,
        closeOnOutside: true,
      });
      return [workspaceNode, footerNode, popoverNode];
    })();
  }

  #buildFooterElement(): HTMLElement {
    const doc = this.#ownerDoc;
    const footer = doc.createElement("div");
    Object.assign(footer.style, {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      borderTop: "1px solid var(--dt-border)",
      background: "var(--dt-bg-muted)",
      flexShrink: "0",
      minHeight: "26px",
      padding: "0 6px",
      color: "var(--dt-fg-muted)",
    } satisfies Partial<CSSStyleDeclaration>);

    const spacer = doc.createElement("div");
    spacer.style.flex = "1";

    const btn = (label: string, title: string, onClick: () => void): HTMLButtonElement => {
      const b = doc.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.title = title;
      Object.assign(b.style, {
        background: "transparent",
        color: "var(--dt-fg-muted)",
        border: "none",
        padding: "0 10px",
        height: "100%",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "14px",
        flexShrink: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      } satisfies Partial<CSSStyleDeclaration>);
      b.addEventListener("click", onClick);
      return b;
    };

    const settingsBtn = btn("⚙", "Preferences", () => {
      this.#settingsPopoverOpen.value = !this.#settingsPopoverOpen.value;
    });
    const flipBtn = btn("⇤", "Flip dock side", () => {
      this.#settings.side.value = this.#settings.side.value === "right" ? "left" : "right";
    });
    const updateFlipLabel = () => {
      const onRight = this.#settings.side.value === "right";
      flipBtn.textContent = onRight ? "⇤" : "⇥";
      flipBtn.title = onRight ? "Move dock to left side" : "Move dock to right side";
    };
    updateFlipLabel();
    this.#unwatchSettings.push(watch(this.#settings.side, updateFlipLabel));

    const popOutBtn = btn("⇗", "Open in new window", () => this.popOut());

    footer.appendChild(spacer);
    footer.appendChild(settingsBtn);
    footer.appendChild(flipBtn);
    footer.appendChild(popOutBtn);
    return footer;
  }

  #beginTabDrag(panelKey: string, downEv: MouseEvent): void {
    downEv.preventDefault();

    const ghost = this.#ownerDoc.createElement("div");
    const reg = this.#findPanel(panelKey);
    ghost.textContent = reg ? reg.panel.title : panelKey;
    Object.assign(ghost.style, {
      position: "fixed",
      top: `${downEv.clientY + 6}px`,
      left: `${downEv.clientX + 6}px`,
      padding: "4px 10px",
      background: "var(--dt-selected)",
      color: "var(--dt-fg)",
      border: "1px solid var(--dt-accent)",
      borderRadius: "4px",
      fontFamily: "inherit",
      fontSize: "var(--dt-font-size)",
      pointerEvents: "none",
      zIndex: "2147483647",
      opacity: "0.85",
      boxShadow: "0 4px 12px var(--dt-shadow)",
    } satisfies Partial<CSSStyleDeclaration>);
    this.#ownerDoc.body.appendChild(ghost);

    const tabsBodyEls: { el: HTMLElement; tabsId: string }[] = [];

    const onMove = (moveEv: MouseEvent) => {
      ghost.style.top = `${moveEv.clientY + 6}px`;
      ghost.style.left = `${moveEv.clientX + 6}px`;
    };

    const onUp = (upEv: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      ghost.remove();
      void tabsBodyEls;

      // elementsFromPoint returns a z-ordered list; walk it to find the
      // nearest ancestor with a devtoolsTabs dataset attribute.
      const targets = this.#ownerDoc.elementsFromPoint(upEv.clientX, upEv.clientY);
      let targetEl: HTMLElement | null = null;
      for (const el of targets) {
        const e = el as HTMLElement;
        if (e.dataset && e.dataset.devtoolsTabs) {
          targetEl = e;
          break;
        }
        let cur: HTMLElement | null = e.parentElement;
        while (cur && !cur.dataset?.devtoolsTabs) cur = cur.parentElement;
        if (cur) {
          targetEl = cur;
          break;
        }
      }

      const ws = { ...this.#settings.workspace.value };
      const sourceTabs = findTabsForPanel(ws, panelKey);
      if (!sourceTabs) return;

      if (!targetEl) {
        return;
      }

      const targetTabsId = targetEl.dataset.devtoolsTabs as string;
      if (targetTabsId === sourceTabs.id) return;

      const rect = targetEl.getBoundingClientRect();
      const zone = this.#computeDropZone(upEv.clientX, upEv.clientY, rect);

      removePanel(ws, panelKey);
      dropPanelOnTabs(ws, panelKey, targetTabsId, zone);
      this.#settings.workspace.value = { ...ws };
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  #computeDropZone(cx: number, cy: number, rect: DOMRect): DropZone {
    // Normalise cursor to [0,1] within the target rect.
    const x = (cx - rect.left) / rect.width;
    const y = (cy - rect.top) / rect.height;
    // Central 50% of each axis is "center" (merge into tab group).
    if (x > 0.25 && x < 0.75 && y > 0.25 && y < 0.75) return "center";
    // Otherwise find the closest edge.
    const dxLeft = x;
    const dxRight = 1 - x;
    const dyTop = y;
    const dyBottom = 1 - y;
    const minH = Math.min(dxLeft, dxRight);
    const minV = Math.min(dyTop, dyBottom);
    if (minH < minV) {
      return dxLeft < dxRight ? "left" : "right";
    } else {
      return dyTop < dyBottom ? "top" : "bottom";
    }
  }

  /**
   * Drop an arbitrary `UINode` into a free-floating overlay above the
   * dock. Most plugins should use `panels: []` instead — this path does not
   * participate in the saved workspace layout.
   */
  attachOverlay(descriptor: UINode): { detach(): void } {
    const wrap = this.#ownerDoc.createElement("div");
    Object.assign(wrap.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "auto",
      zIndex: "5",
    } satisfies Partial<CSSStyleDeclaration>);
    this.#rootDiv.appendChild(wrap);
    const result = renderUI(descriptor, {
      doc: this.#ownerDoc,
      features: this.#app.features as Record<string, any>,
      watchFeature: this.#app.watchFeature,
    });
    wrap.appendChild(result.element);
    return {
      detach: () => {
        result.cleanups.forEach((fn) => fn());
        wrap.remove();
      },
    };
  }

  popOut(width = 520, height = 800): Window | null {
    if (this.#poppedWindow && !this.#poppedWindow.closed) {
      this.#poppedWindow.focus();
      return this.#poppedWindow;
    }
    const popup = window.open(
      "about:blank",
      "dalpeng-devtools",
      `width=${width},height=${height},resizable=yes,scrollbars=no`
    );
    if (!popup) return null;
    popup.document.title = "Dalpeng DevTools";
    Object.assign(popup.document.body.style, {
      margin: "0",
      padding: "0",
      background: "var(--dt-bg-sunken, #0a0c10)",
      color: "var(--dt-fg, #e6e8ec)",
      overflow: "hidden",
    } satisfies Partial<CSSStyleDeclaration>);
    popup.document.body.appendChild(this.#rootDiv);
    this.#layoutMode = "fill";
    this.#applyDockLayout();
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") popup.close();
    };
    popup.addEventListener("keydown", handleKey);
    const handleUnload = () => {
      this.#poppedWindow = null;
      this.#onPopupBeforeUnload = null;
      try {
        this.#ownerDoc.body.appendChild(this.#rootDiv);
      } catch {
        return;
      }
      this.#layoutMode = "dock";
      this.#applyDockLayout();
    };
    popup.addEventListener("beforeunload", handleUnload);
    this.#poppedWindow = popup;
    this.#onPopupBeforeUnload = handleUnload;
    return popup;
  }

  destroy(): void {
    this.#unwatchPanels();
    for (const u of this.#unwatchSettings) u();
    this.#unwatchSettings = [];
    this.#unmountHostUI();
    if (this.#poppedWindow && !this.#poppedWindow.closed) {
      if (this.#onPopupBeforeUnload) {
        this.#poppedWindow.removeEventListener("beforeunload", this.#onPopupBeforeUnload);
      }
      this.#poppedWindow.close();
      this.#poppedWindow = null;
      this.#onPopupBeforeUnload = null;
    }
    this.#rootDiv.remove();
  }
}
