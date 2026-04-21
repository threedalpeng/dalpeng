export const enum MouseButton {
  LEFT,
  MIDDLE,
  RIGHT,
}

export default class InputManager {
  #heldKeys = new Set<string>();
  #justDown = new Set<string>();
  #justUp = new Set<string>();

  #heldMouse = new Set<MouseButton>();
  #mouseJustDown = new Set<MouseButton>();
  #mouseJustUp = new Set<MouseButton>();

  #pendingCursorDelta = { x: 0, y: 0 };
  #mousePos = { x: 0, y: 0 };
  #pendingScrollDelta = 0;

  #frameDown = new Set<string>();
  #frameUp = new Set<string>();
  #mouseFrameDown = new Set<MouseButton>();
  #mouseFrameUp = new Set<MouseButton>();
  #cursorDelta = { x: 0, y: 0 };
  #scrollDelta = 0;

  #actions = new Map<string, string[]>();

  // Callbacks carry the context they were registered in (resolved via
  // currentInputContext() at registration time, or explicit via opts).
  // Dispatch only fires callbacks whose context matches the current top.
  #actionDownCbs = new Map<string, Map<() => void, string>>();
  #actionUpCbs = new Map<string, Map<() => void, string>>();
  #actionChangeCbs = new Map<string, Map<(pressed: boolean) => void, string>>();
  #keyDownCbs = new Map<string, Map<() => void, string>>();
  #keyUpCbs = new Map<string, Map<() => void, string>>();

  // Context stack for routing callbacks through modal states (menus,
  // dialogue, pause). Empty stack resolves to `"default"` — that's the
  // context code registered from normal gameplay sees.
  #contextStack: string[] = [];

  currentInputContext(): string {
    return this.#contextStack[this.#contextStack.length - 1] ?? "default";
  }

  /** Push a new top-of-stack context. Callbacks tagged elsewhere stop firing until popped. */
  pushInputContext(name: string): void {
    this.#contextStack.push(name);
  }

  /** Pop the top context. If `expected` is given, throws when it doesn't match the top — catches mismatched push/pop pairs. */
  popInputContext(expected?: string): void {
    if (this.#contextStack.length === 0) {
      throw new Error("popInputContext() called on empty stack");
    }
    if (expected !== undefined && this.#contextStack[this.#contextStack.length - 1] !== expected) {
      throw new Error(
        `popInputContext("${expected}") mismatch — top is "${this.#contextStack[this.#contextStack.length - 1]}"`
      );
    }
    this.#contextStack.pop();
  }

  #canvas: HTMLCanvasElement | null = null;
  #boundHandlers: { type: string; handler: EventListener }[] = [];

