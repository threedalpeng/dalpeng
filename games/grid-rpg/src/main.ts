import { runApp } from "dalpeng";
import { setupDevTools } from "@dalpeng/devtools-vite/runtime";
import App from "./app/App";

const app = await runApp(App, "#app");

// DevTools attaches in dev only — `setupDevTools` resolves to `null` in
// production builds, and the `@dalpeng/devtools` bundle is dynamically
// imported so it never enters the prod chunk.
await setupDevTools(app);
