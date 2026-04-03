import type { Application } from "@dalpeng/core";
import { ErrorTracker, FrameProfiler, Logger } from "@dalpeng/core";
import type { Toast } from "@dalpeng/core";
import { createPersistStore } from "./persist";
import type { ControlGroup } from "../ui/controlGroups";
import HudView from "./views/HudView";
import ControlsView from "./views/ControlsView";
import ProfilerView from "./views/ProfilerView";
import ConsoleView from "./views/ConsoleView";
import InspectorView from "./views/InspectorView";

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface DebugView {
  id: string;
  label: string; // tab button text
  shortcut: string; // keyboard key ("1", "2", etc.)
  mount(container: HTMLElement, app: Application): void;
  unmount(): void;
  update(): void; // called per rAF when active
}

type PanelState = "hidden" | "hud" | "expanded";

export interface DebugPanelOptions {
  position?: Position;
  defaultView?: string; // default expanded view id
  hotkeys?: boolean;
  controls?: ControlGroup[];
}

interface PanelPersistence {
  state: PanelState;
  lastExpandedView?: string;
  position: Position;
}

export interface DebugPanelHandle {
  registerView(view: DebugView): void;
  removeView(id: string): void;
  registerControlGroup(group: ControlGroup): void;
  destroy(): void;
}

class DebugPanel {
  private root: HTMLElement;
  private toastContainer: HTMLElement;
  private header: HTMLElement;
  private content: HTMLElement;
  views = new Map<string, DebugView>();
  private state: PanelState = "hidden";
  private activeViewId: string | null = null;
  private lastExpandedView: string | null = null;
  private store = createPersistStore("dalpeng.debug.panel");
  private position: Position;
  private hotkeysEnabled: boolean;
  private app: Application;
  private rafId: number | null = null;
  private unsubscribeToast: (() => void) | null = null;
  private activeToasts = new Map<number, HTMLElement>();
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private controlGroups: ControlGroup[] = [];
  private controlsView: ControlsView | null = null;

  constructor(app: Application, opts: DebugPanelOptions = {}) {
    this.app = app;
    this.position = opts.position ?? "top-right";
    this.hotkeysEnabled = opts.hotkeys ?? true;

    // Load persisted state
    const persisted = this.store.raw() as Partial<PanelPersistence>;
    this.state = (persisted.state ?? "hidden") as PanelState;
    this.lastExpandedView = persisted.lastExpandedView ?? opts.defaultView ?? null;
    this.position = (persisted.position ?? this.position) as Position;

    // Create root panel
    this.root = this.createRoot();
    this.header = this.createHeader();
    this.content = this.createContent();
    this.root.appendChild(this.header);
    this.root.appendChild(this.content);

    // Create toast container
    this.toastContainer = this.createToastContainer();

    // Apply initial state
    this.applyState();
  }

  private createRoot(): HTMLElement {
    const root = document.createElement("div");
    root.className = "dalpeng-debug-panel";
    Object.assign(root.style, {
      position: "fixed",
      background: "rgba(20, 24, 28, 0.92)",
      color: "#e8eaed",
      font: "11px/1.4 'SF Mono', Monaco, Consolas, monospace",
      borderRadius: "8px",
      backdropFilter: "blur(8px)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      zIndex: "9999",
      transition: "opacity 0.15s ease, transform 0.15s ease",
    } as CSSStyleDeclaration);

    // Position
    const [y, x] = this.position.split("-") as ["top" | "bottom", "left" | "right"];
    if (y === "top") root.style.top = "16px";
    else root.style.bottom = "16px";
    if (x === "left") root.style.left = "16px";
    else root.style.right = "16px";

    return root;
  }

  private createHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "panel-header";
    Object.assign(header.style, {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "8px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
    } as CSSStyleDeclaration);

    const title = document.createElement("span");
    title.textContent = "dalpeng";
    Object.assign(title.style, {
      fontWeight: "600",
      marginRight: "8px",
      color: "rgba(255,255,255,0.8)",
    } as CSSStyleDeclaration);
    header.appendChild(title);

