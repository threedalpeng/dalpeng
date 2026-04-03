import AudioHandle from "./AudioHandle";

export interface PlayOptions {
  volume?: number; // 0-1, default 1
  loop?: boolean; // default false
  rate?: number; // playback rate, default 1
}

export default class AudioManager {
  #ctx: AudioContext | null = null;
  #masterGain: GainNode | null = null;
  #buffers = new Map<string, AudioBuffer>();
  #loading = new Map<string, Promise<AudioBuffer>>();

  /** Lazily creates AudioContext on first use (requires user gesture) */
  #ensureContext(): AudioContext {
    if (!this.#ctx) {
      this.#ctx = new AudioContext();
      this.#masterGain = this.#ctx.createGain();
      this.#masterGain.connect(this.#ctx.destination);
    }
    // Resume if suspended (browser autoplay policy)
    if (this.#ctx.state === "suspended") {
      this.#ctx.resume();
    }
    return this.#ctx;
  }

  #getMasterGain(): GainNode {
    this.#ensureContext();
    return this.#masterGain!;
  }

  /** Preload an audio file into the buffer cache */
  async load(url: string): Promise<void> {
    if (this.#buffers.has(url)) return;
    if (this.#loading.has(url)) {
      await this.#loading.get(url);
      return;
    }

    const ctx = this.#ensureContext();
    const promise = fetch(url)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to load audio: ${url} (${res.status})`);
        return res.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        this.#buffers.set(url, buffer);
        this.#loading.delete(url);
        return buffer;
      });

    this.#loading.set(url, promise);
    await promise;
  }

  /** Play a sound. If not preloaded, will load first (may cause latency). */
  play(url: string, opts?: PlayOptions): AudioHandle {
    const ctx = this.#ensureContext();
    const buffer = this.#buffers.get(url);

    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    gainNode.gain.value = opts?.volume ?? 1;
    gainNode.connect(this.#getMasterGain());

    source.connect(gainNode);
    source.loop = opts?.loop ?? false;
    source.playbackRate.value = opts?.rate ?? 1;

    if (buffer) {
      source.buffer = buffer;
      source.start();
    } else {
      // Load and play (async, slight delay)
      this.load(url).then(() => {
        const buf = this.#buffers.get(url);
        if (buf) {
          source.buffer = buf;
          source.start();
        }
      });
    }

    return new AudioHandle(source, gainNode);
  }

  /** Set master volume (0-1) */
  setMasterVolume(v: number): void {
    this.#getMasterGain().gain.value = Math.max(0, v);
  }

  /** Get master volume */
  getMasterVolume(): number {
    return this.#masterGain?.gain.value ?? 1;
  }

  /** Suspend the audio context (e.g. when tab is hidden) */
  suspend(): void {
    this.#ctx?.suspend();
  }

  /** Resume the audio context */
  resume(): void {
    this.#ctx?.resume();
  }

  /** Clean up everything */
  dispose(): void {
    this.#ctx?.close();
    this.#ctx = null;
    this.#masterGain = null;
    this.#buffers.clear();
    this.#loading.clear();
  }
}
