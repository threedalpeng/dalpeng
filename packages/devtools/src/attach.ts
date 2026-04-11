import { FrameProfiler, Logger, type Application } from "@dalpeng/core";
import { createDevToolsHost } from "./createHost";
import {
  DevToolsRootHost,
  type DevToolsRootHostOptions,
} from "./hostFrame";
import type { DevToolsPlugin } from "./plugin";
import { PluginRegistry } from "./registry";

export interface AttachDevToolsOptions extends DevToolsRootHostOptions {
  /** Plugins to register on attach. */
  plugins?: DevToolsPlugin[];
  /**
   * Pop the dock into a separate browser window immediately after attaching.
   * Subject to popup blockers — falls back to in-page if denied.
   */
  popout?: boolean;
}

export interface DevToolsHandle {
  /** Detach the host frame and run all plugin teardowns. */
  destroy(): void;
  /**
   * Pop the DevTools dock into a new browser window. The JS context stays in
   * the parent window (refs and plugin closures survive); only the DOM is
   * reparented. Closing the popup returns the dock inline.
   * Returns the new `Window` or `null` if blocked.
   */
  popOut(): Window | null;
}

export function attachDevTools(
  app: Application,
  opts: AttachDevToolsOptions = {},
): DevToolsHandle {
  // FrameProfiler and Logger ship disabled by default. Flip them here so
  // `setupDevTools(app)` is the single switch the user touches.
  const prevProfiler = FrameProfiler.enabled;
  const prevLogger = Logger.enabled;
  FrameProfiler.enabled = true;
  Logger.enabled = true;

  const { host, attachApp, detach } = createDevToolsHost(app);
  attachApp(app);

  const registry = new PluginRegistry();
  const rootHost = new DevToolsRootHost(app, registry, opts);

  // Register plugins AFTER the root host exists so panel UIs see the bound app immediately.
  for (const plugin of opts.plugins ?? []) {
    registry.register(plugin, host);
  }

  if (opts.popout) {
    rootHost.popOut();
  }

  return {
    destroy() {
      registry.clear();
      rootHost.destroy();
      detach();
      // Restore original probe state so toggling DevTools off doesn't leave
      // the profiler/logger running.
      FrameProfiler.enabled = prevProfiler;
      Logger.enabled = prevLogger;
    },
    popOut: () => rootHost.popOut(),
  };
}
