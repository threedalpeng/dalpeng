export const enum MouseButton {
  LEFT,
  MIDDLE,
  RIGHT,
}

export default class InputManager {
  // ─── Event-side buffers (written by handlers between polls) ────────────────
  #heldKeys = new Set<string>();
  #justDown = new Set<string>();
  #justUp = new Set<string>();

  #heldMouse = new Set<MouseButton>();
  #mouseJustDown = new Set<MouseButton>();
  #mouseJustUp = new Set<MouseButton>();

  #pendingCursorDelta = { x: 0, y: 0 };
  #mousePos = { x: 0, y: 0 };
  #pendingScrollDelta = 0;

  // ─── Frame-side snapshots (readable during frame after poll) ───────────────
  #frameDown = new Set<string>();
  #frameUp = new Set<string>();
  #mouseFrameDown = new Set<MouseButton>();
  #mouseFrameUp = new Set<MouseButton>();
  #cursorDelta = { x: 0, y: 0 };
  #scrollDelta = 0;

  // ─── Action Map ────────────────────────────────────────────────────────────
  #actions = new Map<string, string[]>();

  // ─── Callbacks (dispatched once per frame after poll swap) ───────────────
  #actionDownCbs = new Map<string, Set<() => void>>();
  #actionUpCbs = new Map<string, Set<() => void>>();
  #actionChangeCbs = new Map<string, Set<(pressed: boolean) => void>>();
  #keyDownCbs = new Map<string, Set<() => void>>();
  #keyUpCbs = new Map<string, Set<() => void>>();

  // ─── Canvas binding ────────────────────────────────────────────────────────
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

  // ─── Event handlers ───────────────────────────────────────────────────────
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

  // ─── Poll (swap pattern, zero allocation per frame) ────────────────────────
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

  // ─── Raw key queries ──────────────────────────────────────────────────────
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

  // ─── Raw mouse queries ────────────────────────────────────────────────────
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

  // ─── Action Map ───────────────────────────────────────────────────────────
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

  // ─── Event callbacks ────────────────────────────────────────────────────
  onActionDown(action: string, cb: () => void): () => void {
    let set = this.#actionDownCbs.get(action);
    if (!set) { set = new Set(); this.#actionDownCbs.set(action, set); }
    set.add(cb);
    return () => { set!.delete(cb); if (set!.size === 0) this.#actionDownCbs.delete(action); };
  }
  onActionUp(action: string, cb: () => void): () => void {
    let set = this.#actionUpCbs.get(action);
    if (!set) { set = new Set(); this.#actionUpCbs.set(action, set); }
    set.add(cb);
    return () => { set!.delete(cb); if (set!.size === 0) this.#actionUpCbs.delete(action); };
  }
  onActionChange(action: string, cb: (pressed: boolean) => void): () => void {
    let set = this.#actionChangeCbs.get(action);
    if (!set) { set = new Set(); this.#actionChangeCbs.set(action, set); }
    set.add(cb);
    return () => { set!.delete(cb); if (set!.size === 0) this.#actionChangeCbs.delete(action); };
  }
  onKeyDown(key: string, cb: () => void): () => void {
    let set = this.#keyDownCbs.get(key);
    if (!set) { set = new Set(); this.#keyDownCbs.set(key, set); }
    set.add(cb);
    return () => { set!.delete(cb); if (set!.size === 0) this.#keyDownCbs.delete(key); };
  }
  onKeyUp(key: string, cb: () => void): () => void {
    let set = this.#keyUpCbs.get(key);
    if (!set) { set = new Set(); this.#keyUpCbs.set(key, set); }
    set.add(cb);
    return () => { set!.delete(cb); if (set!.size === 0) this.#keyUpCbs.delete(key); };
  }

  // ─── Dispatch (called once per frame from poll) ─────────────────────────
  #dispatchCallbacks() {
    if (this.#frameDown.size === 0 && this.#frameUp.size === 0) return;

    // Raw key callbacks
    for (const key of this.#frameDown) {
      const cbs = this.#keyDownCbs.get(key);
      if (cbs) for (const cb of cbs) cb();
    }
    for (const key of this.#frameUp) {
      const cbs = this.#keyUpCbs.get(key);
      if (cbs) for (const cb of cbs) cb();
    }

    // Action down callbacks
    for (const [action, cbs] of this.#actionDownCbs) {
      const bindings = this.#actions.get(action);
      if (bindings && bindings.some(k => this.#frameDown.has(k))) {
        for (const cb of cbs) cb();
      }
    }
    // Action up callbacks
    for (const [action, cbs] of this.#actionUpCbs) {
      const bindings = this.#actions.get(action);
      if (bindings && bindings.some(k => this.#frameUp.has(k))) {
        for (const cb of cbs) cb();
      }
    }
    // Action change callbacks (pressed state)
    for (const [action, cbs] of this.#actionChangeCbs) {
      const bindings = this.#actions.get(action);
      if (!bindings) continue;
      const anyDown = bindings.some(k => this.#frameDown.has(k));
      const anyUp = bindings.some(k => this.#frameUp.has(k));
      if (anyDown || anyUp) {
        const pressed = bindings.some(k => this.#heldKeys.has(k));
        for (const cb of cbs) cb(pressed);
      }
    }
  }
}
