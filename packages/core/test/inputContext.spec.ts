// @vitest-environment happy-dom
/**
 * Input context stack invariants.
 *
 * Locks F8 contract: callbacks carry the context they were registered in;
 * only the context matching stack-top dispatches; push/pop nest cleanly;
 * default context ("default") fires when stack is empty.
 */
import { beforeEach, describe, expect, it } from "vitest";
import InputManager from "../src/InputManager";

function pressAndPoll(input: InputManager, canvas: HTMLCanvasElement, code: string): void {
  canvas.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
  input.poll();
  // Release so the next press registers as a fresh frame-down.
  canvas.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
  input.poll();
}

describe("Input context — stack-top routes dispatch", () => {
  let input: InputManager;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    input = new InputManager();
    canvas = document.createElement("canvas");
    input.bind(canvas);
    input.defineAction("jump", ["Space"]);
    input.defineAction("pause", ["Escape"]);
  });

  it("default context fires when stack is empty", () => {
    let calls = 0;
    input.onActionDown("jump", () => calls++);

    pressAndPoll(input, canvas, "Space");
    expect(calls).toBe(1);
  });

  it("pushing a context suppresses default-tagged callbacks", () => {
    let gameCalls = 0;
    input.onActionDown("jump", () => gameCalls++);

    input.pushInputContext("menu");
    pressAndPoll(input, canvas, "Space");
    expect(gameCalls).toBe(0);

    input.popInputContext();
    pressAndPoll(input, canvas, "Space");
    expect(gameCalls).toBe(1);
  });

  it("callbacks registered while a context is active stay tagged with it", () => {
    let menuCalls = 0;
    input.pushInputContext("menu");
    input.onActionDown("pause", () => menuCalls++); // tagged "menu"

    pressAndPoll(input, canvas, "Escape");
    expect(menuCalls).toBe(1);

    input.popInputContext();
    pressAndPoll(input, canvas, "Escape");
    expect(menuCalls).toBe(1); // stack empty → menu cbs dormant
  });

  it("nested contexts: only innermost top fires", () => {
    let gameCalls = 0;
    let menuCalls = 0;
    let dialogueCalls = 0;

    input.onActionDown("jump", () => gameCalls++);
    input.pushInputContext("menu");
    input.onActionDown("jump", () => menuCalls++);
    input.pushInputContext("dialogue");
    input.onActionDown("jump", () => dialogueCalls++);

    pressAndPoll(input, canvas, "Space");
    expect(dialogueCalls).toBe(1);
    expect(menuCalls).toBe(0);
    expect(gameCalls).toBe(0);

    input.popInputContext("dialogue");
    pressAndPoll(input, canvas, "Space");
    expect(menuCalls).toBe(1);
    expect(gameCalls).toBe(0);

    input.popInputContext("menu");
    pressAndPoll(input, canvas, "Space");
    expect(gameCalls).toBe(1);
  });

  it("explicit context override at registration time overrides stack-top", () => {
    let debugCalls = 0;
    input.pushInputContext("menu");
    input.onActionDown("pause", () => debugCalls++, { context: "menu" });

    pressAndPoll(input, canvas, "Escape");
    expect(debugCalls).toBe(1);
  });

  it("popInputContext mismatch throws", () => {
    input.pushInputContext("menu");
    expect(() => input.popInputContext("dialogue")).toThrow(/mismatch/);
    expect(() => input.popInputContext("menu")).not.toThrow();
  });

  it("popInputContext on empty stack throws", () => {
    expect(() => input.popInputContext()).toThrow(/empty/);
  });

  it("currentInputContext reflects stack top, defaults to 'default'", () => {
    expect(input.currentInputContext()).toBe("default");
    input.pushInputContext("menu");
    expect(input.currentInputContext()).toBe("menu");
    input.pushInputContext("dialogue");
    expect(input.currentInputContext()).toBe("dialogue");
    input.popInputContext();
    expect(input.currentInputContext()).toBe("menu");
    input.popInputContext();
    expect(input.currentInputContext()).toBe("default");
  });
});
