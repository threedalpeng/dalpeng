import { Mat3, type Vec2 } from "@dalpeng/math";

export function loadShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string
) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  } else {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
}

export function loadProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  } else {
    return program;
  }
}

export function getPerspective2D(size: number, aspectRatio: number) {
  const invSize = 1 / size;
  return new Mat3([invSize / aspectRatio, 0, 0, 0, invSize, 0, 0, 0, 1]);
}

export function getView2D(center: Vec2, angle: number) {
  const rMat = Mat3.rotate(angle);
  rMat._20 = -center.x;
  rMat._21 = -center.y;
  return rMat;
}
