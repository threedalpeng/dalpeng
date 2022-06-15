import Dalpeng, {
  MeshBuilder2D,
  MeshRenderer2D,
  Shader,
  Transform2D,
} from "dalpeng";
import { Vec2 } from "@dalpeng/math";
import PlayerScript from "./PlayerScript";
import BallScript from "./BallScript";

const app = document.querySelector<HTMLCanvasElement>("#app")!;

const player1 = Dalpeng.createGameEntity("player1");
const player2 = Dalpeng.createGameEntity("player2");
const ball = Dalpeng.createGameEntity("ball");
const pongScene = Dalpeng.createScene("hi")
  .addEntity(player1)
  .addEntity(player2)
  .addEntity(ball);
const mainShader = await Shader.create("main");
const pongApp = Dalpeng.createApp()
  .mount(app)
  .addScene(pongScene)
  .registerShader(mainShader);

await mainShader.loadFrom(
  (
    await import("./shaders/main.vert?raw")
  ).default,
  (
    await import("./shaders/main.frag?raw")
  ).default
);

async function setup() {
  let transform, renderer, script;

  // board1
  transform = player1.addComponent(Transform2D);
  transform.position = new Vec2([160, 360]);
  transform.scale = new Vec2([5, 72]);
  renderer = player1.addComponent(MeshRenderer2D);
  renderer.mesh = MeshBuilder2D.rectangular();
  renderer.shader = mainShader;
  script = player1.addComponent(PlayerScript);
  script.transform = transform;
  script.downKey = "KeyS";
  script.upKey = "KeyW";

  // board2
  transform = player2.addComponent(Transform2D);
  transform.position = new Vec2([1080, 360]);
  transform.scale = new Vec2([5, 72]);
  renderer = player2.addComponent(MeshRenderer2D);
  renderer.mesh = MeshBuilder2D.rectangular();
  renderer.shader = mainShader;
  script = player2.addComponent(PlayerScript);
  script.transform = transform;
  script.downKey = "ArrowDown";
  script.upKey = "ArrowUp";

  // ball
  transform = ball.addComponent(Transform2D);
  transform.position = new Vec2([640, 360]);
  transform.scale = new Vec2([10, 10]);
  renderer = ball.addComponent(MeshRenderer2D);
  renderer.mesh = MeshBuilder2D.circle(60);
  renderer.shader = mainShader;
  script = ball.addComponent(BallScript);
  script.transform = transform;
  script.player1 = player1.getComponent(Transform2D)!;
  script.player2 = player2.getComponent(Transform2D)!;
}

pongApp.setup = setup;

Dalpeng.run();
pongApp.start();

  const stream = app.captureStream();

  let recordedChunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm; codecs=vp9",
  });
  recorder.ondataavailable = (e) => {
    recordedChunks.push(e.data);
  };

  const btnStart: HTMLButtonElement =
    document.querySelector("#btn-record-start")!;
  btnStart.onclick = (e) => {
    if (recorder.state !== "recording") {
      recorder.start();
      recordedChunks = [];
    }
  };

  btnStop.onclick = (e) => {
    if (recorder.state === "recording") {
      recorder.stop();
    }
  };

  const btnDownload: HTMLButtonElement = document.querySelector(
    "#btn-record-download"
  )!;
  btnDownload.onclick = (e) => {
    if (recorder.state === "inactive") {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const exportUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      document.body.appendChild(link);
      link.href = exportUrl;
      link.download = "captured.webm";
      link.click();

      window.URL.revokeObjectURL(exportUrl);
      link.remove();
    }
  };
