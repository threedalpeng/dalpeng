import Animator from "./animation/Animator";
import TweenManager from "./animation/TweenManager";
import type { AppNode } from "./AppNode";
import ModelManager from "./asset/ModelManager";
import SpriteAtlasManager from "./asset/SpriteAtlasManager";
import TextureManager from "./asset/TextureManager";
import AudioManager from "./audio/AudioManager";
import CanvasController from "./CanvasController";
import type { CanvasOptions } from "./CanvasOptions";
import { FrameProfiler } from "./debug";
import Component, { type ComponentConstructor } from "./ecs/Component";
import type GameEntity from "./ecs/GameEntity";
import Script from "./ecs/Script";
import Transform from "./ecs/Transform";
import type { RendererBackend } from "./gfx/RendererBackend";
import WebGL2Renderer from "./gfx/webgl2/WebGL2Renderer";
import Camera from "./graphics/Camera";
import ParticleEmitter from "./graphics/ParticleEmitter";
import Shader from "./graphics/Shader";
import View from "./graphics/View";
import CameraFollow2D from "./graphics2d/CameraFollow2D";
import SpriteAnimator from "./graphics2d/SpriteAnimator";
import InputManager from "./InputManager";
import type { RenderConfig } from "./RenderConfig";
import RenderPipeline from "./rendering/RenderPipeline";
import { isGameDescriptor, type LogicalDescriptor } from "./runtime/Descriptor";
import type { EntityInstance } from "./runtime/Instance";
import { LayerRegistry } from "./runtime/Layer";
import { type Materializer } from "./runtime/Materializer";
import { ref, type ReadonlyRef } from "./runtime/reactive";
import type { UIRenderer } from "./runtime/UIRenderer";
import type Scene from "./Scene";
import Time from "./Time";
import { isNil } from "./utils/basic";

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
          "before mounting any UI."
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
          "Call this once per Application instance."
      );
    }
    this.#materializer = m;
  }

  #disposeCallbacks = new Set<() => void>();
  onDispose(cb: () => void): void {
    this.#disposeCallbacks.add(cb);
  }

  #frameHooks: Record<"beforeUpdate" | "beforeRender" | "afterRender", Set<(dt: number) => void>> =
    {
      beforeUpdate: new Set(),
      beforeRender: new Set(),
      afterRender: new Set(),
    };

  onBeforeUpdate(cb: (dt: number) => void): () => void {
    this.#frameHooks.beforeUpdate.add(cb);
    return () => void this.#frameHooks.beforeUpdate.delete(cb);
  }
  onBeforeRender(cb: (dt: number) => void): () => void {
    this.#frameHooks.beforeRender.add(cb);
    return () => void this.#frameHooks.beforeRender.delete(cb);
  }
  onAfterRender(cb: (dt: number) => void): () => void {
    this.#frameHooks.afterRender.add(cb);
    return () => void this.#frameHooks.afterRender.delete(cb);
  }

  #fireFrameHook(phase: "beforeUpdate" | "beforeRender" | "afterRender", dt: number): void {
    for (const cb of this.#frameHooks[phase]) {
      try {
        cb(dt);
      } catch (err) {
        console.error(`Application.${phase} hook threw`, err);
      }
    }
  }

  // keyed by constructor reference — class-name strings are minification-unsafe
  activeComponents = new Map<ComponentConstructor<Component>, Set<Component>>();
  #dirtyTransforms = new Set<Transform>();

  _registerActive<T extends Component>(type: ComponentConstructor<T>, component: T): void {
    const key = type as ComponentConstructor<Component>;
    let set = this.activeComponents.get(key);
    if (!set) {
      set = new Set();
      this.activeComponents.set(key, set);
    }
    set.add(component);
  }

  _unregisterActive<T extends Component>(type: ComponentConstructor<T>, component: T): void {
    const set = this.activeComponents.get(type as ComponentConstructor<Component>);
    set?.delete(component);
  }

  forEachActiveComponent<Type extends Component>(
    type: ComponentConstructor<Type>,
    callback: (component: Type) => void
  ) {
    const components = this.activeComponents.get(type as ComponentConstructor<Component>) as
      | Set<Type>
      | undefined;
    if (components === undefined) return;
    for (const component of components) callback(component);
  }

  query<T extends readonly ComponentConstructor<Component>[]>(
    types: [...T]
  ): Iterable<readonly [GameEntity, ...{ [K in keyof T]: InstanceType<T[K]> }]> {
    const activeComponents = this.activeComponents;
    return {
      *[Symbol.iterator]() {
        if (types.length === 0) return;
        let pivotIdx = 0;
        let pivotSize = Infinity;
        for (let i = 0; i < types.length; i++) {
          const set = activeComponents.get(types[i] as ComponentConstructor<Component>);
          const size = set?.size ?? 0;
          if (size === 0) return;
          if (size < pivotSize) {
            pivotIdx = i;
            pivotSize = size;
          }
        }
        const pivotSet = activeComponents.get(types[pivotIdx] as ComponentConstructor<Component>)!;
        for (const pivotComp of pivotSet) {
          const entity = pivotComp.gameEntity;
          const tuple: Component[] = new Array(types.length);
          let ok = true;
          for (let i = 0; i < types.length; i++) {
            if (i === pivotIdx) {
              tuple[i] = pivotComp;
              continue;
            }
            const c = entity.getComponent(types[i]);
            if (!c) {
              ok = false;
              break;
            }
            tuple[i] = c;
          }
          if (ok) {
            yield [entity, ...tuple] as unknown as readonly [
              GameEntity,
              ...{ [K in keyof T]: InstanceType<T[K]> },
            ];
          }
        }
      },
    };
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

  forEachActiveScript(callback: (component: Script) => void) {
    const scripts = this.activeComponents.get(Script as ComponentConstructor<Component>) as
      | Set<Script>
      | undefined;
    if (!scripts) return;
    for (const script of scripts) callback(script);
  }

  renderer: RendererBackend = new WebGL2Renderer();
  features: RenderConfig = {
    postToneMapping: false,
  };
  watchFeature?: (key: string, cb: (val: unknown, old: unknown) => void) => () => void;

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
  spawn(node: AppNode, parent?: GameEntity): void;
  spawn(arg: (() => GameEntity) | AppNode, parent?: GameEntity): void {
    if (typeof arg === "function") {
      this.#lifecycleQueue.push({ kind: "spawn-entity", factory: arg });
    } else {
      if (!this.#materializer) {
        throw new Error(
          "Application.spawn(descriptor): no Materializer registered. " +
            "Ensure `runApp` has been called before spawning descriptors."
        );
      }
      this.#lifecycleQueue.push({
        kind: "spawn-descriptor",
        descriptor: arg as LogicalDescriptor,
        parent,
      });
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
    const parentArg: EntityInstance | Scene = parent?._gameInstance ?? scene;
    const instance = this.#materializer.materialize(descriptor, parentArg);
    if (isGameDescriptor(descriptor)) {
      this.#setupEntitySubtree((instance as EntityInstance).entity);
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
    // Push entity context so dalpeng hooks that expect setup scope
    // (`spawn()`, `useEntity()`, etc.) also work inside onDestroy callbacks.
    const pop = this.#materializer?.pushEntityContext(entity);
    try {
      for (const script of entity.getComponents(Script)) {
        script.onDestroy();
      }
    } finally {
      pop?.();
    }
  }

  #executeDestroy(entity: GameEntity) {
    if (!entity.scene) return;

    const gameInstance = entity._gameInstance;
    if (gameInstance && this.#materializer) {
      this.#materializer.destroyCascade(gameInstance, (e) => this.#runOnDestroyScripts(e));
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
  static #instanceEvents: (() => void)[] = [];
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
          "Ensure `runApp` has been called before switching scenes."
      );
    }
    const pending = newScene._pendingRootDescriptors;
    if (pending.length > 0) {
      newScene._pendingRootDescriptors = [];
      this.#materializer.materializeRoots(newScene, pending as unknown as LogicalDescriptor[]);
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
    this.#pendingStarts.clear();
    this.#lifecycleQueue.length = 0;
    this.#dirtyTransforms.clear();

    this.pipeline.dispose();
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

      const dt = Time.delta();
      this.forEachActive((app) => app.#fireFrameHook("beforeUpdate", dt));
      this.forEachActive((app) => app.#update());
      this.forEachActive((app) => app.#lateUpdate());

      this.forEachActive((app) => app.#flushLifecycleQueue());
      this.forEachActive((app) => app.#flushPendingStarts());

      this.forEachActive((app) => app.#preRender());
      this.forEachActive((app) => app.#fireFrameHook("beforeRender", dt));
      this.forEachActive((app) => app.#render());
      this.forEachActive((app) => app.#fireFrameHook("afterRender", dt));

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

  // `_test*` prefix (not `#private`) so testScene() can reach them without
  // reflection while still signalling "not public API".
  _testSetup(): void {
    if (this.state === "new") {
      Time._setFixedUpdateRate(60);
      Time._setup();
      this.#setup();
      this.state = "running";
    }
  }

  _testStep(dtMs: number, opts?: { skipRender?: boolean }): void {
    Time._updateDelta(Time.current() + dtMs);
    this.input.poll();
    this.#flushPendingStarts();
    while (Time._needsFixedUpdate()) this.#fixedUpdate();
    const dt = Time.delta();
    this.#fireFrameHook("beforeUpdate", dt);
    this.#update();
    this.#lateUpdate();
    this.#flushLifecycleQueue();
    this.#flushPendingStarts();
    this.#preRender();
    this.#fireFrameHook("beforeRender", dt);
    if (!opts?.skipRender) this.#render();
    this.#fireFrameHook("afterRender", dt);
  }
}
