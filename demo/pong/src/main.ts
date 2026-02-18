import { runApp } from "dalpeng";
import App from "./app/App";

// attachOverlay();

await runApp(App, "#app", {
  resolution: [1600, 900],
  fit: "contain",
});
