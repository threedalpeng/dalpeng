const enum KEYSTATE {
  PRESSED,
  DOWN,
  UP,
}

const enum MOUSESTATE {
  PRESSED,
  DOWN,
  UP,
}

export const enum MOUSE {
  LEFT,
  MIDDLE,
  RIGHT,
}

export default class Input {
  static #unpolledKeys: { [key: string]: boolean } = {};
  static #unpolledMouseButtons: { [key in MOUSE]?: boolean } = {};
  static #unpolledCursorAxis = { x: 0, y: 0 };
  static #keys: { [key: string]: KEYSTATE } = {};
  static #mouseButtons: { [key in MOUSE]?: MOUSESTATE } = {};
  static #mouseMoved = false;
  static #mousePos = { x: 0, y: 0 };
  static #cursorAxis = { x: 0, y: 0 };

  static #eventMap: {
    [type in keyof HTMLElementEventMap]?: (
      e: HTMLElementEventMap[type]
    ) => void;
  } = {
    pointerdown: (e: PointerEvent) => {
      this.#unpolledMouseButtons[e.button as MOUSE] = true;
    },
    pointerup: (e: PointerEvent) => {
      delete this.#unpolledMouseButtons[e.button as MOUSE];
    },
    pointermove: (e: PointerEvent) => {
      this.#mouseMoved = true;
      this.#unpolledCursorAxis.x += e.offsetX - this.#mousePos.x;
      this.#unpolledCursorAxis.y += e.offsetY - this.#mousePos.y;
      this.#mousePos.x = e.offsetX;
      this.#mousePos.y = e.offsetY;
    },
    pointerout: (e: PointerEvent) => {
      this.#mouseMoved = true;
      this.#unpolledCursorAxis.x = 0;
      this.#unpolledCursorAxis.y = 0;
    },
    pointerleave: (e: PointerEvent) => {
      this.#mouseMoved = true;
      this.#unpolledCursorAxis.x = 0;
      this.#unpolledCursorAxis.y = 0;
    },
    keydown: (e: KeyboardEvent) => {
      this.#unpolledKeys[e.code] = true;
    },
    keyup: (e: KeyboardEvent) => {
      delete this.#unpolledKeys[e.code];
    },
  };
  static supportedEventList: (keyof HTMLElementEventMap)[] = Object.keys(
    this.#eventMap
  ) as (keyof HTMLElementEventMap)[];

  static handleEvent(e: Event) {
    e.preventDefault();
    /* @ts-ignore */
    if (e.repeat === true) return;
    Input.#eventMap[e.type as keyof HTMLElementEventMap]!(e as any);
  }

  static poll() {
    for (let button in this.#mouseButtons) {
      if (this.#unpolledMouseButtons.hasOwnProperty(button)) {
        this.#mouseButtons[button as unknown as MOUSE] = MOUSESTATE.PRESSED;
      } else if (
        this.#mouseButtons[button as unknown as MOUSE] === MOUSESTATE.UP
      ) {
        delete this.#mouseButtons[button as unknown as MOUSE];
      } else {
        this.#mouseButtons[button as unknown as MOUSE] = MOUSESTATE.UP;
      }
    }
    for (let button in this.#unpolledMouseButtons) {
      if (!this.#mouseButtons.hasOwnProperty(button)) {
        this.#mouseButtons[button as unknown as MOUSE] = MOUSESTATE.DOWN;
      }
    }

    for (let key in this.#keys) {
      if (this.#unpolledKeys.hasOwnProperty(key)) {
        this.#keys[key] = KEYSTATE.PRESSED;
      } else if (this.#keys[key] === KEYSTATE.UP) {
        delete this.#keys[key];
      } else {
        this.#keys[key] = KEYSTATE.UP;
      }
    }
    for (let key in this.#unpolledKeys) {
      if (!this.#keys.hasOwnProperty(key)) {
        this.#keys[key] = KEYSTATE.DOWN;
      }
    }

    if (this.#mouseMoved) {
      this.#cursorAxis = structuredClone(this.#unpolledCursorAxis);
      this.#unpolledCursorAxis.x = 0;
      this.#unpolledCursorAxis.y = 0;
      this.#mouseMoved = false;
    }
  }

  static keyDown(key: string) {
    return this.#keys[key] === KEYSTATE.DOWN;
  }
  static keyPressed(key: string) {
    const state = this.#keys[key];
    return state === KEYSTATE.PRESSED || state === KEYSTATE.DOWN;
  }
  static keyUp(key: string) {
    return this.#keys[key] === KEYSTATE.UP;
  }
  static keyReleased(key: string) {
    return !this.#keys.hasOwnProperty(key) || this.#keys[key] === KEYSTATE.UP;
  }

  static mouseDown(button: MOUSE) {
    return this.#mouseButtons[button] === MOUSESTATE.DOWN;
  }
  static mousePressed(button: MOUSE) {
    const state = this.#mouseButtons[button];
    return state === MOUSESTATE.PRESSED || state === MOUSESTATE.DOWN;
  }
  static mouseUp(button: MOUSE) {
    return this.#mouseButtons[button] === MOUSESTATE.UP;
  }
  static mouseReleased(button: MOUSE) {
    return (
      !this.#mouseButtons.hasOwnProperty(button) ||
      this.#mouseButtons[button] === MOUSESTATE.UP
    );
  }

  static isMouseMoved() {
    return this.#cursorAxis.x !== 0 || this.#cursorAxis.y !== 0;
  }
  static getMousePos() {
    return this.#mousePos;
  }
}
