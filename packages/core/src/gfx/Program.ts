export default interface Program {
  // Activate the program/pipeline for subsequent draw calls
  use(): void;

  // Query attribute/uniform bindings by name
  getAttribLocation(name: string): number;
  getUniformLocation(name: string): unknown;

  // Release underlying resources, if any
  dispose(): void;

  // Uniform setters (minimal set used by engine today)
  setUniformMat4(name: string, data: Float32List): void;
  setUniformMat3(name: string, data: Float32List): void;
  setUniformVec3(name: string, data: Float32List): void;
  setUniformVec2(name: string, data: Float32List): void;
  setUniform1f(name: string, v: number): void;
  setUniform1i(name: string, v: number): void;
  setUniformMat4Array(name: string, data: Float32Array, count: number): void;
}
