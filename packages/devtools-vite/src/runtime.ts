import type { Application } from "@dalpeng/core";
import type { AttachDevToolsOptions, DevToolsHandle, DevToolsPlugin } from "@dalpeng/devtools";

// Set by the Vite plugin at bundle time via `config.define`.
// The dynamic import MUST stay inside the positive branch so Rollup can
// dead-code-eliminate the `@dalpeng/devtools` chunk in production builds.
declare const __DALPENG_DEVTOOLS__: boolean | undefined;

export async function setupDevTools(
  app: Application,
  plugins?: DevToolsPlugin[],
  opts?: Omit<AttachDevToolsOptions, "plugins">
): Promise<DevToolsHandle | null> {
  if (
    typeof __DALPENG_DEVTOOLS__ !== "undefined"
      ? __DALPENG_DEVTOOLS__
      : (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV
  ) {
    const {
      attachDevTools,
      assetsPlugin,
      consolePlugin,
      layersPlugin,
      performancePlugin,
      renderPlugin,
      scenePlugin,
    } = await import("@dalpeng/devtools");

    return attachDevTools(app, {
      ...opts,
      plugins: plugins ?? [
        scenePlugin(),
        performancePlugin(),
        consolePlugin(),
        renderPlugin(),
        layersPlugin(),
        assetsPlugin(),
      ],
    });
  }
  return null;
}
