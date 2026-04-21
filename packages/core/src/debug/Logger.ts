import { computed, ref, type ReadonlyRef } from "../runtime/reactive";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";
export type LogModule = "render" | "shader" | "gl" | "animation" | "asset" | "app";

export interface LogEntry {
  timestamp: number; // performance.now()
  level: LogLevel;
  module: LogModule;
  message: string;
  args?: unknown[];
  /** `path/file.ts:line` extracted from the call-site stack. Undefined when stack parsing fails (non-V8, sourceless prod bundles). */
  source?: string;
}

const STACK_FRAME_RE = /(?:\()?((?:https?:\/\/|file:\/\/|webpack:\/\/)?[^\s()]+):(\d+):(\d+)\)?$/;

/** Format a raw URL into a readable `path/file:line` — drops protocol + host. */
function shortenSource(url: string, line: string): string {
  let short = url;
  const protoIdx = short.indexOf("://");
  if (protoIdx >= 0) {
    const afterProto = short.slice(protoIdx + 3);
    const pathIdx = afterProto.indexOf("/");
    short = pathIdx >= 0 ? afterProto.slice(pathIdx + 1) : afterProto;
  }
  const qIdx = short.indexOf("?");
  if (qIdx >= 0) short = short.slice(0, qIdx);
  return `${short}:${line}`;
}

/** Best-effort: walk the stack past Logger's own frames and return `file:line` of the first user frame. */
function captureSource(): string | undefined {
  const stack = new Error().stack;
  if (!stack) return undefined;
  const lines = stack.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.includes("Logger.")) continue;
    if (line.includes("at captureSource")) continue;
    const m = STACK_FRAME_RE.exec(line);
    if (!m) continue;
    const [, url, lineNum] = m;
    if (url.includes("/debug/Logger")) continue;
    return shortenSource(url, lineNum);
  }
  return undefined;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

export default class Logger {
  static enabled = false;
  static level: LogLevel = "info";
  static #buffer: LogEntry[] = [];
  static #maxEntries = 500;
  static #listeners: ((entry: LogEntry) => void)[] = [];

  static #version = ref(0);
  static entries: ReadonlyRef<readonly LogEntry[]> = computed(() => {
    void Logger.#version.value;
    return [...Logger.#buffer];
  });

  static log(module: LogModule, level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.enabled) return;
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;

    const entry: LogEntry = {
      timestamp: performance.now(),
      level,
      module,
      message,
      args: args.length > 0 ? args : undefined,
      source: captureSource(),
    };

    this.#buffer.push(entry);
    if (this.#buffer.length > this.#maxEntries) {
      this.#buffer.shift();
    }

    this.#version.value++;

    for (const listener of this.#listeners) {
      listener(entry);
    }
  }

  static trace(module: LogModule, message: string, ...args: unknown[]): void {
    this.log(module, "trace", message, ...args);
  }

  static debug(module: LogModule, message: string, ...args: unknown[]): void {
    this.log(module, "debug", message, ...args);
  }

  static info(module: LogModule, message: string, ...args: unknown[]): void {
    this.log(module, "info", message, ...args);
  }

  static warn(module: LogModule, message: string, ...args: unknown[]): void {
    this.log(module, "warn", message, ...args);
  }

  static error(module: LogModule, message: string, ...args: unknown[]): void {
    this.log(module, "error", message, ...args);
  }

  static getEntries(filter?: { module?: LogModule; level?: LogLevel; since?: number }): LogEntry[] {
    if (!filter) {
      return [...this.#buffer];
    }

    let entries = this.#buffer;

    if (filter.module !== undefined) {
      entries = entries.filter((entry) => entry.module === filter.module);
    }

    if (filter.level !== undefined) {
      const minLevel = LEVEL_ORDER[filter.level];
      entries = entries.filter((entry) => LEVEL_ORDER[entry.level] >= minLevel);
    }

    if (filter.since !== undefined) {
      const since = filter.since;
      entries = entries.filter((entry) => entry.timestamp >= since);
    }

    return entries;
  }

  static clear(): void {
    this.#buffer.length = 0;
    this.#version.value++;
  }

  static onEntry(cb: (entry: LogEntry) => void): () => void {
    this.#listeners.push(cb);
    return () => {
      const idx = this.#listeners.indexOf(cb);
      if (idx >= 0) this.#listeners.splice(idx, 1);
    };
  }

  static get entryCount(): number {
    return this.#buffer.length;
  }
}
