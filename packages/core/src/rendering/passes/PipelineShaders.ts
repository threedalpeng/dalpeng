import Shader from "../../graphics/Shader";

export default class PipelineShaders {
  readonly geometry = new Shader();
  readonly lighting = new Shader();
  readonly shadow = new Shader();
  readonly post = new Shader();
  readonly bloomBright = new Shader();
  readonly bloomBlur = new Shader();
  readonly particle = new Shader();
  readonly ssao = new Shader();
  readonly ssaoBlur = new Shader();
  readonly skybox = new Shader();
  readonly fxaa = new Shader();
  readonly sprite2d = new Shader();
  readonly blit = new Shader();
}
