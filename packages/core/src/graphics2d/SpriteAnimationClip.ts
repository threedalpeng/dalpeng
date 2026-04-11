export interface SpriteAnimationClip {
  name: string;
  frames: Array<number | string>;
  frameDuration: number;
  loop: boolean;
}
