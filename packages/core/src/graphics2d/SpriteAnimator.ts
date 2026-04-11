import Component from "../ecs/Component";
import type GameEntity from "../ecs/GameEntity";
import Sprite2DRenderer from "./Sprite2DRenderer";
import type { SpriteAnimationClip } from "./SpriteAnimationClip";

export default class SpriteAnimator extends Component {
  #clips = new Map<string, SpriteAnimationClip>();
  #currentClip: SpriteAnimationClip | null = null;
  #elapsed = 0;
  #frameIndex = 0;
  #playing = false;
  #renderer!: Sprite2DRenderer;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
    this.#renderer = gameEntity.getComponent(Sprite2DRenderer)!;
  }

  addClip(clip: SpriteAnimationClip): void {
    this.#clips.set(clip.name, clip);
  }

  play(clipName: string): void {
    const clip = this.#clips.get(clipName);
    if (!clip) return;
    if (this.#currentClip === clip && this.#playing) return;
    this.#currentClip = clip;
    this.#elapsed = 0;
    this.#frameIndex = 0;
    this.#playing = true;
    this.#applyFrame();
  }

  stop(): void {
    this.#playing = false;
  }

  get currentClipName(): string | null {
    return this.#currentClip?.name ?? null;
  }

  get isPlaying(): boolean {
    return this.#playing;
  }

  tick(dt: number): void {
    if (!this.#playing || !this.#currentClip) return;

    this.#elapsed += dt;
    const clip = this.#currentClip;
    const totalFrames = clip.frames.length;
    const newIndex = Math.floor(this.#elapsed / clip.frameDuration);

    if (newIndex >= totalFrames) {
      if (clip.loop) {
        this.#elapsed %= clip.frameDuration * totalFrames;
        this.#frameIndex = Math.floor(this.#elapsed / clip.frameDuration) % totalFrames;
      } else {
        this.#frameIndex = totalFrames - 1;
        this.#playing = false;
      }
    } else {
      this.#frameIndex = newIndex;
    }

    this.#applyFrame();
  }

  #applyFrame(): void {
    if (!this.#currentClip) return;
    this.#renderer.frame = this.#currentClip.frames[this.#frameIndex];
  }
}
