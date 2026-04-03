export default class AudioHandle {
  #source: AudioBufferSourceNode;
  #gainNode: GainNode;
  #isPlaying = true;
  #onEndedCallback: (() => void) | null = null;

  constructor(source: AudioBufferSourceNode, gainNode: GainNode) {
    this.#source = source;
    this.#gainNode = gainNode;

    source.onended = () => {
      this.#isPlaying = false;
      this.#onEndedCallback?.();
    };
  }

  stop(): void {
    if (!this.#isPlaying) return;
    try {
      this.#source.stop();
    } catch {
      // already stopped
    }
    this.#isPlaying = false;
  }

  get volume(): number {
    return this.#gainNode.gain.value;
  }
  set volume(v: number) {
    this.#gainNode.gain.value = Math.max(0, v);
  }

  get isPlaying(): boolean {
    return this.#isPlaying;
  }

  onEnded(callback: () => void): this {
    this.#onEndedCallback = callback;
    return this;
  }
}
