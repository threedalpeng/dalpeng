export interface Mesh {
  vertex: {
    position: Float32Array;
    normal: Float32Array;
    texcoord: Float32Array;
  };
  index: Uint16Array;
}

export default class MeshBuilder {
  static box(): Mesh {
    const boxMesh: Mesh = {
      // prettier-ignore
      vertex: {
        position: new Float32Array([
          1, 1, 1,    1, 1, -1,     -1, 1, -1,  -1, 1, 1,   // top
          -1, -1, 1,  -1, -1, -1,   1, -1, -1,  1, -1, 1,   // bottom
          -1, 1, 1,   -1, 1, -1,    -1, -1, -1, -1, -1, 1,  // left
          1, -1, 1,   1, -1, -1,    1, 1, -1,   1, 1, 1,    // right
          1, 1, 1,    -1, 1, 1,     -1, -1, 1,  1, -1, 1,   // front
          1, 1, -1,   1, -1, -1,    -1, -1, -1, -1, 1, -1,  // back
        ]),
        normal: new Float32Array([
          0, 1, 0,    0, 1, 0,    0, 1, 0,    0, 1, 0,  // top
          0, -1, 0,   0, -1, 0,   0, -1, 0,   0, -1, 0, // bottom
          -1, 0, 0,   -1, 0, 0,   -1, 0, 0,   -1, 0, 0, // left
          1, 0, 0,    1, 0, 0,    1, 0, 0,    1, 0, 0,  // right
          0, 0, 1,    0, 0, 1,    0, 0, 1,    0, 0, 1,  // front
          0, 0, -1,   0, 0, -1,   0, 0, -1,   0, 0, -1, // back
        ]),
        texcoord: new Float32Array([
          0, 1,   1, 1,   1, 0,   0, 0, // top
          0, 1,   1, 1,   0, 0,   0, 0, // bottom
          0, 1,   1, 1,   1, 0,   0, 0, // left
          0, 1,   1, 1,   1, 0,   0, 0, // right
          0, 1,   1, 1,   1, 0,   0, 0, // front
          0, 1,   1, 1,   1, 0,   0, 0, // back
        ]),
      },
      // prettier-ignore
      index: new Uint16Array([
        0, 1, 2,    0, 2, 3,    // top
        4, 5, 6,    4, 6, 7,    // bottom
        8, 9, 10,   8, 10, 11,  // left
        12, 13, 14, 12, 14, 15, // right
        16, 17, 18, 16, 18, 19, // front
        20, 21, 22, 20, 22, 23, // back
      ]),
    };
    return boxMesh;
  }

  static sphere(): Mesh {
    const DIVISION = 30;
    const unitAngle = Math.PI / DIVISION;

    const spherePoints = [];
    const texcoord = [];
    for (let i = 0; i <= DIVISION; i++) {
      const t = unitAngle * i;
      const st = Math.sin(t);
      const ct = Math.cos(t);
      const vTex = i / DIVISION;

      for (let j = 0; j <= DIVISION * 2; j++) {
        const p = unitAngle * j;
        const sp = Math.sin(p);
        const cp = Math.cos(p);
        spherePoints.push(st * cp, ct, st * sp);
        texcoord.push((j / DIVISION) * 2, vTex);
      }
    }

    const indices = [];
    const OFFSET = 2 * DIVISION + 1;
    for (let i = 1; i <= 2 * DIVISION; i++) {
      for (let j = 0; j < DIVISION; j++) {
        const J_OFFSET = j * OFFSET;
        indices.push(
          J_OFFSET + i + OFFSET - 1,
          J_OFFSET + i - 1,
          J_OFFSET + i + OFFSET,
          J_OFFSET + i + OFFSET,
          J_OFFSET + i - 1,
          J_OFFSET + i
        );
      }
    }

    return {
      vertex: {
        position: new Float32Array(spherePoints),
        normal: new Float32Array(spherePoints),
        texcoord: new Float32Array(texcoord),
      },
      index: new Uint16Array(indices),
    };
  }

  static cylinder() {
    const DIVISION = 60;
    const theta = (2 * Math.PI) / DIVISION;

    // top
    const position = [0, 1, 0];
    const normal = [0, 1, 0];
    const texcoord = [0, 0];
    for (let i = 0; i <= DIVISION; i++) {
      const t = theta * i;
      const st = Math.sin(t);
      const ct = Math.cos(t);
      position.push(st, 1, ct);
      normal.push(0, 1, 0);
      texcoord.push(0, 0);
    }
    // bottom
    position.push(0, -1, 0);
    normal.push(0, -1, 0);
    texcoord.push(0, 0);
    for (let i = 0; i <= DIVISION; i++) {
      const t = theta * i;
      const st = Math.sin(t);
      const ct = Math.cos(t);
      position.push(st, -1, ct);
      normal.push(0, -1, 0);
      texcoord.push(0, 0);
    }
    //side
    for (let i = 0; i <= DIVISION; i++) {
      const t = theta * i;
      const st = Math.sin(t);
      const ct = Math.cos(t);
      position.push(st, 1, ct);
      position.push(st, -1, ct);
      normal.push(st, 0, ct);
      normal.push(st, 0, ct);
      texcoord.push(0, 0);
      texcoord.push(0, 0);
    }

    const indices = [];
    const bottomOffset = DIVISION + 2;
    const sideOffset = bottomOffset * 2;
    for (let i = 0; i < DIVISION; i++) {
      const sidePrimitiveOffset = sideOffset + i * 2;
      indices.push(0, i + 1, i + 2);
      indices.push(bottomOffset, bottomOffset + i + 2, bottomOffset + i + 1);
      indices.push(
        sidePrimitiveOffset,
        sidePrimitiveOffset + 1,
        sidePrimitiveOffset + 2
      );
      indices.push(
        sidePrimitiveOffset + 1,
        sidePrimitiveOffset + 3,
        sidePrimitiveOffset + 2
      );
    }

    return {
      vertex: {
        position: new Float32Array(position),
        normal: new Float32Array(normal),
        texcoord: new Float32Array(texcoord),
      },
      index: new Uint16Array(indices),
    };
  }
  static capsule() {}
}

export function dummyQuadForLight() {
  return new Float32Array([-1, 1, 0, -1, -1, 0, 1, 1, 0, 1, -1, 0]);
}
