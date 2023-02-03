import { attachOverlay } from "@dalpeng/demo-devmode";
import { createApp } from "dalpeng";
import App from "./app/App";

// attachOverlay();

const appEl = document.querySelector<HTMLCanvasElement>("#app")!;
createApp(App).mount(appEl);
