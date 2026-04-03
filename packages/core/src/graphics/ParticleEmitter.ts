import Component from "../ecs/Component";
import type GameEntity from "../ecs/GameEntity";
import Transform from "../ecs/Transform";
import Particle from "./Particle";

export interface ParticleEmitterConfig {
  maxParticles?: number;        // default 256
  emitRate?: number;            // particles per second, default 10
  lifetime?: [number, number];  // [min, max] ms, default [500, 1500]
  speed?: [number, number];     // [min, max] units/sec, default [1, 3]
  size?: [number, number];      // [start, end], default [0.5, 0.1]
  colorStart?: [number, number, number, number]; // RGBA 0-1, default [1,1,1,1]
  colorEnd?: [number, number, number, number];   // RGBA 0-1, default [1,1,1,0]
  gravity?: [number, number, number];            // world units/sec^2, default [0, -9.8, 0]
  spread?: number;              // cone half-angle in radians, default Math.PI (full sphere)
  direction?: [number, number, number]; // emit direction, default [0, 1, 0]
}

export default class ParticleEmitter extends Component {
  // Config
  maxParticles = 256;
  emitRate = 10;
  lifetime: [number, number] = [500, 1500];
  speed: [number, number] = [1, 3];
  sizeRange: [number, number] = [0.5, 0.1]; // start, end
  colorStart: [number, number, number, number] = [1, 1, 1, 1];
  colorEnd: [number, number, number, number] = [1, 1, 1, 0];
  gravity: [number, number, number] = [0, -9.8, 0];
  spread = Math.PI;
  direction: [number, number, number] = [0, 1, 0];

