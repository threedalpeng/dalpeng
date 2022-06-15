import { Application, GameEntity, Scene } from "@dalpeng/core";
const Dalpeng = {
  createApp(name?: string): Application {
    return new Application(name);
  },
  createScene(name?: string): Scene {
    return new Scene(name);
  },
  createGameEntity(name?: string): GameEntity {
    return new GameEntity(name);
  },
  run() {
    Application.run();
  },
};

export {
  Script,
  Transform2D,
  MeshRenderer2D,
  Shader,
  Time,
  MeshBuilder2D,
  Input,
  Camera2D,
} from "@dalpeng/core";
export default Dalpeng;
