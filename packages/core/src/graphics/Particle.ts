export default class Particle {
  // Position (world space)
  x = 0;
  y = 0;
  z = 0;

  // Velocity (world units/sec)
  vx = 0;
  vy = 0;
  vz = 0;

  // Life
  life = 0; // remaining life in ms
  maxLife = 1000; // total life in ms

  // Visual
  size = 1;
  r = 1;
  g = 1;
  b = 1;
  a = 1;

  // Is this particle slot alive?
  get isAlive(): boolean {
    return this.life > 0;
  }

  /** Reset this particle for reuse from pool */
  reset(): void {
    this.x = this.y = this.z = 0;
    this.vx = this.vy = this.vz = 0;
    this.life = 0;
    this.maxLife = 1000;
    this.size = 1;
    this.r = this.g = this.b = this.a = 1;
  }
}
