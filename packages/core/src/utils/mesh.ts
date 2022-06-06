export default class MeshBuilder2D {
  static regularTraingle() {
    return {
      position: new Float32Array([
        0,
        -1 / Math.sqrt(3),
        0.5,
        (1 / Math.sqrt(3)) * 0.5,
        -0.5,
        (1 / Math.sqrt(3)) * 0.5,
      ]),
      color: new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]),
    };
  }

  static circle(division: number) {
    const centerRadian = (2 * Math.PI) / division;
    const mesh = {
      position: new Float32Array(division * 3 * 2),
      color: new Uint8Array(division * 3 * 3),
    };
    for (let i = 0; i < division; i++) {
      const radian0 = centerRadian * i;
      const radian1 = centerRadian * (i + 1);
      const s0 = Math.sin(radian0);
      const c0 = Math.cos(radian0);
      const s1 = Math.sin(radian1);
      const c1 = Math.cos(radian1);
      mesh.position.set([c0, s0], i * 6);
      mesh.position.set([c1, s1], i * 6 + 2);
      mesh.position.set([0, 0], i * 6 + 4);
      mesh.color.set([158, 123, 194, 158, 123, 194, 158, 123, 194], i * 9);
    }
    return mesh;
  }

  static rectangular() {
    return {
      position: new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]),
      color: new Uint8Array([
        255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
        255, 255, 255, 255,
      ]),
    };
  }
}
