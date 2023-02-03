import Component, { type ComponentConstructor } from "./component/Component";
import Camera from "./graphics/Camera";
import Light from "./graphics/Light";
import MeshRenderer from "./graphics/MeshRenderer";
import Shader from "./graphics/Shader";
import View from "./graphics/View";
import Input from "./Input";
import type Scene from "./Scene";
import Script from "./Script";
import gbuffrag from "./shaders/gbuf.frag?raw";
import gbufvert from "./shaders/gbuf.vert?raw";
import mainfrag from "./shaders/main.frag?raw";
import mainvert from "./shaders/main.vert?raw";
import Time from "./Time";
import Transform from "./Transform";
import { isNil } from "./utils/basic";

export default class Application {
  /* App Self-Managemnet */
  static instanceList = new Map<number, Application>();
  static #nextId = 0;
  #id = 0;
  get id() {
    return this.#id;
  }
  name = "";

  constructor(name: string = "") {
    this.#id = Application.#nextId++;
    Application.instanceList.set(this.#id, this);
    this.name = name;
  }

  /* Scene Management */
  #sceneList = new Map<number, Scene>();
  addScene(scene: Scene) {
    if (scene.app !== undefined) {
      scene.app.removeScene(scene);
    }
    scene.app = this;
    this.#sceneList.set(scene.id, scene);
    return this;
  }
  removeScene(scene: Scene) {
    this.#sceneList.delete(scene.id);
    return this;
  }

  /* Component Management */
  activeComponents = new Map<string, Component[]>();
  async forEachActiveComponent<Type extends Component>(
    type: ComponentConstructor<Type>,
    callback: (component: Type) => void
  ) {
    (this.activeComponents.get(type.name) as Type[]).forEach(callback);
  }

  /* Script Management */
  activeScripts = new Map<number, Script>();
  async forEachActiveScript(callback: (component: Script) => void) {
    this.activeScripts.forEach(callback);
  }

  /* Graphic Context */
  context!: WebGL2RenderingContext;

  get gl() {
    return this.context;
  }
  get isContextReady() {
    if (isNil(this.context)) {
      return false;
    }
    if (isNil(this.context.canvas)) {
      return false;
    }
    return true;
  }

  async mount(canvas: HTMLCanvasElement) {
    if (isNil(canvas)) {
      console.error("Canvas Not Mounted");
      return this;
    }

    this.context = canvas.getContext("webgl2", { alpha: false })!;

    if (isNil(this.context)) {
      console.error("Cannot use WebGL2");
      return this;
    }

    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE);

    if (!this.gl.getExtension("EXT_color_buffer_float")) {
      console.error("FLOAT color buffer not available");
      document.body.innerHTML =
        "This requires EXT_color_buffer_float which is unavailable on this system.";
    }

    this.registerShader(this.shader.geometry);
    this.registerShader(this.shader.lighting);

    await Promise.allSettled([
      this.shader.geometry.loadFrom(gbufvert, gbuffrag),
      this.shader.lighting.loadFrom(mainvert, mainfrag),
    ]);

    this.gBuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gBuffer!);

