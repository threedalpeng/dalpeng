import Dalpeng, {
  MeshBuilder,
  MeshRenderer,
  Shader,
  Transform,
  Camera,
} from "dalpeng";
import { vec3 } from "@dalpeng/math";
import { attachOverlay } from "@dalpeng/demo-devmode";

const FLAG = {
  RELEASE: true,
};

const app = document.querySelector<HTMLCanvasElement>("#app")!;

const box = Dalpeng.createGameEntity("Box");
const sphere = Dalpeng.createGameEntity("Sphere");
const cylinder = Dalpeng.createGameEntity("Cylinder");
const capsule = Dalpeng.createGameEntity("Capsule");
const mainCamera = Dalpeng.createGameEntity("Main Camera");
const pongScene = Dalpeng.createScene("hi")
  .addEntity(box)
  .addEntity(sphere)
  .addEntity(cylinder)
  .addEntity(capsule)
  .addEntity(mainCamera);

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

  // box
  transform = box.addComponent(Transform);
  transform.position = vec3(0, 0, 0);
  transform.scale = vec3(1, 1, 1);
  renderer = box.addComponent(MeshRenderer);
  renderer.mesh = MeshBuilder.box();
  renderer.shader = mainShader;

  // sphere
  transform = sphere.addComponent(Transform);
  transform.position = vec3(-3, 0, 2);
  transform.scale = vec3(1, 1, 1);
  renderer = sphere.addComponent(MeshRenderer);
  renderer.mesh = MeshBuilder.sphere();
  renderer.shader = mainShader;

  // cylinder
  transform = cylinder.addComponent(Transform);
  transform.position = vec3(3, 0, 2);
  transform.scale = vec3(1, 1, 1);
  renderer = cylinder.addComponent(MeshRenderer);
  renderer.mesh = MeshBuilder.cylinder();
  renderer.shader = mainShader;

  // main camera
  transform = mainCamera.addComponent(Transform);
  transform.position = vec3(0, 5, 10);
  let camera = mainCamera.addComponent(Camera);
}

pongApp.setup = setup;

Dalpeng.run();
pongApp.start();

console.log(box);
if (!FLAG.RELEASE) {
  attachOverlay();
}
