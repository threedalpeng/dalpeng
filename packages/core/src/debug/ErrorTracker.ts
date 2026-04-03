export interface GLError {
  name: string;
  tag: string;
  timestamp: number;
  severity: "warning" | "error";
  count: number; // for deduplication
}

export interface Toast {
  id: number;
  message: string;
  detail: string;
  severity: "warning" | "error";
  timestamp: number;
}

export default class ErrorTracker {
  static #errors: GLError[] = [];
  static #maxErrors = 50;
  static #toasts: Toast[] = [];
  static #toastId = 0;
  static #listeners: ((toast: Toast) => void)[] = [];

  static record(
    tag: string,
    name: string,
    severity: "warning" | "error" = "error"
  ): void {
    const now = performance.now();

    // Dedup: check if same error in last 1 second
    const last =
      this.#errors.length > 0
        ? this.#errors[this.#errors.length - 1]
        : null;
    if (
      last &&
      last.name === name &&
      last.tag === tag &&
      now - last.timestamp < 1000
    ) {
      last.count++;
      last.timestamp = now;
      return;
    }

    const error: GLError = { name, tag, timestamp: now, severity, count: 1 };
    this.#errors.push(error);
    if (this.#errors.length > this.#maxErrors) {
      this.#errors.shift();
    }

    // Create toast
    const toast: Toast = {
      id: this.#toastId++,
      message: name,
      detail: `at: ${tag}`,
      severity,
      timestamp: now,
    };
    this.#toasts.push(toast);

    for (const listener of this.#listeners) {
      listener(toast);
    }
  }

  static getErrors(): readonly GLError[] {
    return this.#errors;
  }

  static get errorCount(): number {
    return this.#errors.length;
  }

  static popToasts(): Toast[] {
    const toasts = this.#toasts.slice();
    this.#toasts.length = 0;
    return toasts;
  }

  static onToast(cb: (toast: Toast) => void): () => void {
    this.#listeners.push(cb);
    return () => {
      const idx = this.#listeners.indexOf(cb);
      if (idx >= 0) this.#listeners.splice(idx, 1);
    };
  }

  static clear(): void {
    this.#errors.length = 0;
    this.#toasts.length = 0;
  }
}
