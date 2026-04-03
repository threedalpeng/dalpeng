import CanvasController from "./CanvasController";
import type { CanvasOptions } from "./CanvasOptions";
import Component, { type ComponentConstructor } from "./ecs/Component";
import type GameEntity from "./ecs/GameEntity";
import type { RendererBackend } from "./gfx/RendererBackend";
import WebGL2Renderer from "./gfx/webgl2/WebGL2Renderer";
import Camera from "./graphics/Camera";
import ParticleEmitter from "./graphics/ParticleEmitter";
import Shader from "./graphics/Shader";
import View from "./graphics/View";
import InputManager from "./InputManager";
import type { RenderConfig } from "./RenderConfig";
import RenderPipeline from "./rendering/RenderPipeline";
import type Scene from "./Scene";
import Script from "./ecs/Script";
import Time from "./Time";
import Transform from "./ecs/Transform";
import Animator from "./animation/Animator";
import TweenManager from "./animation/TweenManager";
import AudioManager from "./audio/AudioManager";
import TextureManager from "./asset/TextureManager";
import ModelManager from "./asset/ModelManager";
import { isNil } from "./utils/basic";
import { FrameProfiler } from "./debug";

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
  forEachActiveComponent<Type extends Component>(
    type: ComponentConstructor<Type>,
    callback: (component: Type) => void
  ) {
    const components = this.activeComponents.get(type.name) as Set<Type> | undefined;
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
    const batch = this.#dirtyTransforms;
    this.#dirtyTransforms = new Set<Transform>();
    for (const transform of batch) transform.checkModelMatrixToBeUpdated();
  }

  // ─── Script Management ─────────────────────────────────────────────────────
  // Iterates active scripts for setup, update, and fixed-update phases.
  activeScripts = new Map<number, Script>();
  forEachActiveScript(callback: (component: Script) => void) {
    for (const script of this.activeScripts.values()) {
      callback(script);
    }
  }

  // ─── Graphic Context ───────────────────────────────────────────────────────
  renderer: RendererBackend = new WebGL2Renderer();
  features: RenderConfig = {
    postToneMapping: false,
  };
  watchFeature?: (key: string, cb: (val: any, old: any) => void) => () => void;

  pipeline = new RenderPipeline();
  canvasController = new CanvasController();
  tweens = new TweenManager();
  audio = new AudioManager();
  input = new InputManager();
  textures = new TextureManager();
  models = new ModelManager();

  /** Proxy — components access shaders via `this.currentApp.shader.geometry` etc. */
  get shader() {
    return this.pipeline.shader;
  }
  /** Proxy — Light.renderLight() reads the shared lighting quad. */
  get lightingQuad() {
    return this.pipeline.lightingQuad;
  }

  useRenderer(renderer: RendererBackend) {
    this.renderer = renderer;
    return this;
  }

  /** Bulk-set render features. Useful for runtime reconfiguration. */
  configure(features: Partial<RenderConfig>): this {
    Object.assign(this.features, features);
    return this;
  }

  /** Load an HDR environment map for IBL. Can be called after mount(). */
  async loadIBL(hdrUrl: string): Promise<void> {
    this.features.iblHdrUrl = hdrUrl;
    await this.pipeline.initIBL(this.renderer, hdrUrl);
  }

  get isContextReady() {
    return this.renderer.isReady();
  }

  registerShader(shader: Shader) {
    shader.bindBackend(this.renderer);
    return this;
  }

  // ─── Mount & Render Loop ───────────────────────────────────────────────────
  // Initializes WebGL state and kicks off the main render/update loop.
  async mount(canvas: HTMLCanvasElement) {
    if (isNil(canvas)) {
      console.error("Canvas Not Mounted");
      return this;
    }

    // Apply canvas sizing FIRST so renderer reads correct buffer dimensions
    this.canvasController.applyInitialSize(canvas);

    // Initialize renderer backend (creates context and G-Buffer at correct size)
    await this.renderer.init(canvas);

    // Bind CanvasController to renderer for ongoing resize events
    this.canvasController.mount(canvas, this.renderer);

    // Initialize render pipeline (shaders, shadow system, GPU resources)
    await this.pipeline.init(this.renderer);

    // IBL precompute (if HDR URL is configured)
    if (this.features.iblHdrUrl) {
      await this.pipeline.initIBL(this.renderer, this.features.iblHdrUrl);
    }

    // Initialize texture manager (placeholder texture, default sampler)
    this.textures.init(this.renderer);

    // Initialize model manager
    this.models.init(this.renderer);

    canvas.setAttribute("tabindex", "0");
    canvas.focus();
    canvas.addEventListener("click", () => {
      canvas.focus();
    });
    this.input.bind(canvas);

    if (Application.shouldRun()) {
      Application.run();
    }

    return this;
  }

  setCanvasOptions(options?: CanvasOptions) {
    this.canvasController.setOptions(options);
    return this;
  }
  async run(canvas: HTMLCanvasElement, options?: CanvasOptions) {
    if (options) this.setCanvasOptions(options);
    await this.mount(canvas);
    this.start();
    return this;
  }
  async runOn(target: HTMLCanvasElement | string, options?: CanvasOptions) {
    const canvas =
      typeof target === "string" ? (document.querySelector(target) as HTMLCanvasElement) : target;
    return this.run(canvas, options);
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

  // ─── Runtime Lifecycle ──────────────────────────────────────────────────────
  // Deferred spawn/destroy queue, flushed between update and render.
  #pendingStarts = new Set<Script>();
  #lifecycleQueue: Array<
    | { kind: "spawn"; factory: () => GameEntity }
    | { kind: "destroy"; entity: GameEntity }
  > = [];

  spawn(factory: () => GameEntity): void {
    this.#lifecycleQueue.push({ kind: "spawn", factory });
  }

  destroy(entity: GameEntity): void {
    this.#lifecycleQueue.push({ kind: "destroy", entity });
  }

  #flushPendingStarts() {
    if (this.#pendingStarts.size === 0) return;
    const pending = this.#pendingStarts;
    this.#pendingStarts = new Set<Script>();
    for (const script of pending) {
      script._markStarted();
      script.onStart();
    }
  }

  #flushLifecycleQueue() {
    if (this.#lifecycleQueue.length === 0) return;
    const commands = this.#lifecycleQueue;
    this.#lifecycleQueue = [];

    for (const cmd of commands) {
      if (cmd.kind === "destroy") {
        this.#executeDestroy(cmd.entity);
      } else {
        this.#executeSpawn(cmd.factory);
      }
    }
  }

  #executeSpawn(factory: () => GameEntity) {
    const entity = factory();
    const stack: GameEntity[] = [entity];
    while (stack.length) {
      const current = stack.pop()!;
      for (const comp of current.getAllComponents()) {
        comp.setup();
      }
      for (const script of current.getComponents(Script)) {
        this.#pendingStarts.add(script);
      }
      stack.push(...current.children);
    }
  }

  #executeDestroy(entity: GameEntity) {
    if (!entity.scene) return;

    const stack: GameEntity[] = [entity];
    const allEntities: GameEntity[] = [];
    while (stack.length) {
      const current = stack.pop()!;
      allEntities.push(current);
      stack.push(...current.children);
    }

    for (const e of allEntities) {
      for (const script of e.getComponents(Script)) {
        script.onDestroy();
      }
    }

    for (const e of allEntities) {
      for (const comp of e.getAllComponents()) {
        comp.isActive = false;
      }
    }

    for (const e of allEntities) {
      const t = e.getComponent(Transform);
      if (t) this.#dirtyTransforms.delete(t);
      for (const script of e.getComponents(Script)) {
        this.#pendingStarts.delete(script);
      }
    }

    entity.remove();
  }

  /* Game Loop */
  static #activeInstances = new Map<number, Application>();
  static #instanceEvents: (() => any)[] = [];
  state: "new" | "ready" | "running" = "new";
  start() {
    Application.#activeInstances.set(this.#id, this);
    Application.#instanceEvents.push(() => {
      if (this.state === "new") {
        this.#setup();
      }
      this.state = "running";
    });
    if (Application.shouldRun()) {
      Application.run();
    }
  }
  stop() {
    Application.#activeInstances.delete(this.#id);
    Application.#instanceEvents.push(() => {
      if (this.state === "running") {
        this.state = "ready";
      }
    });
  }

  dispose() {
    this.stop();

    // Destroy all entities in all scenes
    for (const [, scene] of this.#sceneList) {
      for (const entityId of Object.keys(scene.rootEntities)) {
        this.#executeDestroy(scene.rootEntities[Number(entityId)]);
      }
    }
    this.#sceneList.clear();
    this.activeComponents.clear();
    this.activeScripts.clear();
    this.#pendingStarts.clear();
    this.#lifecycleQueue.length = 0;
    this.#dirtyTransforms.clear();

    this.input.unbind();

    Application.instanceList.delete(this.#id);
    Application.#activeInstances.delete(this.#id);
    this.state = "new";
  }
  static processInstanceEvents() {
    this.#instanceEvents.forEach((event) => {
      event();
    });
    this.#instanceEvents = [];
  }
  static shouldRun() {
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

    const loop: FrameRequestCallback = (t) => {
      this.processInstanceEvents();
      if (this.shouldQuit()) return;

      Time._updateDelta(t);
      this.forEachActive((app) => app.input.poll());

      // onStart for scripts pending from setup or previous-frame spawns
      this.forEachActive((app) => app.#flushPendingStarts());

      // Fixed timestep updates (physics, deterministic logic)
      while (Time._needsFixedUpdate()) {
        this.forEachActive((app) => app.#fixedUpdate());
      }

      // Variable-rate update (game logic, animation, particles)
      this.forEachActive((app) => app.#update());

      // Late update (camera follow, UI tracking — after all movement)
      this.forEachActive((app) => app.#lateUpdate());

      // Process deferred spawn/destroy
      this.forEachActive((app) => app.#flushLifecycleQueue());
      // Immediate onStart for just-spawned entities (render-ready this frame)
      this.forEachActive((app) => app.#flushPendingStarts());

      // Sync transforms + camera matrices (once per frame, after all movement)
      this.forEachActive((app) => app.#preRender());

      this.forEachActive((app) => app.#render());

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  #setup() {
    this.activeComponents.forEach((components) =>
      components.forEach((component) => component.setup())
    );
    this.forEachActiveScript((script) => {
      script.setup();
      this.#pendingStarts.add(script);
    });
  }

  #fixedUpdate() {
    this.forEachActiveScript((script) => script.fixedUpdate());
  }

  #update() {
    this.forEachActiveComponent(Animator, (anim) => anim.tick(Time.delta() / 1000));
    this.forEachActiveScript((script) => script.update());
    this.tweens.update(Time.delta());
    this.forEachActiveComponent(ParticleEmitter, (emitter) => emitter.tick(Time.delta()));
  }

  #lateUpdate() {
    this.forEachActiveScript((script) => script.lateUpdate());
  }

  #preRender() {
    this.#processDirtyTransforms();
    this.forEachActiveComponent(Camera, (camera) => camera.update());
  }

  #render() {
    FrameProfiler.beginFrame();
    this.pipeline.render(this);
    FrameProfiler.endFrame();
  }

  static forEach(callback: (instance: Application) => void) {
    Application.instanceList.forEach(callback);
  }
  static forEachActive(callback: (instance: Application) => void) {
    Application.#activeInstances.forEach(callback);
  }
}
