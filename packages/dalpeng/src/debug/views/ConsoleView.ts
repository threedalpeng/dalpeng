import type { DebugView } from "../panel";
import { Logger } from "@dalpeng/core";
import type { Application, LogLevel, LogModule, LogEntry } from "@dalpeng/core";

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: "rgba(255,255,255,0.3)",
  debug: "rgba(255,255,255,0.5)",
  info: "#4285f4",
  warn: "#ff9800",
  error: "#f44336",
};

const MODULES: LogModule[] = ["render", "shader", "gl", "animation", "asset", "app"];

export default class ConsoleView implements DebugView {
  id = "console";
  label = "Log";
  shortcut = "4";

  #logContainer!: HTMLElement;
  #autoScroll = true;
  #levelFilter: Set<LogLevel> = new Set(["info", "warn", "error"]);
  #moduleFilter: LogModule | "all" = "all";
  #unsub: (() => void) | null = null;
  #pendingEntries: LogEntry[] = [];
  #lastFlush = 0;
  #maxVisible = 200;

  mount(container: HTMLElement, _app: Application): void {
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "6px";
    container.style.padding = "8px";

    // Toolbar row 1: Level filters
    const row1 = document.createElement("div");
    row1.style.display = "flex";
    row1.style.alignItems = "center";
    row1.style.gap = "8px";
    row1.style.flexWrap = "wrap";

    const levelLabel = document.createElement("span");
    levelLabel.textContent = "Level:";
    levelLabel.style.color = "rgba(255,255,255,0.6)";
    row1.appendChild(levelLabel);

    for (const level of ["trace", "debug", "info", "warn", "error"] as LogLevel[]) {
      const label = document.createElement("label");
      label.style.display = "flex";
      label.style.alignItems = "center";
      label.style.gap = "2px";
      label.style.cursor = "pointer";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = this.#levelFilter.has(level);
      cb.addEventListener("change", () => {
        if (cb.checked) this.#levelFilter.add(level);
        else this.#levelFilter.delete(level);
        this.#rebuildLog();
      });

      const text = document.createElement("span");
      text.textContent = level;
      text.style.color = LEVEL_COLORS[level];
      text.style.fontSize = "10px";
      text.style.textTransform = "uppercase";

      label.appendChild(cb);
      label.appendChild(text);
      row1.appendChild(label);
    }
    container.appendChild(row1);

    // Toolbar row 2: Module filter + buttons
    const row2 = document.createElement("div");
    row2.style.display = "flex";
    row2.style.alignItems = "center";
    row2.style.gap = "6px";

    // Module select
    const modLabel = document.createElement("span");
    modLabel.textContent = "Module:";
    modLabel.style.color = "rgba(255,255,255,0.6)";
    row2.appendChild(modLabel);

    const modSelect = document.createElement("select");
    modSelect.style.font = "inherit";
    modSelect.style.background = "rgba(255,255,255,0.1)";
    modSelect.style.color = "#fff";
    modSelect.style.border = "1px solid rgba(255,255,255,0.2)";
    modSelect.style.borderRadius = "3px";
    modSelect.style.padding = "2px 4px";

    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All";
    modSelect.appendChild(allOpt);
    for (const mod of MODULES) {
      const opt = document.createElement("option");
      opt.value = mod;
      opt.textContent = mod;
      modSelect.appendChild(opt);
    }
    modSelect.addEventListener("change", () => {
      this.#moduleFilter = modSelect.value as any;
      this.#rebuildLog();
    });
    row2.appendChild(modSelect);

    // Spacer
    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    row2.appendChild(spacer);

    // Clear button
    const clearBtn = this.#makeBtn("Clear", () => {
      Logger.clear();
      this.#logContainer.innerHTML = "";
    });
    row2.appendChild(clearBtn);

    // Pause button
    const pauseBtn = this.#makeBtn(this.#autoScroll ? "Pause" : "Resume", () => {
      this.#autoScroll = !this.#autoScroll;
      pauseBtn.textContent = this.#autoScroll ? "Pause" : "Resume";
    });
    row2.appendChild(pauseBtn);

    container.appendChild(row2);

    // Log output area
    this.#logContainer = document.createElement("div");
    this.#logContainer.style.flex = "1";
    this.#logContainer.style.minHeight = "200px";
    this.#logContainer.style.maxHeight = "45vh";
    this.#logContainer.style.overflowY = "auto";
    this.#logContainer.style.background = "rgba(0,0,0,0.2)";
    this.#logContainer.style.borderRadius = "4px";
    this.#logContainer.style.padding = "4px";
    this.#logContainer.style.fontSize = "10px";
    this.#logContainer.style.lineHeight = "1.5";
    container.appendChild(this.#logContainer);

    // Subscribe to new log entries
    this.#unsub = Logger.onEntry((entry) => {
      this.#pendingEntries.push(entry);
    });

    // Load existing entries
    this.#rebuildLog();
  }

  unmount(): void {
    if (this.#unsub) { this.#unsub(); this.#unsub = null; }
    this.#pendingEntries.length = 0;
  }

  update(): void {
    // Batch flush every 100ms
    const now = performance.now();
    if (now - this.#lastFlush < 100 || this.#pendingEntries.length === 0) return;
    this.#lastFlush = now;

    for (const entry of this.#pendingEntries) {
      if (!this.#matchesFilter(entry)) continue;
      this.#appendEntry(entry);
    }
    this.#pendingEntries.length = 0;

    // Trim excess
    while (this.#logContainer.children.length > this.#maxVisible) {
      this.#logContainer.removeChild(this.#logContainer.firstChild!);
    }

    if (this.#autoScroll) {
      this.#logContainer.scrollTop = this.#logContainer.scrollHeight;
    }
  }

  #matchesFilter(entry: LogEntry): boolean {
    if (!this.#levelFilter.has(entry.level)) return false;
    if (this.#moduleFilter !== "all" && entry.module !== this.#moduleFilter) return false;
    return true;
  }

  #appendEntry(entry: LogEntry): void {
    const row = document.createElement("div");
    row.style.borderBottom = "1px solid rgba(255,255,255,0.04)";
    row.style.padding = "1px 4px";

    // Timestamp
    const ts = document.createElement("span");
    ts.style.color = "rgba(255,255,255,0.3)";
    const d = new Date(performance.timeOrigin + entry.timestamp);
    ts.textContent = d.toISOString().slice(11, 23) + " ";

    // Module tag
    const mod = document.createElement("span");
    mod.style.color = "rgba(255,255,255,0.5)";
    mod.textContent = `[${entry.module}] `;

    // Level
    const lvl = document.createElement("span");
    lvl.style.color = LEVEL_COLORS[entry.level];
    lvl.style.fontWeight = entry.level === "error" ? "bold" : "normal";
    lvl.textContent = entry.level.toUpperCase() + " ";

    // Message
    const msg = document.createElement("span");
    msg.textContent = entry.message;

    row.appendChild(ts);
    row.appendChild(mod);
    row.appendChild(lvl);
    row.appendChild(msg);

    this.#logContainer.appendChild(row);
  }

  #rebuildLog(): void {
    this.#logContainer.innerHTML = "";
    const entries = Logger.getEntries();
    for (const entry of entries) {
      if (this.#matchesFilter(entry)) {
        this.#appendEntry(entry);
      }
    }
    if (this.#autoScroll) {
      this.#logContainer.scrollTop = this.#logContainer.scrollHeight;
    }
  }

  #makeBtn(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: "2px 8px",
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
