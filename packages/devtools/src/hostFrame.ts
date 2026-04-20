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

/**
 * Stage CSS properties the dock overrides while attached. Saving and
 * restoring these preserves whatever styling the author put on the stage
 * (e.g., `width:100%; height:100%`), so detaching leaves no trace.
 */
const STAGE_RESET_PROPS = [
  "flex",
  "minWidth",
  "minHeight",
  "width",
  "height",
  "maxWidth",
  "maxHeight",
] as const satisfies readonly (keyof CSSStyleDeclaration)[];

type SavedCSSProps = Record<(typeof STAGE_RESET_PROPS)[number], string>;

function captureCSSProps(el: HTMLElement, keys: typeof STAGE_RESET_PROPS): SavedCSSProps {
  const saved = {} as SavedCSSProps;
  for (const key of keys) saved[key] = el.style[key] as string;
  return saved;
}

function restoreCSSProps(el: HTMLElement, saved: SavedCSSProps): void {
  for (const key of Object.keys(saved) as Array<keyof SavedCSSProps>) {
    el.style[key] = saved[key];
  }
}

interface StageLayoutAttachment {
  /** Flex container that dalpeng created to house stage + dock. */
  readonly wrapper: HTMLElement;
  /** The canvas's original parent element (the "stage"). */
  readonly stage: HTMLElement;
  /** The stage's original parent — where `wrapper` now lives. */
  readonly stageHost: HTMLElement;
  /** CSS we took from the stage on attach; restored on detach. */
  readonly savedStage: SavedCSSProps;
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

  /** Layout attachment — tracks what we mutated so we can restore it. */
  #layout: StageLayoutAttachment | null = null;
  #explicitContainer: HTMLElement | null;

