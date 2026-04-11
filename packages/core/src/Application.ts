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
import SpriteAnimator from "./graphics2d/SpriteAnimator";
import CameraFollow2D from "./graphics2d/CameraFollow2D";
import AudioManager from "./audio/AudioManager";
import TextureManager from "./asset/TextureManager";
import ModelManager from "./asset/ModelManager";
import SpriteAtlasManager from "./asset/SpriteAtlasManager";
import { isNil } from "./utils/basic";
import { FrameProfiler } from "./debug";
import { ref, type ReadonlyRef } from "./runtime/reactive";
import { LayerRegistry } from "./runtime/Layer";
import type { UIRenderer } from "./runtime/UIRenderer";
import { isGameDescriptor, type LogicalDescriptor } from "./runtime/Descriptor";
import { type Materializer } from "./runtime/Materializer";
import type { GameInstance } from "./runtime/Instance";

export interface FrameStatsSummary {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
}

export default class Application {
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

  #sceneList = new Map<number, Scene>();
  get scenes(): Iterable<Scene> {
    return this.#sceneList.values();
  }
  #activeScene = ref<Scene | null>(null);
  get activeScene(): ReadonlyRef<Scene | null> {
    return this.#activeScene;
  }
  addScene(scene: Scene) {
    if (scene.app !== undefined) {
      scene.app.removeScene(scene);
    }
    scene.app = this;
    this.#sceneList.set(scene.id, scene);
    this.#activeScene.value = scene;
    return this;
  }
  removeScene(scene: Scene) {
    this.#sceneList.delete(scene.id);
    if (this.#activeScene.value === scene) {
      const remaining = Array.from(this.#sceneList.values());
      this.#activeScene.value = remaining[remaining.length - 1] ?? null;
    }
    return this;
  }

  #frameStats = ref<FrameStatsSummary>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
  });
  get frameStats(): ReadonlyRef<FrameStatsSummary> {
    return this.#frameStats;
  }
  _setFrameStats(next: FrameStatsSummary): void {
    this.#frameStats.value = next;
  }

  layers = new LayerRegistry();

  #uiRenderer: UIRenderer | null = null;
  registerUIRenderer(renderer: UIRenderer): void {
    if (this.#uiRenderer) {
      throw new Error(
        "Application.registerUIRenderer: a UI renderer is already registered. " +
          "Each Application accepts exactly one renderer; call this once " +
          "before mounting any UI.",
      );
    }
    this.#uiRenderer = renderer;
  }
  getUIRenderer(): UIRenderer | null {
    return this.#uiRenderer;
  }

  #materializer: Materializer | null = null;
  registerMaterializer(m: Materializer): void {
    if (this.#materializer) {
      throw new Error(
        "Application.registerMaterializer: a Materializer is already registered. " +
          "Call this once per Application instance.",
      );
    }
    this.#materializer = m;
  }

  #disposeCallbacks = new Set<() => void>();
  onDispose(cb: () => void): void {
    this.#disposeCallbacks.add(cb);
  }

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

  activeScripts = new Map<number, Script>();
  forEachActiveScript(callback: (component: Script) => void) {
    for (const script of this.activeScripts.values()) {
      callback(script);
    }
  }

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
  atlases = new SpriteAtlasManager();

  get shader() {
    return this.pipeline.shader;
  }
  get lightingQuad() {
    return this.pipeline.lightingQuad;
  }

  useRenderer(renderer: RendererBackend) {
    this.renderer = renderer;
    return this;
  }

  configure(features: Partial<RenderConfig>): this {
    Object.assign(this.features, features);
    return this;
  }

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

  async mount(canvas: HTMLCanvasElement) {
    if (isNil(canvas)) {
      console.error("Canvas Not Mounted");
      return this;
    }

    this.canvasController.applyInitialSize(canvas);
    await this.renderer.init(canvas);
    this.canvasController.mount(canvas, this.renderer);
    await this.pipeline.init(this.renderer);

    if (this.features.iblHdrUrl) {
      await this.pipeline.initIBL(this.renderer, this.features.iblHdrUrl);
    }

    this.textures.init(this.renderer);
    this.models.init(this.renderer);
    this.atlases.init(this.renderer, this.textures);

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

  #pendingStarts = new Set<Script>();
  #lifecycleQueue: Array<
    | { kind: "spawn-entity"; factory: () => GameEntity }
    | { kind: "spawn-descriptor"; descriptor: LogicalDescriptor; parent?: GameEntity }
    | { kind: "destroy"; entity: GameEntity }
  > = [];

  spawn(factory: () => GameEntity): void;
  spawn(descriptor: LogicalDescriptor, parent?: GameEntity): void;
  spawn(arg: (() => GameEntity) | LogicalDescriptor, parent?: GameEntity): void {
    if (typeof arg === "function") {
      this.#lifecycleQueue.push({ kind: "spawn-entity", factory: arg });
    } else {
      if (!this.#materializer) {
        throw new Error(
          "Application.spawn(descriptor): no Materializer registered. " +
            "Ensure `runApp` has been called before spawning descriptors.",
        );
      }
      this.#lifecycleQueue.push({ kind: "spawn-descriptor", descriptor: arg, parent });
    }
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
      } else if (cmd.kind === "spawn-entity") {
        this.#executeSpawnEntity(cmd.factory);
      } else {
        this.#executeSpawnDescriptor(cmd.descriptor, cmd.parent);
      }
    }
  }

  #executeSpawnEntity(factory: () => GameEntity) {
    const entity = factory();
    this.#setupEntitySubtree(entity);
  }

  #executeSpawnDescriptor(descriptor: LogicalDescriptor, parent?: GameEntity) {
    if (!this.#materializer) return;
    const scene = parent?.scene ?? this.#activeScene.value;
    if (!scene) return;
    const parentArg: GameInstance | Scene = parent?._gameInstance ?? scene;
    const instance = this.#materializer.materialize(descriptor, parentArg);
    if (isGameDescriptor(descriptor)) {
      this.#setupEntitySubtree((instance as GameInstance).entity);
    }
  }

  #setupEntitySubtree(entity: GameEntity) {
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

  #runOnDestroyScripts(entity: GameEntity) {
    for (const script of entity.getComponents(Script)) {
      script.onDestroy();
    }
  }

  #executeDestroy(entity: GameEntity) {
    if (!entity.scene) return;

    const gameInstance = entity._gameInstance;
    if (gameInstance && this.#materializer) {
      this.#materializer.destroyCascade(gameInstance, (e) =>
        this.#runOnDestroyScripts(e),
      );
    } else {
      const stack: GameEntity[] = [entity];
      const allEntities: GameEntity[] = [];
      while (stack.length) {
        const current = stack.pop()!;
        allEntities.push(current);
        stack.push(...current.children);
      }
      for (const e of allEntities) {
        this.#runOnDestroyScripts(e);
      }
    }

    const stack: GameEntity[] = [entity];
    const allEntities: GameEntity[] = [];
    while (stack.length) {
      const current = stack.pop()!;
      allEntities.push(current);
      stack.push(...current.children);
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

  switchScene(oldScene: Scene, newSceneFactory: () => Scene): void {
    for (const entityId of Object.keys(oldScene.rootEntities)) {
      this.#executeDestroy(oldScene.rootEntities[Number(entityId)]);
    }
    this.#flushLifecycleQueue();
    this.removeScene(oldScene);

    const newScene = newSceneFactory();
    if (newScene.app !== this) {
      this.addScene(newScene);
    }

    if (!this.#materializer) {
      throw new Error(
        "Application.switchScene: no Materializer registered. " +
          "Ensure `runApp` has been called before switching scenes.",
      );
    }
    const pending = newScene._pendingRootDescriptors;
    if (pending.length > 0) {
      newScene._pendingRootDescriptors = [];
      this.#materializer.materializeRoots(newScene, pending);
    }

    for (const entityId of Object.keys(newScene.rootEntities)) {
      const stack: GameEntity[] = [newScene.rootEntities[Number(entityId)]];
      while (stack.length) {
        const current = stack.pop()!;
        for (const script of current.getComponents(Script)) {
          this.#pendingStarts.add(script);
        }
        stack.push(...current.children);
      }
    }
  }

  dispose() {
    this.stop();

    for (const cb of this.#disposeCallbacks) {
      try {
        cb();
      } catch (err) {
        console.error("Application.dispose: onDispose callback threw", err);
      }
    }
    this.#disposeCallbacks.clear();

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

      this.forEachActive((app) => app.#flushPendingStarts());

      while (Time._needsFixedUpdate()) {
        this.forEachActive((app) => app.#fixedUpdate());
      }

      this.forEachActive((app) => app.#update());
      this.forEachActive((app) => app.#lateUpdate());

      this.forEachActive((app) => app.#flushLifecycleQueue());
      this.forEachActive((app) => app.#flushPendingStarts());

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
    this.forEachActiveComponent(SpriteAnimator, (anim) => anim.tick(Time.delta() / 1000));
    this.forEachActiveScript((script) => script.update());
    this.tweens.update(Time.delta());
    this.forEachActiveComponent(ParticleEmitter, (emitter) => emitter.tick(Time.delta()));
  }

  #lateUpdate() {
    this.forEachActiveScript((script) => script.lateUpdate());
    this.forEachActiveComponent(CameraFollow2D, (cf) => cf.lateUpdate());
  }

  #preRender() {
    this.#processDirtyTransforms();
    this.forEachActiveComponent(Camera, (camera) => camera.update());
  }

  #render() {
    FrameProfiler.beginFrame();
    this.pipeline.render(this);
    FrameProfiler.endFrame();
    // ~10 Hz update so DevTools subscribers don't pay a ref write every frame.
    if (FrameProfiler.enabled) {
      const now = performance.now();
      if (now - this.#lastFrameStatsPush >= 100) {
        this.#lastFrameStatsPush = now;
        const last = FrameProfiler.getLastFrame();
        this._setFrameStats({
          fps: FrameProfiler.getAverageFPS(),
          frameTime: FrameProfiler.getAverageFrameTime(),
          drawCalls: last?.totalDrawCalls ?? 0,
          triangles: last?.totalTriangles ?? 0,
        });
      }
    }
  }
  #lastFrameStatsPush = 0;

  static forEach(callback: (instance: Application) => void) {
    Application.instanceList.forEach(callback);
  }
  static forEachActive(callback: (instance: Application) => void) {
    Application.#activeInstances.forEach(callback);
  }

}
