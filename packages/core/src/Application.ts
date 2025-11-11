import Component, { type ComponentConstructor } from "./component/Component";
import Camera from "./graphics/Camera";
import Light from "./graphics/Light";
import MeshRenderer from "./graphics/MeshRenderer";
import SpriteRenderer from "./graphics/SpriteRenderer";
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
import type { RendererBackend } from "./gfx/RendererBackend";
import WebGL2Renderer from "./gfx/webgl2/WebGL2Renderer";
import type { CanvasOptions } from "./CanvasOptions";

export default class Application {
  // ─── App Self-Management ───────────────────────────────────────────────────
  // Handles instance registration and naming for Applications.
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

  // ─── Scene Management ──────────────────────────────────────────────────────
  // Adds/removes scenes while keeping ownership references consistent.
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

  // ─── Component Management ──────────────────────────────────────────────────
  // Tracks active component sets and dirty transforms per frame.
  activeComponents = new Map<string, Set<Component>>();
  #dirtyTransforms = new Set<Transform>();
  async forEachActiveComponent<Type extends Component>(
    type: ComponentConstructor<Type>,
    callback: (component: Type) => void
  ) {
    const components = this.activeComponents.get(type.name) as
      | Set<Type>
      | undefined;
    if (components === undefined) {
      return;
    }
    for (const component of components) {
      callback(component);
    }
  }
  queueTransformUpdate(transform: Transform) {
    this.#dirtyTransforms.add(transform);
  }
  #processDirtyTransforms() {
    if (this.#dirtyTransforms.size === 0) return;
    const dirty = Array.from(this.#dirtyTransforms);
    this.#dirtyTransforms.clear();
    dirty.forEach((transform) => transform.checkModelMatrixToBeUpdated());
  }

  // ─── Script Management ─────────────────────────────────────────────────────
  // Iterates active scripts for setup, update, and fixed-update phases.
  activeScripts = new Map<number, Script>();
  async forEachActiveScript(callback: (component: Script) => void) {
    this.activeScripts.forEach(callback);
  }

  // ─── Graphic Context ───────────────────────────────────────────────────────
  // Graphics context (backend-specific)
  context!: any;
  renderer: RendererBackend = new WebGL2Renderer();

  useRenderer(renderer: RendererBackend) {
    this.renderer = renderer;
    return this;
  }

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

  // ─── Mount & Render Loop ───────────────────────────────────────────────────
  // Initializes WebGL state and kicks off the main render/update loop.
  async mount(canvas: HTMLCanvasElement) {
    if (isNil(canvas)) {
      console.error("Canvas Not Mounted");
      return this;
    }

    // Initialize renderer backend (creates context and G-Buffer)
    await this.renderer.init(this, canvas);

    // Setup canvas sizing configuration
    this.#canvas = canvas;
    this.setCanvasOptions();
    this.#applyCanvasSizing();
    if (this.#canvasOptions.autoResize) {
      window.addEventListener("resize", this.#handleResize);
    }

    this.registerShader(this.shader.geometry);
    this.registerShader(this.shader.lighting);

    await Promise.allSettled([
      this.shader.geometry.loadFrom(gbufvert, gbuffrag),
      this.shader.lighting.loadFrom(mainvert, mainfrag),
    ]);

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

  /* Canvas sizing */
  #canvas!: HTMLCanvasElement;
  #canvasOptions: Required<CanvasOptions> = {
    mode: "fill",
    fixedAspect: 0,
    pixelRatio: "device",
    autoResize: true,
  };
  setCanvasOptions(options?: CanvasOptions) {
    if (!options) return this;
    this.#canvasOptions = {
      mode: options.mode ?? this.#canvasOptions.mode,
      fixedAspect: options.fixedAspect ?? this.#canvasOptions.fixedAspect,
      pixelRatio: options.pixelRatio ?? this.#canvasOptions.pixelRatio,
      autoResize: options.autoResize ?? this.#canvasOptions.autoResize,
    } as Required<CanvasOptions>;
    return this;
  }
  async run(canvas: HTMLCanvasElement, options?: CanvasOptions) {
    if (options) this.setCanvasOptions(options);
    await this.mount(canvas);
    await this.start();
    return this;
  }
  async runOn(target: HTMLCanvasElement | string, options?: CanvasOptions) {
    const canvas =
      typeof target === "string"
        ? (document.querySelector(target) as HTMLCanvasElement)
        : target;
    return this.run(canvas, options);
  }
  #handleResize = () => {
    this.#applyCanvasSizing();
    this.renderer.resize(this);
  };
  #applyCanvasSizing() {
    const canvas = this.#canvas;
    if (!canvas) return;
    const parent = (canvas.parentElement ?? document.body) as HTMLElement;
    const parentRect = parent.getBoundingClientRect();
    const parentW = Math.max(1, Math.floor(parentRect.width));
    const parentH = Math.max(1, Math.floor(parentRect.height));
    const dpr = this.#canvasOptions.pixelRatio === "device" ? Math.min(window.devicePixelRatio || 1, 4) : Math.max(1, this.#canvasOptions.pixelRatio as number);

