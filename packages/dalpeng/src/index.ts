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
  Transform,
  MeshRenderer,
  Shader,
  Time,
  MeshBuilder,
  Input,
  Camera,
} from "@dalpeng/core";
export default Dalpeng;