    return header;
  }

  private createContent(): HTMLElement {
    const content = document.createElement("div");
    content.className = "panel-content";
    Object.assign(content.style, {
      padding: "8px 12px",
      maxHeight: "60vh",
      overflowY: "auto",
    } as CSSStyleDeclaration);
    return content;
  }

  private createToastContainer(): HTMLElement {
    const container = document.createElement("div");
    container.className = "dalpeng-toast-container";
    Object.assign(container.style, {
      position: "fixed",
      bottom: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "10000",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      alignItems: "center",
      pointerEvents: "none",
    } as CSSStyleDeclaration);
    return container;
  }

  private createTabButton(view: DebugView): HTMLElement {
    const btn = document.createElement("button");
    btn.textContent = view.label;
    btn.dataset.view = view.id;
    Object.assign(btn.style, {
      padding: "6px 10px",
      background: "transparent",
      color: "rgba(255,255,255,0.6)",
      border: "none",
      borderBottom: "2px solid transparent",
      cursor: "pointer",
      font: "inherit",
      transition: "color 0.15s ease, border-color 0.15s ease",
    } as CSSStyleDeclaration);

    btn.addEventListener("click", () => {
      if (view.id === "hud" && this.state === "expanded") {
        this.setState("hud");
      } else {
        this.switchView(view.id);
      }
    });

    btn.addEventListener("mouseenter", () => {
      if (this.activeViewId !== view.id) {
        btn.style.color = "rgba(255,255,255,0.8)";
      }
    });

    btn.addEventListener("mouseleave", () => {
      if (this.activeViewId !== view.id) {
        btn.style.color = "rgba(255,255,255,0.6)";
      }
    });

    return btn;
  }

  private updateTabButtons(): void {
    // Clear existing buttons
    while (this.header.children.length > 1) {
      this.header.removeChild(this.header.lastChild!);
    }

    // Add tab buttons for all views
    this.views.forEach((view) => {
      const btn = this.createTabButton(view);
      this.header.appendChild(btn);

      // Highlight active view
      if (this.activeViewId === view.id) {
        btn.style.color = "#4285f4";
        btn.style.borderBottomColor = "#4285f4";
      }
    });
  }

  registerView(view: DebugView): void {
    this.views.set(view.id, view);
    if (this.state === "expanded") {
      this.updateTabButtons();
    }
  }

  registerControlGroup(group: ControlGroup): void {
    this.controlGroups.push(group);

    // Auto-create ControlsView on first group registration
    if (!this.controlsView) {
      this.controlsView = new ControlsView();
      this.registerView(this.controlsView);
    }

    this.controlsView.setGroups(this.controlGroups);

    // If currently showing controls, remount to pick up new groups
    if (this.activeViewId === "controls" && this.state === "expanded") {
      this.switchView("controls");
    }
  }

  private switchView(viewId: string): void {
    const view = this.views.get(viewId);
    if (!view) return;

    // Unmount current view
    if (this.activeViewId) {
      const current = this.views.get(this.activeViewId);
      if (current) {
        current.unmount();
      }
    }

    // Clear content with fade
    this.content.style.opacity = "0";
    setTimeout(() => {
      this.content.innerHTML = "";

      // Mount new view
      view.mount(this.content, this.app);
      this.activeViewId = viewId;

      // Remember expanded view (except HUD)
      if (viewId !== "hud") {
        this.lastExpandedView = viewId;
        this.store.set("lastExpandedView", viewId);
      }

      // Update tab buttons
      this.updateTabButtons();

      // Fade in
      this.content.style.opacity = "1";
    }, 150);
  }

  private setState(newState: PanelState): void {
    this.state = newState;
    this.store.set("state", newState);
    this.applyState();
  }

  private applyState(): void {
    switch (this.state) {
      case "hidden":
        this.root.style.display = "none";
        if (this.activeViewId) {
          const view = this.views.get(this.activeViewId);
          if (view) view.unmount();
          this.activeViewId = null;
        }
        break;

      case "hud": {
        this.root.style.display = "block";
        this.header.style.display = "none";
        this.root.style.width = "auto";
        this.content.style.padding = "8px 12px";

        const hudView = this.views.get("hud");
        if (hudView) {
          this.switchView("hud");
        }
        break;
      }

      case "expanded": {
        this.root.style.display = "block";
        this.header.style.display = "flex";
        this.root.style.width = "340px";
        this.content.style.padding = "8px 12px";

        // Switch to last expanded view or first non-HUD view
        const targetView = this.lastExpandedView
          ? this.views.get(this.lastExpandedView)
          : Array.from(this.views.values()).find((v) => v.id !== "hud");

        if (targetView) {
          this.switchView(targetView.id);
        }
        break;
      }
    }
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (!this.hotkeysEnabled) return;

    // Ignore if typing in input/textarea
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    // ` (backtick) - toggle panel
    if (e.key === "`") {
      e.preventDefault();
      if (this.state === "hidden") {
        // Restore to last state (hud or expanded)
        const lastState = this.store.get<PanelState>("state", "hud");
        this.setState(lastState === "hidden" ? "hud" : lastState);
      } else {
        const currentState = this.state;
        this.setState("hidden");
        // Save current state for restoration
        this.store.set("state", currentState);
      }
      return;
    }

    // Escape - minimize
    if (e.key === "Escape") {
      e.preventDefault();
      if (this.state === "expanded") {
        this.setState("hud");
      } else if (this.state === "hud") {
        this.setState("hidden");
      }
      return;
    }

    // Number keys - switch views
    if (this.state === "expanded") {
      const viewsArray = Array.from(this.views.values());
      const view = viewsArray.find((v) => v.shortcut === e.key);
      if (view) {
        e.preventDefault();
        if (view.id === "hud") {
          this.setState("hud");
        } else {
          this.switchView(view.id);
        }
      }
    }

    // In HUD mode, clicking or pressing keys can expand
    if (this.state === "hud" && e.key >= "2" && e.key <= "9") {
      const viewsArray = Array.from(this.views.values());
      const view = viewsArray.find((v) => v.shortcut === e.key);
      if (view && view.id !== "hud") {
        e.preventDefault();
        this.lastExpandedView = view.id;
        this.setState("expanded");
      }
    }
  };

  private showToast(toast: Toast): void {
    // Remove oldest toast if we have 3
    if (this.activeToasts.size >= 3) {
      const oldestId = Array.from(this.activeToasts.keys())[0];
      const oldestEl = this.activeToasts.get(oldestId);
      if (oldestEl) {
        this.dismissToast(oldestId, oldestEl);
      }
    }

    const toastEl = document.createElement("div");
    Object.assign(toastEl.style, {
      position: "relative",
      background: "rgba(30, 34, 38, 0.95)",
      borderLeft: `3px solid ${toast.severity === "error" ? "#f44336" : "#ff9800"}`,
      padding: "8px 16px",
      borderRadius: "6px",
      font: "11px/1.4 'SF Mono', Monaco, Consolas, monospace",
      color: "#e8eaed",
      cursor: "pointer",
      pointerEvents: "auto",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      minWidth: "200px",
      maxWidth: "400px",
      opacity: "0",
      transform: "translateY(10px)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
    } as CSSStyleDeclaration);

    const message = document.createElement("div");
    message.textContent = toast.message;
    Object.assign(message.style, {
      fontWeight: "600",
      marginBottom: "2px",
    } as CSSStyleDeclaration);

    const detail = document.createElement("div");
    detail.textContent = toast.detail;
    Object.assign(detail.style, {
      fontSize: "10px",
      color: "rgba(255,255,255,0.6)",
    } as CSSStyleDeclaration);

    toastEl.appendChild(message);
    toastEl.appendChild(detail);

    toastEl.addEventListener("click", () => {
      // Switch to inspector view + errors tab
      this.setState("expanded");
      this.switchView("inspector");
      this.dismissToast(toast.id, toastEl);
    });

    this.toastContainer.appendChild(toastEl);
    this.activeToasts.set(toast.id, toastEl);

    // Trigger animation
    requestAnimationFrame(() => {
      toastEl.style.opacity = "1";
      toastEl.style.transform = "translateY(0)";
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (this.activeToasts.has(toast.id)) {
        this.dismissToast(toast.id, toastEl);
      }
    }, 5000);
  }

  private dismissToast(id: number, el: HTMLElement): void {
    el.style.opacity = "0";
    el.style.transform = "translateY(-10px)";
    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
      this.activeToasts.delete(id);
    }, 300);
  }

  private update = (): void => {
    if (this.state !== "hidden" && this.activeViewId) {
      const view = this.views.get(this.activeViewId);
      if (view) {
        view.update();
      }
    }
    this.rafId = requestAnimationFrame(this.update);
  };

  mount(): void {
    document.body.appendChild(this.root);
    document.body.appendChild(this.toastContainer);

    // Set up keyboard listeners
    this.keydownHandler = this.handleKeydown.bind(this);
    window.addEventListener("keydown", this.keydownHandler);

    // Set up toast subscription
    this.unsubscribeToast = ErrorTracker.onToast((toast) => {
      this.showToast(toast);
    });

    // Start update loop
    this.rafId = requestAnimationFrame(this.update);

    // Add click handler to HUD content to expand
    this.content.addEventListener("click", () => {
      if (this.state === "hud") {
        this.setState("expanded");
      }
    });
  }

  unmount(): void {
    // Stop update loop
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Unmount active view
    if (this.activeViewId) {
      const view = this.views.get(this.activeViewId);
      if (view) view.unmount();
    }

    // Remove event listeners
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }

    // Unsubscribe from toasts
    if (this.unsubscribeToast) {
      this.unsubscribeToast();
      this.unsubscribeToast = null;
    }

    // Remove from DOM
    if (this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    if (this.toastContainer.parentNode) {
      this.toastContainer.parentNode.removeChild(this.toastContainer);
    }
  }
}


export function enableDebugPanel(
  app: Application,
  opts?: DebugPanelOptions
): DebugPanelHandle {
  // Enable core debug systems
  FrameProfiler.enabled = true;
  Logger.enabled = true;

  const panel = new DebugPanel(app, opts);

  // Register universal debug views (no ControlsView - it's added when control groups are registered)
  panel.registerView(new HudView());
  panel.registerView(new ProfilerView());
  panel.registerView(new ConsoleView());
  panel.registerView(new InspectorView());

  // Mount panel
  panel.mount();

  // Auto-register control groups from options
  if (opts?.controls) {
    for (const group of opts.controls) {
      panel.registerControlGroup(group);
    }
  }

  // Return handle
  return {
    registerView(view: DebugView) {
      panel.registerView(view);
    },
    removeView(id: string) {
      panel.views.delete(id);
    },
    registerControlGroup(group: ControlGroup) {
      panel.registerControlGroup(group);
    },
    destroy() {
      panel.unmount();
      FrameProfiler.enabled = false;
      Logger.enabled = false;
    },
  };
}
