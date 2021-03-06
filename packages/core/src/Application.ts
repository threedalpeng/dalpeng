import Time from "./Time";
import { isNil } from "./utils/basic";
import Component from "./component/Component";
import { type ComponentConstructor } from "./component/Component";
import Input from "./Input";
import type Scene from "./Scene";
import type Shader from "./graphics/Shader";
import View from "./graphics/View";

export default class Application {
  /* App Self-Managemnet */
  static instanceList: { [instanceId: number]: Application } = {};
  static #nextId = 0;
  #id = 0;
  get id() {
    return this.#id;
  }
  name = "";

  constructor(name: string = "") {
    this.#id = Application.#nextId++;
    Application.instanceList[this.#id] = this;
    this.name = name;
  }

  /* Scene Management */
  #sceneList: { [sceneId: number]: Scene } = {};
  addScene(scene: Scene) {
    if (scene.app !== undefined) {
      scene.app.removeScene(scene);
    }
    scene.app = this;
    this.#sceneList[scene.id] = scene;
    return this;
  }
  removeScene(scene: Scene) {
    delete this.#sceneList[scene.id];
    return this;
  }

  /* Component Management */
  activeComponents: { [id: number]: Component } = {};

  /* Graphic Context */
  context!: WebGL2RenderingContext;

  get gl() {
    return this.context;
  }

  mount(canvas: HTMLCanvasElement) {
    if (isNil(canvas)) {
      console.error("Canvas Not Mounted");
      return this;
    }

    this.context = canvas.getContext("webgl2", { alpha: false })!;

    if (isNil(this.gl)) {
      console.error("Cannot use WebGL2");
      return this;
    }

    canvas.setAttribute("tabindex", "0");
    canvas.focus();
    canvas.addEventListener("click", (e) => {
      canvas.focus();
    });
    Input.supportedEventList.forEach((event) => {
      canvas.addEventListener(event, Input.handleEvent);
    });

    return this;
  }

  #viewList: { [viewId: number]: View } = {};
  addView(view: View) {
    if (view.app !== undefined) {
      view.app.removeView(view);
    }
    view.app = this;
    this.#viewList[view.id] = view;
    return this;
  }
  removeView(view: View) {
    delete this.#viewList[view.id];
    return this;
  }

  /* Resource Management */
  registerShader(shader: Shader) {
    shader.gl = this.context;
    return this;
  }

  /* Game Loop */
  static #activeInstances: { [instanceId: number]: Application } = {};
  state: "new" | "ready" | "running" = "new";
  async start() {
    if (this.state === "new") {
      await this.#begin();
      await this.#setup();
    }
    this.state = "running";
    Application.#activeInstances[this.#id] = this;
  }
  async stop() {
    if (this.state === "running") {
      this.state = "ready";
      delete Application.#activeInstances[this.#id];
    }
  }

  static async run() {
    Time._setFixedUpdateRate(60);
    Time._setup();

    const loop: FrameRequestCallback = async (t) => {
      Time._updateDelta(t);
      Input.poll();

      while (Time._needsFixedUpdate()) {
        await this.forEachActive((app) => app.broadcastRun("fixedUpdate"));
      }

      await this.forEachActive((app) => app.#update());
      await this.forEachActive((app) => app.#render());

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  #begin: () => Promise<void> = async () => {};
  async #setup() {
    this.broadcastRun("setup");
  }

  set setup(setupFunc: () => Promise<void>) {
    this.#begin = setupFunc;
  }

  async #fixedUpdate() {}
  async #update() {
    this.broadcastRun("update");
  }

  async #render() {
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.broadcastRun("cameraRender");
    this.broadcastRun("render");
    //forEachComponent(MeshRenderer2D, (renderer) => renderer.render());
  }

  static async forEach(callback: (instance: Application) => void) {
    Object.values(Application.instanceList).forEach(callback);
  }
  static async forEachActive(callback: (instance: Application) => void) {
    Object.values(Application.#activeInstances).forEach(callback);
  }

  broadcastRun(event: string) {
    Object.values(this.activeComponents).forEach((component) => {
      component.emit("run", event);
    });
  }
}

function forEachComponent<Type extends Component>(
  type: ComponentConstructor<Type>,
  callback: (component: Type) => void
): void {
  Object.values(Component.find(type)).forEach((components: Type[]) => {
    components.forEach(callback);
  });
}
