import type { DebugView } from "../panel";
import { ErrorTracker } from "@dalpeng/core";
import type { Application } from "@dalpeng/core";

export default class InspectorView implements DebugView {
  id = "inspector";
  label = "GL";
  shortcut = "5";

  #app!: Application;
  #activeTab: "state" | "errors" = "state";
  #stateContent!: HTMLElement;
  #errorsContent!: HTMLElement;
  #stateTabBtn!: HTMLButtonElement;
  #errorsTabBtn!: HTMLButtonElement;
  #lastUpdate = 0;

  mount(container: HTMLElement, app: Application): void {
    this.#app = app;
    container.style.padding = "8px";

    // Sub-tab bar
    const tabBar = document.createElement("div");
    tabBar.style.display = "flex";
    tabBar.style.gap = "4px";
    tabBar.style.marginBottom = "8px";
    tabBar.style.borderBottom = "1px solid rgba(255,255,255,0.12)";
    tabBar.style.paddingBottom = "6px";

    this.#stateTabBtn = this.#makeTabBtn("State", () => this.#switchTab("state"));
    this.#errorsTabBtn = this.#makeTabBtn("Errors", () => this.#switchTab("errors"));
    tabBar.appendChild(this.#stateTabBtn);
    tabBar.appendChild(this.#errorsTabBtn);
    container.appendChild(tabBar);

    // State content
    this.#stateContent = document.createElement("div");
    container.appendChild(this.#stateContent);

    // Errors content
    this.#errorsContent = document.createElement("div");
    this.#errorsContent.style.display = "none";
    container.appendChild(this.#errorsContent);

    this.#switchTab(this.#activeTab);
    this.#buildStateContent();
    this.#buildErrorsContent();
  }

  unmount(): void {}

  update(): void {
    const now = performance.now();
    if (now - this.#lastUpdate < 500) return;
    this.#lastUpdate = now;

    if (this.#activeTab === "errors") {
      this.#buildErrorsContent();
    }
  }

  #switchTab(tab: "state" | "errors"): void {
    this.#activeTab = tab;
    this.#stateContent.style.display = tab === "state" ? "block" : "none";
    this.#errorsContent.style.display = tab === "errors" ? "block" : "none";

    const activeStyle = "color: #4285f4; border-bottom: 2px solid #4285f4;";
    const inactiveStyle = "color: rgba(255,255,255,0.6); border-bottom: 2px solid transparent;";
    this.#stateTabBtn.style.cssText += tab === "state" ? activeStyle : inactiveStyle;
    this.#errorsTabBtn.style.cssText += tab === "errors" ? activeStyle : inactiveStyle;
  }

  #buildStateContent(): void {
    this.#stateContent.innerHTML = "";

    // Buttons
    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "6px";
    btnRow.style.marginBottom = "8px";

    const refreshBtn = this.#makeBtn("Refresh State", () => this.#refreshState());
    const checkBtn = this.#makeBtn("Check Error", () => {
      this.#app.renderer.debugCheckError?.("manual check");
      this.#refreshState();
    });
    btnRow.appendChild(refreshBtn);
    btnRow.appendChild(checkBtn);
    this.#stateContent.appendChild(btnRow);

    // State display (placeholder until refresh)
    const stateDisplay = document.createElement("pre");
    stateDisplay.id = "gl-state-display";
    stateDisplay.style.fontSize = "10px";
    stateDisplay.style.lineHeight = "1.5";
    stateDisplay.style.whiteSpace = "pre-wrap";
    stateDisplay.style.wordBreak = "break-all";
    stateDisplay.style.background = "rgba(0,0,0,0.2)";
    stateDisplay.style.padding = "8px";
    stateDisplay.style.borderRadius = "4px";
    stateDisplay.style.maxHeight = "35vh";
    stateDisplay.style.overflowY = "auto";
    stateDisplay.textContent = "Click 'Refresh State' to capture GL state";
    this.#stateContent.appendChild(stateDisplay);
  }

  #refreshState(): void {
    const display = this.#stateContent.querySelector("#gl-state-display") as HTMLElement;
    if (!display) return;

    const state = this.#app.renderer.debugCollectState?.() as any;
    if (!state) {
      display.textContent = "No state available (backend may not support debugCollectState)";
      return;
    }

    // Format the state nicely
    const lines: string[] = [];
    lines.push(`Program: ${state.program ? "active" : "null"}`);
    lines.push(`VAO: ${state.vao ? "bound" : "null"}`);
    lines.push(`FBO: ${state.fb ? "custom" : "default"}`);
    lines.push(`Viewport: [${(state.viewport as number[])?.join(", ") ?? "?"}]`);
    lines.push("");
    lines.push(`Blend: ${state.blend ? "on" : "off"}`);
    lines.push(`Depth Test: ${state.depthTest ? "on" : "off"}`);
    lines.push(`Depth Mask: ${state.depthMask ? "on" : "off"}`);
    lines.push(`Cull Face: ${state.cull ? "on" : "off"}`);
    lines.push(`Color Mask: [${(state.colorMask as boolean[])?.map(v => v ? "T" : "F").join(", ") ?? "?"}]`);
    lines.push("");
    lines.push("Draw Buffers:");
    if (state.drawBuffers) {
      for (let i = 0; i < state.drawBuffers.length; i++) {
        const val = state.drawBuffers[i];
        lines.push(`  [${i}]: 0x${val.toString(16)}`);
      }
    }
    lines.push("");
    lines.push("Texture Bindings (0-4):");
    for (let i = 0; i < 5; i++) {
      const tex = state[`tex2D${i}`];
      lines.push(`  Unit ${i}: ${tex ? "bound" : "null"}`);
    }

    display.textContent = lines.join("\n");
  }