  constructor(app: Application, registry: PluginRegistry, opts: DevToolsRootHostOptions = {}) {
    this.#app = app;
    this.#registry = registry;
    this.#ownerDoc = opts.ownerDoc ?? document;
    this.#layoutMode = opts.layout ?? "dock";
    this.#settings = getSettings();
    this.#explicitContainer = opts.container ?? null;

    const root = this.#ownerDoc.createElement("div");
    root.id = "dalpeng-devtools-root";
    Object.assign(root.style, this.#baseRootStyle());
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

    // Fill and popped-out modes do not participate in the page layout —
    // they own their container. Detach any active stage-host attachment.
    if (this.#layoutMode === "fill" || this.#poppedWindow) {
      this.#detachFromStageHost();
      Object.assign(root.style, {
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        width: "auto",
        flex: "",
        borderLeft: "none",
        borderRight: "none",
        boxShadow: "none",
      } satisfies Partial<CSSStyleDeclaration>);
      if (!root.isConnected) {
        (this.#explicitContainer ?? this.#ownerDoc.body).appendChild(root);
      }
      return;
    }

    // Dock mode: wrap the canvas's stage inside our own flex container and
    // park the dock next to it. See #attachToStageHost for the rationale.
    const side = this.#settings.side.value;
    const width = `${this.#settings.width.value}px`;

    Object.assign(root.style, {
      position: "relative",
      top: "",
      bottom: "",
      left: "",
      right: "",
      width,
      height: "auto",
      alignSelf: "stretch",
      flex: "0 0 auto",
      zIndex: "",
      boxShadow: side === "right" ? "-2px 0 12px var(--dt-shadow)" : "2px 0 12px var(--dt-shadow)",
      borderLeft: side === "right" ? "1px solid var(--dt-border)" : "none",
      borderRight: side === "left" ? "1px solid var(--dt-border)" : "none",
    } satisfies Partial<CSSStyleDeclaration>);

    const attached = this.#attachToStageHost(side);
    if (!attached) {
      // No suitable stage found — fall back to fixed overlay so the panel
      // is still visible, but the canvas will end up hidden behind it.
      Object.assign(root.style, {
        position: "fixed",
        top: "0",
        bottom: "0",
        width,
        height: "auto",
        flex: "",
        zIndex: "2147483646",
        ...(side === "right"
          ? { right: "0", left: "auto" }
          : { left: "0", right: "auto" }),
      } satisfies Partial<CSSStyleDeclaration>);
      if (!root.isConnected) {
        (this.#explicitContainer ?? this.#ownerDoc.body).appendChild(root);
      }
    }
  }

  /**
   * Wrap the canvas's stage element (canvas.parentElement) inside a
   * dalpeng-owned flex container so the dock becomes a flex sibling of the
   * stage, not an overlay. The wrapper replaces the stage's position in the
   * original stage-host; `#detachFromStageHost` reverses the operation.
   *
   * Returns false when the attach cannot be performed (no canvas, no parent
   * element, or stage is the body itself) — the caller should fall back to
   * a fixed-position overlay in that case.
   */
  #attachToStageHost(side: "left" | "right"): boolean {
    if (this.#layout) {
      // Already attached — just update direction/position for side changes.
      this.#updateLayoutDirection(side);
      if (!this.#rootDiv.isConnected) {
        this.#layout.wrapper.appendChild(this.#rootDiv);
      }
      return true;
    }

    const canvas = this.#app.canvasController.canvas;
    const stage = canvas?.parentElement ?? null;
    const stageHost = stage?.parentElement ?? null;
    if (!canvas || !stage || !stageHost) return false;
    if (stage === this.#ownerDoc.body) return false;

    const wrapper = this.#ownerDoc.createElement("div");
    wrapper.className = "dalpeng-devtools-layout";
    Object.assign(wrapper.style, {
      display: "flex",
      flexDirection: side === "right" ? "row" : "row-reverse",
      width: "100%",
      height: "100%",
      minWidth: "0",
      minHeight: "0",
    } satisfies Partial<CSSStyleDeclaration>);

    const savedStage: SavedCSSProps = captureCSSProps(stage, STAGE_RESET_PROPS);

    // Put wrapper where stage was, then move stage inside wrapper.
    stageHost.insertBefore(wrapper, stage);
    wrapper.appendChild(stage);
    wrapper.appendChild(this.#rootDiv);

    Object.assign(stage.style, {
      flex: "1 1 0",
      minWidth: "0",
      minHeight: "0",
      width: "auto",
      height: "auto",
      maxWidth: "none",
      maxHeight: "none",
    } satisfies Partial<CSSStyleDeclaration>);

    this.#layout = { wrapper, stage, stageHost, savedStage };
    return true;
  }

  #updateLayoutDirection(side: "left" | "right"): void {
    if (!this.#layout) return;
    this.#layout.wrapper.style.flexDirection = side === "right" ? "row" : "row-reverse";
  }

  #detachFromStageHost(): void {
    if (!this.#layout) return;
    const { wrapper, stage, stageHost, savedStage } = this.#layout;

    // Move stage back to its original parent position (before the wrapper).
    if (wrapper.parentElement === stageHost) {
      stageHost.insertBefore(stage, wrapper);
    } else if (stage.isConnected) {
      // Wrapper already detached — leave stage where it is.
    }

    restoreCSSProps(stage, savedStage);

    // Detach the dock from the wrapper before removing it, so the caller can
    // re-parent it (e.g., to a popup window or back to the body).
    if (this.#rootDiv.parentElement === wrapper) {
      this.#rootDiv.remove();
    }
    wrapper.remove();

    this.#layout = null;
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

    // Return UIChild (Split/Tabs) directly rather than wrapping in defineUI.
    // A defineUI wrapper creates an intrinsic-height flex container that, when
    // placed inside the outer HostFrame flex column, collapses to 0 height —
    // which is what caused the whole workspace to disappear. Split/Tabs
    // renderers set flex:1 on their own containers, so passing them as a
    // UIChild lets layout flow correctly.
    const renderTabsAsChild = (node: TabsNode): UIChild => {
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
      return Tabs({
        tabs: tabsRef,
        active,
        onDragStart: (panelKey, ev) => this.#beginTabDrag(panelKey, ev),
        dataAttrs: { devtoolsTabs: node.id },
      });
    };

    const renderLayoutAsChild = (node: LayoutNode): UIChild => {
      if (node.kind === "split") {
        const sizes = this.#getSizesRef(node);
        // Split.slots expects UINode[]; renderSplit applies flex:1 to each
        // slot container, so the inner UINode wrapper there is harmless.
        const slots = node.children.map((c) =>
          defineUI(() => [renderLayoutAsChild(c)])()
        );
        return Split({ direction: node.direction, sizes, slots });
      }
      return renderTabsAsChild(node);
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
      const workspaceNode = renderLayoutAsChild(ws.main);
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
    if (!popup) {
      this.#showPopupBlockedBanner();
      return null;
    }
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

  /**
   * Show a short-lived inline banner inside the dock when `window.open`
   * returns null (browser popup blocker). Silent failure used to be the
   * default — user clicked the ⇗ button and nothing happened.
   */
  #showPopupBlockedBanner(): void {
    const host = this.#uiElement ?? this.#rootDiv;
    if (!host) return;
    const banner = this.#ownerDoc.createElement("div");
    banner.textContent = "⚠ Popup blocked — allow popups for this origin to pop the dock out.";
    Object.assign(banner.style, {
      position: "absolute",
      top: "4px",
      left: "4px",
      right: "4px",
      padding: "6px 10px",
      background: "var(--dt-bg-sunken, #1a1d23)",
      color: "var(--dt-fg, #e6e8ec)",
      border: "1px solid var(--dt-accent, #f59e0b)",
      borderRadius: "3px",
      fontSize: "11px",
      zIndex: "2147483647",
      pointerEvents: "none",
    } satisfies Partial<CSSStyleDeclaration>);
    host.appendChild(banner);
    setTimeout(() => banner.remove(), 4000);
  }

  destroy(): void {
    this.#unwatchPanels();
    for (const u of this.#unwatchSettings) u();
    this.#unwatchSettings = [];
    this.#unmountHostUI();
    this.#detachFromStageHost();
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
