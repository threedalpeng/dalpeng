import MeshBuilder2D from "@utils/mesh";
import { Vec2 } from "cgd-webgl-math";
import {
  Application,
  GameEntity,
  MeshRenderer2D,
  Shader,
  Transform2D,
} from "@core/index";
import mainShaderVert from "@shaders/main.vert?raw";
import mainShaderFrag from "@shaders/main.frag?raw";
import BallScript from "./BallScript";
import PlayerScript from "./PlayerScript";

export default class PongApplication extends Application {
  board1 = new GameEntity("Board1");
  board2 = new GameEntity("Board2");
  ball = new GameEntity("Ball");

  async _setup() {
    const mainShader = await Shader.create("main").loadFrom(
      mainShaderVert,
      mainShaderFrag
    );

    let transform, renderer, script;

    // board1
    transform = this.board1.addComponent(Transform2D);
    transform.position = new Vec2([160, 360]);
    transform.scale = new Vec2([5, 72]);
    renderer = this.board1.addComponent(MeshRenderer2D);
    renderer.mesh = MeshBuilder2D.rectangular();
    renderer.shader = mainShader;
    script = this.board1.addComponent(PlayerScript);
    script.transform = transform;
    script.downKey = "KeyS";
    script.upKey = "KeyW";

    // board2
    transform = this.board2.addComponent(Transform2D);
    transform.position = new Vec2([1080, 360]);
    transform.scale = new Vec2([5, 72]);
    renderer = this.board2.addComponent(MeshRenderer2D);
    renderer.mesh = MeshBuilder2D.rectangular();
    renderer.shader = mainShader;
    script = this.board2.addComponent(PlayerScript);
    script.transform = transform;
    script.downKey = "ArrowDown";
    script.upKey = "ArrowUp";

    // ball
    transform = this.ball.addComponent(Transform2D);
    transform.position = new Vec2([640, 360]);
    transform.scale = new Vec2([10, 10]);
    renderer = this.ball.addComponent(MeshRenderer2D);
    renderer.mesh = MeshBuilder2D.circle(60);
    renderer.shader = mainShader;
    script = this.ball.addComponent(BallScript);
    script.transform = transform;
    script.player1 = this.board1.getComponent(Transform2D)!;
    script.player2 = this.board2.getComponent(Transform2D)!;
  }
}