  bind(canvas: HTMLCanvasElement) {
    this.unbind();
    this.#canvas = canvas;
    const add = (type: string, handler: (e: any) => void) => {
      const h = handler.bind(this) as EventListener;
      canvas.addEventListener(type, h);
      this.#boundHandlers.push({ type, handler: h });
    };
    add("keydown", this.#onKeyDown);
    add("keyup", this.#onKeyUp);
    add("pointerdown", this.#onPointerDown);
    add("pointerup", this.#onPointerUp);
    add("pointermove", this.#onPointerMove);
    add("pointerout", this.#onPointerLeave);
    add("pointerleave", this.#onPointerLeave);
    add("wheel", this.#onWheel);
  }

  unbind() {
    if (!this.#canvas) return;
    for (const { type, handler } of this.#boundHandlers) {
      this.#canvas.removeEventListener(type, handler);
    }
    this.#boundHandlers.length = 0;
    this.#canvas = null;
  }

  #onKeyDown(e: KeyboardEvent) {
    if (e.repeat) return;
    e.preventDefault();
    this.#heldKeys.add(e.code);
    this.#justDown.add(e.code);
  }
  #onKeyUp(e: KeyboardEvent) {
    e.preventDefault();
    this.#heldKeys.delete(e.code);
    this.#justUp.add(e.code);
  }
  #onPointerDown(e: PointerEvent) {
    e.preventDefault();
    this.#heldMouse.add(e.button as MouseButton);
    this.#mouseJustDown.add(e.button as MouseButton);
  }
  #onPointerUp(e: PointerEvent) {
    e.preventDefault();
    this.#heldMouse.delete(e.button as MouseButton);
    this.#mouseJustUp.add(e.button as MouseButton);
  }
  #onPointerMove(e: PointerEvent) {
    this.#pendingCursorDelta.x += e.offsetX - this.#mousePos.x;
    this.#pendingCursorDelta.y += e.offsetY - this.#mousePos.y;
    this.#mousePos.x = e.offsetX;
    this.#mousePos.y = e.offsetY;
  }
  #onPointerLeave(_e: PointerEvent) {
    this.#pendingCursorDelta.x = 0;
    this.#pendingCursorDelta.y = 0;
  }
  #onWheel(e: WheelEvent) {
    e.preventDefault();
    this.#pendingScrollDelta += e.deltaY;
  }

  poll() {
    const tmpDown = this.#frameDown;
    this.#frameDown = this.#justDown;
    this.#justDown = tmpDown;
    tmpDown.clear();

    const tmpUp = this.#frameUp;
    this.#frameUp = this.#justUp;
    this.#justUp = tmpUp;
    tmpUp.clear();

    const tmpMD = this.#mouseFrameDown;
    this.#mouseFrameDown = this.#mouseJustDown;
    this.#mouseJustDown = tmpMD;
    tmpMD.clear();

    const tmpMU = this.#mouseFrameUp;
    this.#mouseFrameUp = this.#mouseJustUp;
    this.#mouseJustUp = tmpMU;
    tmpMU.clear();

    this.#cursorDelta.x = this.#pendingCursorDelta.x;
    this.#cursorDelta.y = this.#pendingCursorDelta.y;
    this.#pendingCursorDelta.x = 0;
    this.#pendingCursorDelta.y = 0;

    this.#scrollDelta = this.#pendingScrollDelta;
    this.#pendingScrollDelta = 0;

    this.#dispatchCallbacks();
  }

  keyDown(key: string) {
    return this.#frameDown.has(key);
  }
  keyPressed(key: string) {
    return this.#heldKeys.has(key);
  }
  keyUp(key: string) {
    return this.#frameUp.has(key);
  }
  keyReleased(key: string) {
    return !this.#heldKeys.has(key);
  }

  mouseDown(button: MouseButton) {
    return this.#mouseFrameDown.has(button);
  }
  mousePressed(button: MouseButton) {
    return this.#heldMouse.has(button);
  }
  mouseUp(button: MouseButton) {
    return this.#mouseFrameUp.has(button);
  }
  mouseReleased(button: MouseButton) {
    return !this.#heldMouse.has(button);
  }
  isMouseMoved() {
    return this.#cursorDelta.x !== 0 || this.#cursorDelta.y !== 0;
  }
  getMousePos() {
    return this.#mousePos;
  }
  getCursorDelta() {
    return this.#cursorDelta;
  }
  getScrollDelta() {
    return this.#scrollDelta;
  }

  defineAction(name: string, bindings: string[]) {
    this.#actions.set(name, [...bindings]);
  }
  removeAction(name: string) {
    this.#actions.delete(name);
  }
  actionDown(name: string) {
    const b = this.#actions.get(name);
    return b !== undefined && b.some((k) => this.#frameDown.has(k));
  }
  actionPressed(name: string) {
    const b = this.#actions.get(name);
    return b !== undefined && b.some((k) => this.#heldKeys.has(k));
  }
  actionUp(name: string) {
    const b = this.#actions.get(name);
    return b !== undefined && b.some((k) => this.#frameUp.has(k));
  }

  onActionDown(action: string, cb: () => void, opts?: { context?: string }): () => void {
    const ctx = opts?.context ?? this.currentInputContext();
    let map = this.#actionDownCbs.get(action);
    if (!map) {
      map = new Map();
      this.#actionDownCbs.set(action, map);
    }
    map.set(cb, ctx);
    return () => {
      map!.delete(cb);
      if (map!.size === 0) this.#actionDownCbs.delete(action);
    };
  }
  onActionUp(action: string, cb: () => void, opts?: { context?: string }): () => void {
    const ctx = opts?.context ?? this.currentInputContext();
    let map = this.#actionUpCbs.get(action);
    if (!map) {
      map = new Map();
      this.#actionUpCbs.set(action, map);
    }
    map.set(cb, ctx);
    return () => {
      map!.delete(cb);
      if (map!.size === 0) this.#actionUpCbs.delete(action);
    };
  }
  onActionChange(
    action: string,
    cb: (pressed: boolean) => void,
    opts?: { context?: string }
  ): () => void {
    const ctx = opts?.context ?? this.currentInputContext();
    let map = this.#actionChangeCbs.get(action);
    if (!map) {
      map = new Map();
      this.#actionChangeCbs.set(action, map);
    }
    map.set(cb, ctx);
    return () => {
      map!.delete(cb);
      if (map!.size === 0) this.#actionChangeCbs.delete(action);
    };
  }
  onKeyDown(key: string, cb: () => void, opts?: { context?: string }): () => void {
    const ctx = opts?.context ?? this.currentInputContext();
    let map = this.#keyDownCbs.get(key);
    if (!map) {
      map = new Map();
      this.#keyDownCbs.set(key, map);
    }
    map.set(cb, ctx);
    return () => {
      map!.delete(cb);
      if (map!.size === 0) this.#keyDownCbs.delete(key);
    };
  }
  onKeyUp(key: string, cb: () => void, opts?: { context?: string }): () => void {
    const ctx = opts?.context ?? this.currentInputContext();
    let map = this.#keyUpCbs.get(key);
    if (!map) {
      map = new Map();
      this.#keyUpCbs.set(key, map);
    }
    map.set(cb, ctx);
    return () => {
      map!.delete(cb);
      if (map!.size === 0) this.#keyUpCbs.delete(key);
    };
  }

  #dispatchCallbacks() {
    if (this.#frameDown.size === 0 && this.#frameUp.size === 0) return;
    const activeContext = this.currentInputContext();

    for (const key of this.#frameDown) {
      const cbs = this.#keyDownCbs.get(key);
      if (cbs) for (const [cb, ctx] of cbs) if (ctx === activeContext) cb();
    }
    for (const key of this.#frameUp) {
      const cbs = this.#keyUpCbs.get(key);
      if (cbs) for (const [cb, ctx] of cbs) if (ctx === activeContext) cb();
    }

    for (const [action, cbs] of this.#actionDownCbs) {
      const bindings = this.#actions.get(action);
      if (bindings && bindings.some((k) => this.#frameDown.has(k))) {
        for (const [cb, ctx] of cbs) if (ctx === activeContext) cb();
      }
    }
    for (const [action, cbs] of this.#actionUpCbs) {
      const bindings = this.#actions.get(action);
      if (bindings && bindings.some((k) => this.#frameUp.has(k))) {
        for (const [cb, ctx] of cbs) if (ctx === activeContext) cb();
      }
    }
    for (const [action, cbs] of this.#actionChangeCbs) {
      const bindings = this.#actions.get(action);
      if (!bindings) continue;
      const anyDown = bindings.some((k) => this.#frameDown.has(k));
      const anyUp = bindings.some((k) => this.#frameUp.has(k));
      if (anyDown || anyUp) {
        const pressed = bindings.some((k) => this.#heldKeys.has(k));
        for (const [cb, ctx] of cbs) if (ctx === activeContext) cb(pressed);
      }
    }
  }
}
