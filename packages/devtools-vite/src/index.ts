import type { Plugin } from "vite";

export interface DevToolsViteOptions {
  /**
   * When DevTools is active. Default: `"dev"` (dev server only).
   * Set to `"always"` for staging/prod bundles.
   */
  enabled?: "dev" | "always" | "never";
}

export function devtools(opts: DevToolsViteOptions = {}): Plugin {
  const enabled = opts.enabled ?? "dev";

  return {
    name: "@dalpeng/devtools-vite",

    config(_userConfig, env) {
      const active =
        enabled === "always" ||
        (enabled === "dev" && env.command === "serve");
      return {
        define: {
          __DALPENG_DEVTOOLS__: JSON.stringify(active),
        },
      };
    },
  };
}

export default devtools;