  #buildErrorsContent(): void {
    this.#errorsContent.innerHTML = "";

    const errors = ErrorTracker.getErrors();

    if (errors.length === 0) {
      const empty = document.createElement("div");
      empty.style.color = "rgba(255,255,255,0.4)";
      empty.style.textAlign = "center";
      empty.style.padding = "20px";
      empty.textContent = "No errors recorded";
      this.#errorsContent.appendChild(empty);
      return;
    }

    // Header with count + clear button
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.marginBottom = "8px";

    const count = document.createElement("span");
    count.textContent = `${errors.length} error${errors.length !== 1 ? "s" : ""} recorded`;
    count.style.color = "rgba(255,255,255,0.6)";
    header.appendChild(count);

    const clearBtn = this.#makeBtn("Clear", () => {
      ErrorTracker.clear();
      this.#buildErrorsContent();
    });
    header.appendChild(clearBtn);
    this.#errorsContent.appendChild(header);

    // Error list (newest first)
    const list = document.createElement("div");
    list.style.maxHeight = "40vh";
    list.style.overflowY = "auto";

    for (let i = errors.length - 1; i >= 0; i--) {
      const err = errors[i];
      const row = document.createElement("div");
      row.style.padding = "6px 8px";
      row.style.marginBottom = "4px";
      row.style.borderRadius = "4px";
      row.style.background = "rgba(0,0,0,0.2)";
      row.style.borderLeft = `3px solid ${err.severity === "error" ? "#f44336" : "#ff9800"}`;

      const dot = err.severity === "error" ? "●" : "●";
      const color = err.severity === "error" ? "#f44336" : "#ff9800";

      const name = document.createElement("div");
      name.innerHTML = `<span style="color:${color}">${dot}</span> ${err.name}${err.count > 1 ? ` <span style="color:rgba(255,255,255,0.4)">x${err.count}</span>` : ""}`;

      const detail = document.createElement("div");
      detail.style.fontSize = "10px";
      detail.style.color = "rgba(255,255,255,0.5)";
      const d = new Date(performance.timeOrigin + err.timestamp);
      detail.textContent = `at: ${err.tag}   ${d.toISOString().slice(11, 23)}`;

      row.appendChild(name);
      row.appendChild(detail);
      list.appendChild(row);
    }

    this.#errorsContent.appendChild(list);
  }

  #makeTabBtn(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: "4px 12px",
      background: "transparent",
      color: "rgba(255,255,255,0.6)",
      border: "none",
      borderBottom: "2px solid transparent",
      cursor: "pointer",
      font: "inherit",
    });
    btn.addEventListener("click", onClick);
    return btn;
  }

  #makeBtn(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: "3px 10px",
      background: "rgba(255,255,255,0.1)",
      color: "#e8eaed",
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: "3px",
      cursor: "pointer",
      font: "inherit",
      fontSize: "10px",
    });
    btn.addEventListener("click", onClick);
    return btn;
  }
}