  // State
  #particles: Particle[] = [];
  #instanceData: Float32Array = new Float32Array(0);
  #aliveCount = 0;
  #emitAccumulator = 0; // fractional particle accumulator
  #isEmitting = true;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
  }

  configure(config: ParticleEmitterConfig): this {
    if (config.maxParticles !== undefined) this.maxParticles = config.maxParticles;
    if (config.emitRate !== undefined) this.emitRate = config.emitRate;
    if (config.lifetime) this.lifetime = config.lifetime;
    if (config.speed) this.speed = config.speed;
    if (config.size) this.sizeRange = config.size;
    if (config.colorStart) this.colorStart = config.colorStart;
    if (config.colorEnd) this.colorEnd = config.colorEnd;
    if (config.gravity) this.gravity = config.gravity;
    if (config.spread !== undefined) this.spread = config.spread;
    if (config.direction) this.direction = config.direction;
    return this;
  }

  setup() {
    super.setup();
    // Pre-allocate particle pool
    this.#particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.#particles.push(new Particle());
    }
    // 8 floats per particle: [posX, posY, posZ, size, r, g, b, a]
    this.#instanceData = new Float32Array(this.maxParticles * 8);
  }

  /** Start continuous emission */
  start(): void {
    this.#isEmitting = true;
  }

  /** Stop continuous emission (existing particles continue) */
  stop(): void {
    this.#isEmitting = false;
  }

  /** Burst emit a specific count of particles at once */
  burst(count: number): void {
    for (let i = 0; i < count; i++) {
      this.#emitOne();
    }
  }

  /** Called each frame. dt is in milliseconds. */
  tick(dt: number): void {
    const dtSec = dt / 1000;

    // 1. Update existing particles
    this.#aliveCount = 0;
    for (const p of this.#particles) {
      if (!p.isAlive) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.life = 0;
        continue;
      }

      // Physics: velocity + gravity
      p.vx += this.gravity[0] * dtSec;
      p.vy += this.gravity[1] * dtSec;
      p.vz += this.gravity[2] * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.z += p.vz * dtSec;

      // Interpolate visual properties based on normalized life
      const t = 1 - p.life / p.maxLife; // 0 at birth, 1 at death
      p.size = this.sizeRange[0] + (this.sizeRange[1] - this.sizeRange[0]) * t;
      p.r = this.colorStart[0] + (this.colorEnd[0] - this.colorStart[0]) * t;
      p.g = this.colorStart[1] + (this.colorEnd[1] - this.colorStart[1]) * t;
      p.b = this.colorStart[2] + (this.colorEnd[2] - this.colorStart[2]) * t;
      p.a = this.colorStart[3] + (this.colorEnd[3] - this.colorStart[3]) * t;

      this.#aliveCount++;
    }

    // 2. Emit new particles (continuous)
    if (this.#isEmitting && this.emitRate > 0) {
      this.#emitAccumulator += this.emitRate * dtSec;
      while (this.#emitAccumulator >= 1) {
        this.#emitOne();
        this.#emitAccumulator -= 1;
      }
    }

    // 3. Pack instance data
    this.#packInstanceData();
  }

  #emitOne(): void {
    // Find a dead particle slot
    const p = this.#findDeadParticle();
    if (!p) return;

    // Position from entity's world transform
    const transform = this.gameEntity.getComponent(Transform);
    if (transform) {
      const m = transform.modelMatrix;
      // Extract world position from model matrix column 3
      p.x = m[12];
      p.y = m[13];
      p.z = m[14];
    } else {
      p.x = 0;
      p.y = 0;
      p.z = 0;
    }

    // Direction with spread
    const dir = this.#randomDirection();
    const spd = this.speed[0] + Math.random() * (this.speed[1] - this.speed[0]);
    p.vx = dir[0] * spd;
    p.vy = dir[1] * spd;
    p.vz = dir[2] * spd;

    // Life
    p.maxLife = this.lifetime[0] + Math.random() * (this.lifetime[1] - this.lifetime[0]);
    p.life = p.maxLife;

    // Initial visual
    p.size = this.sizeRange[0];
    p.r = this.colorStart[0];
    p.g = this.colorStart[1];
    p.b = this.colorStart[2];
    p.a = this.colorStart[3];
  }

  #findDeadParticle(): Particle | null {
    for (const p of this.#particles) {
      if (!p.isAlive) return p;
    }
    return null;
  }

  #randomDirection(): [number, number, number] {
    if (this.spread >= Math.PI) {
      // Full sphere
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      return [
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
      ];
    }
    // Cone around direction
    const [dx, dy, dz] = this.direction;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const ndx = dx / len, ndy = dy / len, ndz = dz / len;

    const theta = Math.random() * 2 * Math.PI;
    const cosSpread = Math.cos(this.spread);
    const z = cosSpread + Math.random() * (1 - cosSpread);
    const r = Math.sqrt(1 - z * z);

    // Build rotation from (0,0,1) to direction
    // Simple cross-product approach
    let ux: number, uy: number, uz: number;
    if (Math.abs(ndz) < 0.99) {
      // cross with (0,0,1)
      ux = -ndy; uy = ndx; uz = 0;
      const ulen = Math.sqrt(ux * ux + uy * uy) || 1;
      ux /= ulen; uy /= ulen;
    } else {
      ux = 1; uy = 0; uz = 0;
    }
    const vx = ndy * uz - ndz * uy;
    const vy = ndz * ux - ndx * uz;
    const vz = ndx * uy - ndy * ux;

    const px = r * Math.cos(theta);
    const py = r * Math.sin(theta);

    return [
      px * ux + py * vx + z * ndx,
      px * uy + py * vy + z * ndy,
      px * uz + py * vz + z * ndz,
    ];
  }

  #packInstanceData(): void {
    let offset = 0;
    const data = this.#instanceData;
    for (const p of this.#particles) {
      if (!p.isAlive) continue;
      data[offset++] = p.x;
      data[offset++] = p.y;
      data[offset++] = p.z;
      data[offset++] = p.size;
      data[offset++] = p.r;
      data[offset++] = p.g;
      data[offset++] = p.b;
      data[offset++] = p.a;
    }
    // aliveCount is already set in tick()
  }

  get aliveCount(): number { return this.#aliveCount; }
  get instanceData(): Float32Array { return this.#instanceData; }
  get isEmitting(): boolean { return this.#isEmitting; }
}
