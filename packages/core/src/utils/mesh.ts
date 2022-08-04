interface Mesh {
  vertex: {
    position: Float32Array;
    normal: Float32Array;
    texcoord: Float32Array;
  };
  index: Uint8Array;
}

export default class MeshBuilder {
  static box() {
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
      index: new Uint8Array([
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

  static sphere() {}

  static cylinder() {}
  static capsule() {}
}
