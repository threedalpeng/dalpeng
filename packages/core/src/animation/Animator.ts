import Component from "../ecs/Component";
import type GameEntity from "../ecs/GameEntity";
import type { ParsedAnimation, ParsedNode } from "../utils/gltf/GLTFDocument";
import type Skeleton from "./Skeleton";
import { sampleChannel, sampleRotation } from "./AnimationClip";
import { computeNodeGlobalTransforms } from "./NodeHierarchy";
import { Vec3, Quaternion, Mat4 } from "@dalpeng/math";

export default class Animator extends Component {
  skeleton!: Skeleton;
  clips: ParsedAnimation[] = [];
  nodes: ParsedNode[] = [];
  rootNodeIndices: number[] = [];

  // Current clip state
  #currentClip: number = -1;
  #currentTime: number = 0;
  #loop: boolean = true;
  #speed: number = 1;
  #playing: boolean = false;

  // Crossfade state
  #fadeClip: number = -1;
  #fadeTime: number = 0;
  #fadeDuration: number = 0;
  #fadeElapsed: number = 0;
  #fadeLoop: boolean = true;
  #fadeSpeed: number = 1;

  // Cache: nodeIndex → skeleton joint array index
  #nodeToJointIdx: Map<number, number> | null = null;
  #globalTransforms = new Map<number, Mat4>();

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
  }

  #buildJointCache(): Map<number, number> {
    const map = new Map<number, number>();
    for (let i = 0; i < this.skeleton.jointCount; i++) {
      map.set(this.skeleton.joints[i], i);
    }
    return map;
  }


  play(clipIndex: number, options?: { loop?: boolean; speed?: number }): void {
    this.#currentClip = clipIndex;
    this.#currentTime = 0;
    this.#playing = true;
    this.#loop = options?.loop ?? true;
    this.#speed = options?.speed ?? 1;
    // Cancel any active crossfade
    this.#fadeClip = -1;
    this.#fadeTime = 0;
    this.#fadeDuration = 0;
    this.#fadeElapsed = 0;
  }

  pause(): void {
    this.#playing = false;
  }

  resume(): void {
    this.#playing = true;
  }

  stop(): void {
    this.#playing = false;
    this.#currentTime = 0;
    this.#currentClip = -1;
    this.#fadeClip = -1;

    // Reset skeleton to rest pose
    if (this.skeleton) {
      for (let i = 0; i < this.skeleton.jointCount; i++) {
        const node = this.nodes[this.skeleton.joints[i]];
        if (node) {
          this.skeleton.jointLocalTranslation[i] = new Vec3(node.translation);
          this.skeleton.jointLocalRotation[i] = new Quaternion(node.rotation);
          this.skeleton.jointLocalScale[i] = new Vec3(node.scale);
        }
      }
    }
  }

  crossfade(
    clipIndex: number,
    duration: number,
    options?: { loop?: boolean; speed?: number }
  ): void {
    this.#fadeClip = clipIndex;
    this.#fadeDuration = duration;
    this.#fadeElapsed = 0;
    this.#fadeTime = 0;
    this.#fadeLoop = options?.loop ?? true;
    this.#fadeSpeed = options?.speed ?? 1;
  }

  setSpeed(speed: number): void {
    this.#speed = speed;
    if (this.#fadeClip !== -1) {
      this.#fadeSpeed = speed;
    }
  }


  get currentClipIndex(): number {
    return this.#currentClip;
  }

  get isPlaying(): boolean {
    return this.#playing;
  }

  get currentTime(): number {
    return this.#currentTime;
  }

  get clipCount(): number {
    return this.clips.length;
  }


  tick(dt: number): void {
    if (!this.#playing) return;
    if (this.#currentClip < 0 || this.#currentClip >= this.clips.length) return;

    // Build the joint index cache on first tick
    if (this.#nodeToJointIdx === null) {
      this.#nodeToJointIdx = this.#buildJointCache();
    }
    const nodeToJointIdx = this.#nodeToJointIdx;

    // Advance current clip time
    this.#currentTime += dt * this.#speed;

    const clip = this.clips[this.#currentClip];
    const clipDuration = clip.duration;

    // Handle current clip looping / clamping
    if (this.#currentTime >= clipDuration) {
      if (this.#loop) {
        this.#currentTime = clipDuration > 0 ? this.#currentTime % clipDuration : 0;
      } else {
        this.#currentTime = clipDuration;
        this.#playing = false;
      }
    }

    // Advance fade clip time
    const isFading = this.#fadeClip !== -1 && this.#fadeClip < this.clips.length;
    if (isFading) {
      this.#fadeElapsed += dt;
      this.#fadeTime += dt * this.#fadeSpeed;

      const fadeClip = this.clips[this.#fadeClip];
      const fadeDuration = fadeClip.duration;

      if (this.#fadeTime >= fadeDuration) {
        if (this.#fadeLoop) {
          this.#fadeTime = fadeDuration > 0 ? this.#fadeTime % fadeDuration : 0;
        } else {
          this.#fadeTime = fadeDuration;
        }
      }
    }

    this.#sampleClipIntoSkeleton(clip, this.#currentTime, nodeToJointIdx);

    if (isFading) {
      const fadeClip = this.clips[this.#fadeClip];
      const blendFactor = Math.min(this.#fadeElapsed / this.#fadeDuration, 1);

      for (const channel of fadeClip.channels) {
        const sampler = fadeClip.samplers[channel.samplerIndex];
        const jointIdx = nodeToJointIdx.get(channel.nodeIndex);
        if (jointIdx === undefined) continue;

        if (channel.path === "translation") {
          const fadedRaw = sampleChannel(sampler, this.#fadeTime, 3);
          const current = this.skeleton.jointLocalTranslation[jointIdx];
          // Component-wise lerp (Vec3 has no static lerp)
          this.skeleton.jointLocalTranslation[jointIdx] = new Vec3([
            current[0] * (1 - blendFactor) + fadedRaw[0] * blendFactor,
            current[1] * (1 - blendFactor) + fadedRaw[1] * blendFactor,
            current[2] * (1 - blendFactor) + fadedRaw[2] * blendFactor,
          ]);
        } else if (channel.path === "rotation") {
          const fadedQ = sampleRotation(sampler, this.#fadeTime);
          const current = this.skeleton.jointLocalRotation[jointIdx];
          this.skeleton.jointLocalRotation[jointIdx] = Quaternion.slerp(
            current,
            fadedQ,
            blendFactor
          );
        } else if (channel.path === "scale") {
          const fadedRaw = sampleChannel(sampler, this.#fadeTime, 3);
          const current = this.skeleton.jointLocalScale[jointIdx];
          this.skeleton.jointLocalScale[jointIdx] = new Vec3([
            current[0] * (1 - blendFactor) + fadedRaw[0] * blendFactor,
            current[1] * (1 - blendFactor) + fadedRaw[1] * blendFactor,
            current[2] * (1 - blendFactor) + fadedRaw[2] * blendFactor,
          ]);
        }
        // 'weights' (morph targets) — deferred
      }

      // Complete the fade when elapsed >= duration
      if (this.#fadeElapsed >= this.#fadeDuration) {
        this.#currentClip = this.#fadeClip;
        this.#currentTime = this.#fadeTime;
        this.#loop = this.#fadeLoop;
        this.#speed = this.#fadeSpeed;
        this.#fadeClip = -1;
        this.#fadeTime = 0;
        this.#fadeDuration = 0;
        this.#fadeElapsed = 0;
      }
    }

    computeNodeGlobalTransforms(this.nodes, this.rootNodeIndices, this.skeleton, this.#nodeToJointIdx!, this.#globalTransforms);
    this.skeleton.computeJointMatrices(this.#globalTransforms);
  }

  #sampleClipIntoSkeleton(
    clip: ParsedAnimation,
    time: number,
    nodeToJointIdx: Map<number, number>
  ): void {
    for (const channel of clip.channels) {
      const sampler = clip.samplers[channel.samplerIndex];
      const jointIdx = nodeToJointIdx.get(channel.nodeIndex);
      if (jointIdx === undefined) continue;

      if (channel.path === "translation") {
        this.skeleton.jointLocalTranslation[jointIdx] = new Vec3(
          sampleChannel(sampler, time, 3)
        );
      } else if (channel.path === "rotation") {
        this.skeleton.jointLocalRotation[jointIdx] = sampleRotation(sampler, time);
      } else if (channel.path === "scale") {
        this.skeleton.jointLocalScale[jointIdx] = new Vec3(
          sampleChannel(sampler, time, 3)
        );
      }
      // 'weights' (morph targets) — deferred
    }
  }
}
