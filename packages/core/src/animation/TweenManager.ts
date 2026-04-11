import Tween, { type TweenOptions } from "./Tween";

export default class TweenManager {
  #tweens: Tween[] = [];

  /** Create and register a new tween */
  create(target: Record<string, number>, opts: TweenOptions): Tween {
    const tween = new Tween(target, opts);
    this.#tweens.push(tween);
    return tween;
  }

  /** Remove a specific tween */
  remove(tween: Tween): void {
    const idx = this.#tweens.indexOf(tween);
    if (idx !== -1) this.#tweens.splice(idx, 1);
  }

  /** Remove all tweens targeting a specific object */
  removeAllFor(target: object): void {
    this.#tweens = this.#tweens.filter((t) => t.target !== target);
  }

  /** Tick all active tweens. Called from Application update loop. */
  update(dt: number): void {
    for (let i = this.#tweens.length - 1; i >= 0; i--) {
      const tween = this.#tweens[i];
      const alive = tween.tick(dt);
      if (!alive) {
        this.#tweens.splice(i, 1);
        // If there's a chained tween, add it
        const next = tween._getNext();
        if (next) {
          this.#tweens.push(next);
        }
      }
    }
  }

  /** Stop and remove all tweens */
  clear(): void {
    for (const tween of this.#tweens) {
      tween.stop();
    }
    this.#tweens.length = 0;
  }

  get count(): number {
    return this.#tweens.length;
  }
}