    let cssW = parentW;
    let cssH = parentH;
    const aspect = this.#canvasOptions.fixedAspect;
    if (this.#canvasOptions.mode === "contain" && aspect && aspect > 0) {
      const targetH = Math.floor(parentW / aspect);
      if (targetH <= parentH) {
        cssW = parentW;
        cssH = targetH;
      } else {
        cssH = parentH;
        cssW = Math.floor(parentH * aspect);
      }
    } else if (this.#canvasOptions.mode === "cover" && aspect && aspect > 0) {
      const targetH = Math.floor(parentW / aspect);
      if (targetH >= parentH) {
        cssW = parentW;
        cssH = targetH;
      } else {
        cssH = parentH;
        cssW = Math.floor(parentH * aspect);
      }
    } else if (this.#canvasOptions.mode === "none") {
      // leave cssW/cssH as is (fallback to current style size)
      const styleW = parseInt(canvas.style.width || "0");
      const styleH = parseInt(canvas.style.height || "0");
      cssW = styleW || parentW;
      cssH = styleH || parentH;
    }

    const bufferW = Math.max(1, Math.floor(cssW * dpr));
    const bufferH = Math.max(1, Math.floor(cssH * dpr));
    if (canvas.width !== bufferW) canvas.width = bufferW;
    if (canvas.height !== bufferH) canvas.height = bufferH;

    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.style.display = "block";

    // Ensure backend resources match new size
    this.renderer.resize(this);
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
    shader.bindBackend(this.renderer);
    return this;
  }
  shader = {
    geometry: new Shader(),
    lighting: new Shader(),
  };
  // Backend-owned resources (opaque to the engine)
  gBuffer: any | null = null;
  gPositionMetallic: any | null = null;
  gNormalRoughness: any | null = null;
  gAlbedo: any | null = null;
  gEmissive: any | null = null;

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
    this.#processDirtyTransforms();
    this.activeComponents.forEach((components) =>
      components.forEach((component) => component.setup())
    );
    this.forEachActiveScript((script) => script.setup());
  }

  async #fixedUpdate() {
    this.forEachActiveScript((script) => script.fixedUpdate());
  }
  async #update() {
    this.#processDirtyTransforms();
    await this.forEachActiveComponent(Camera, (camera) => camera.update());
    await this.forEachActiveScript((script) => script.update());
  }

  async #render() {
    const { width, height } = this.renderer.getDrawableSize(this);
    this.renderer.setViewport(this, 0, 0, width, height);

    this.shader.geometry.use();
    this.renderer.beginGeometryPass(this);

    await this.forEachActiveComponent(Camera, (camera) => {
      camera.renderCameraToGeometry();
    });
    await this.forEachActiveComponent(MeshRenderer, (renderer) => {
      renderer.render();
    });
    await this.forEachActiveComponent(SpriteRenderer, (renderer) => {
      renderer.render();
    });
    this.renderer.endGeometryPass(this);

    this.shader.lighting.use();
    this.renderer.beginLightingPass(this);

    this.shader.lighting.setUniform1i("gPositionMetallic", 0);
    this.shader.lighting.setUniform1i("gNormalRoughness", 1);
    this.shader.lighting.setUniform1i("gAlbedo", 2);
    this.shader.lighting.setUniform1i("gEmissive", 3);

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
