export default class Time {
  static #delta = 0;
  static #prevTime = 0;
  static #fixedTime = 0;
  static #current = 0;
  static #lag = 0;

  static _setup() {
    this.#current = performance.now();
    this.#prevTime = this.#current;
  }

  static delta() {
    return this.#delta;
  }
  static fixedDelta() {
    return this.#fixedTime;
  }

  static _updateDelta(t: number) {
    this.#current = t;
    this.#delta = t - this.#prevTime;
    this.#prevTime = t;
    this.#lag += this.#delta;
  }

  static _needsFixedUpdate() {
    const isNeeded = this.#lag >= this.#fixedTime;
    if (isNeeded) {
      this.#lag -= this.#fixedTime;
    }
    return isNeeded;
  }

  static _setFixedUpdateRate(rate: number) {
    this.#fixedTime = 1000 / rate;
  }

  static current() {
    return this.#current;
  }
}
