import { describe, expect, it } from "vitest";
import Application from "../src/Application";

describe("Application frame hooks", () => {
  it("onBeforeUpdate/onBeforeRender/onAfterRender registration returns unsubscribe", () => {
    const app = new Application();
    const cb = () => {};
    const unsubs = [app.onBeforeUpdate(cb), app.onBeforeRender(cb), app.onAfterRender(cb)];
    for (const u of unsubs) expect(typeof u).toBe("function");
    for (const u of unsubs) u();
  });
});