    this.gPositionMetallic = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gPositionMetallic!);
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texStorage2D(
      this.gl.TEXTURE_2D,
      1,
      this.gl.RGBA16F,
      this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight
    );
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      this.gPositionMetallic!,
      0
    );

    this.gNormalRoughness = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalRoughness!);
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texStorage2D(
      this.gl.TEXTURE_2D,
      1,
      this.gl.RGBA16F,
      this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight
    );
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT1,
      this.gl.TEXTURE_2D,
      this.gNormalRoughness!,
      0
    );

    this.gAlbedo = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gAlbedo!);
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texStorage2D(
      this.gl.TEXTURE_2D,
      1,
      this.gl.RGBA16F,
      this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight
    );
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT2,
      this.gl.TEXTURE_2D,
      this.gAlbedo!,
      0
    );

    this.gEmissive = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gEmissive!);
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texStorage2D(
      this.gl.TEXTURE_2D,
      1,
      this.gl.RGBA16F,
      this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight
    );
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT3,
      this.gl.TEXTURE_2D,
      this.gEmissive!,
      0
    );

    const depthTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, depthTexture);
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE
    );
    this.gl.texStorage2D(
      this.gl.TEXTURE_2D,
      1,
      this.gl.DEPTH_COMPONENT16,
      this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight
    );
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.DEPTH_ATTACHMENT,
      this.gl.TEXTURE_2D,
      depthTexture,
      0
    );

    this.gl.drawBuffers([
      this.gl.COLOR_ATTACHMENT0,
      this.gl.COLOR_ATTACHMENT1,
      this.gl.COLOR_ATTACHMENT2,
      this.gl.COLOR_ATTACHMENT3,
    ]);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gPositionMetallic);
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalRoughness);
    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gAlbedo);
    this.gl.activeTexture(this.gl.TEXTURE3);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gEmissive);

    canvas.setAttribute("tabindex", "0");
    canvas.focus();
    canvas.addEventListener("click", () => {
      canvas.focus();
    });
    Input.supportedEventList.forEach((event) => {
      canvas.addEventListener(event, Input.handleEvent);
    });

    if (await Application.shouldRun()) {
      Application.run();
    }

    return this;
  }

  #viewList = new Map<number, View>();
  addView(view: View) {
    if (view.app !== undefined) {
      view.app.removeView(view);
    }
    view.app = this;
    this.#viewList.set(view.id, view);
    return this;
  }
  removeView(view: View) {
    this.#viewList.delete(view.id);
    return this;
  }

  /* Resource Management */
  registerShader(shader: Shader) {
    shader.gl = this.context;
    return this;
  }
  shader = {
    geometry: new Shader(),
    lighting: new Shader(),
  };
  gBuffer: WebGLFramebuffer | null = null;
  gPositionMetallic: WebGLTexture | null = null;
  gNormalRoughness: WebGLTexture | null = null;
  gAlbedo: WebGLTexture | null = null;
  gEmissive: WebGLTexture | null = null;

  /* Game Loop */
  static #activeInstances = new Map<number, Application>();
  static #instanceEvents: (() => any)[] = [];
  state: "new" | "ready" | "running" = "new";
  async start() {
    Application.#activeInstances.set(this.#id, this);
    Application.#instanceEvents.push(async () => {
      if (this.state === "new") {
        await this.#setup();
      }
      this.state = "running";
    });
    if (await Application.shouldRun()) {
      Application.run();
    }
  }
  async stop() {
    Application.#activeInstances.delete(this.#id);
    Application.#instanceEvents.push(async () => {
      if (this.state === "running") {
        this.state = "ready";
      }
    });
  }
  static async processInstanceEvents() {
    this.#instanceEvents.forEach((event) => {
      event();
    });
    this.#instanceEvents = [];
  }
  static async shouldRun() {
    const checkIfActiveInstancesExist = () => {
      return this.#activeInstances.size !== 0;
    };
    const checkIfCanvasesMounted = () => {
      let isCanvasesMounted = true;
      this.forEachActive((app) => {
        isCanvasesMounted = app.isContextReady;
      });
      return isCanvasesMounted;
    };
    return checkIfActiveInstancesExist() && checkIfCanvasesMounted();
  }
  static shouldQuit() {
    return this.#activeInstances.size === 0;
  }

  static async run() {
    Time._setFixedUpdateRate(60);
    Time._setup();

    const loop: FrameRequestCallback = async (t) => {
      await this.processInstanceEvents();
      if (this.shouldQuit()) return;

      Time._updateDelta(t);
      Input.poll();

      while (Time._needsFixedUpdate()) {
        await this.forEachActive((app) => app.#fixedUpdate());
      }
      await this.forEachActive((app) => app.#update());

      await this.forEachActive((app) => app.#render());

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  async #setup() {
    this.#sceneList.forEach((scene) =>
      Object.values(scene.rootEntities).forEach((rootEntity) => {
        rootEntity.getComponent(Transform)?.checkModelMatrixToBeUpdated();
      })
    );
    this.activeComponents.forEach((components) =>
      components.forEach((component) => component.setup())
    );
    this.forEachActiveScript((script) => script.setup());
  }

  async #fixedUpdate() {
    this.forEachActiveScript((script) => script.fixedUpdate());
  }
  async #update() {
    await this.forEachActiveComponent(Camera, (camera) => camera.update());
    await this.forEachActiveScript((script) => script.update());
    this.#sceneList.forEach((scene) =>
      Object.values(scene.rootEntities).forEach((rootEntity) => {
        rootEntity.getComponent(Transform)?.checkModelMatrixToBeUpdated();
      })
    );
  }

  async #render() {
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    this.gl.clearColor(0, 0, 0, 0);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gBuffer!);
    this.shader.geometry.use();
    this.gl.depthMask(true);
    this.gl.disable(this.gl.BLEND);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    await this.forEachActiveComponent(Camera, (camera) => {
      camera.renderCameraToGeometry();
    });
    await this.forEachActiveComponent(MeshRenderer, (renderer) => {
      renderer.render();
    });
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    this.shader.lighting.use();
    this.gl.depthMask(false);
    this.gl.enable(this.gl.BLEND);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.gl.uniform1i(
      this.shader.lighting.getUniformLocation("gPositionMetallic"),
      0
    );
    this.gl.uniform1i(
      this.shader.lighting.getUniformLocation("gNormalRoughness"),
      1
    );
    this.gl.uniform1i(this.shader.lighting.getUniformLocation("gAlbedo"), 2);
    this.gl.uniform1i(this.shader.lighting.getUniformLocation("gEmissive"), 3);

    await this.forEachActiveComponent(Camera, (camera) => {
      camera.renderCameraToLighting();
    });
    await this.forEachActiveComponent(Light, (light) => {
      light.renderLight();
    });
  }

  static async forEach(callback: (instance: Application) => void) {
    Application.instanceList.forEach(callback);
  }
  static async forEachActive(callback: (instance: Application) => void) {
    Application.#activeInstances.forEach(callback);
  }
}
