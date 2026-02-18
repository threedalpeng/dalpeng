import CanvasController from "./CanvasController";
import type { CanvasOptions } from "./CanvasOptions";
import Component, { type ComponentConstructor } from "./component/Component";
import type GameEntity from "./entity/GameEntity";
import type { RendererBackend } from "./gfx/RendererBackend";
import type GfxBuffer from "./gfx/Buffer";
import type GfxVertexArray from "./gfx/VertexArray";
import WebGL2Renderer from "./gfx/webgl2/WebGL2Renderer";
import Camera from "./graphics/Camera";
import Light from "./graphics/Light";
import MeshRenderer from "./graphics/MeshRenderer";
import ParticleEmitter from "./graphics/ParticleEmitter";
import Shader from "./graphics/Shader";
import DirectionalShadowSystem from "./graphics/shadows/DirectionalShadow";
import SpriteRenderer from "./graphics/SpriteRenderer";
import View from "./graphics/View";
import Input from "./Input";
import PostProcessing from "./PostProcessing";
import TweenManager from "./TweenManager";
import AudioManager from "./AudioManager";
import type { RenderConfig } from "./RenderConfig";
import type Scene from "./Scene";
import Script from "./Script";
import gbuffrag from "./shaders/gbuf.frag?raw";
import gbufvert from "./shaders/gbuf.vert?raw";
import mainfrag from "./shaders/main.frag?raw";
import mainvert from "./shaders/main.vert?raw";
import Time from "./Time";
import Transform from "./Transform";
import { isNil } from "./utils/basic";
import { dummyQuadForLight } from "./utils/mesh";

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
    const components = this.activeComponents.get(type.name) as Set<Type> | undefined;
    if (components === undefined) {
      return;
    }
    const snapshot = Array.from(components);
    for (const component of snapshot) {
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
    const snapshot = Array.from(this.activeScripts.values());
    for (const script of snapshot) {
      callback(script);
    }
  }

  // ─── Graphic Context ───────────────────────────────────────────────────────
  // Graphics context (backend-specific)
  renderer: RendererBackend = new WebGL2Renderer();
  features: RenderConfig = {
    postToneMapping: false,
  };

  private _shadowSys: DirectionalShadowSystem | null = null;
  canvasController = new CanvasController();
  postProcessing = new PostProcessing();
  tweens = new TweenManager();
  audio = new AudioManager();
  #particleQuadVao: GfxVertexArray | null = null;
  #particleQuadVbo: GfxBuffer | null = null;
  #particleInstanceVbo: GfxBuffer | null = null;

  useRenderer(renderer: RendererBackend) {
    this.renderer = renderer;
    return this;
  }

  get isContextReady() {
    return this.renderer.isReady();
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
    this._shadowSys = new DirectionalShadowSystem();

    // Bind CanvasController to renderer for ongoing resize events
    this.canvasController.mount(canvas, this.renderer);

    this.registerShader(this.shader.geometry);
    this.registerShader(this.shader.lighting);
    this.registerShader(this.shader.post);
    this.registerShader(this.shader.shadow);
    this.registerShader(this.shader.bloomBright);
    this.registerShader(this.shader.bloomBlur);
    this.registerShader(this.shader.particle);

    await Promise.allSettled([
      this.shader.geometry.loadFrom(gbufvert, gbuffrag),
      this.shader.lighting.loadFrom(mainvert, mainfrag),
      this.shader.post.loadFrom(mainvert, (await import("./shaders/post.frag?raw")).default),
      this.shader.shadow.loadFrom(
        (await import("./shaders/shadow.vert?raw")).default,
        (await import("./shaders/shadow.frag?raw")).default
      ),
    ]);

    // Load bloom & particle shaders
    await Promise.allSettled([
      this.shader.bloomBright.loadFrom(mainvert, (await import("./shaders/bloom_bright.frag?raw")).default),
      this.shader.bloomBlur.loadFrom(mainvert, (await import("./shaders/bloom_blur.frag?raw")).default),
      this.shader.particle.loadFrom(
        (await import("./shaders/particle.vert?raw")).default,
        (await import("./shaders/particle.frag?raw")).default
      ),
    ]);

    // Set G-Buffer sampler uniforms once (texture units are constant)
    this.shader.lighting.use();
    this.shader.lighting.setUniform1i("gPositionMetallic", 0);
    this.shader.lighting.setUniform1i("gNormalRoughness", 1);
    this.shader.lighting.setUniform1i("gAlbedo", 2);
    this.shader.lighting.setUniform1i("gEmissive", 3);

    // Create shared fullscreen quad for lighting pass
    const lightingPosLoc = this.shader.lighting.getAttribLocation("aPosition");
    this.lightingQuad = this.renderer.createVertexArray();
    const lightingQuadBuf = this.renderer.createBuffer("vertex");
    lightingQuadBuf.update(dummyQuadForLight());
    this.lightingQuad.setVertexBuffer(lightingPosLoc, lightingQuadBuf, 3);

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

  setCanvasOptions(options?: CanvasOptions) {
    this.canvasController.setOptions(options);
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

  /* Resource Management */
  registerShader(shader: Shader) {
    shader.bindBackend(this.renderer);
    return this;
  }
  shader = {
    geometry: new Shader(),
    lighting: new Shader(),
    post: new Shader(),
    shadow: new Shader(),
    bloomBright: new Shader(),
    bloomBlur: new Shader(),
    particle: new Shader(),
  };
  lightingQuad!: GfxVertexArray;

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
    const pending = Array.from(this.#pendingStarts);
    this.#pendingStarts.clear();
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

      await this.forEachActive((app) => app.#flushPendingStarts());

      while (Time._needsFixedUpdate()) {
        await this.forEachActive((app) => app.#fixedUpdate());
      }
      await this.forEachActive((app) => app.#update());

      await this.forEachActive((app) => app.#flushLifecycleQueue());

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
    this.tweens.update(Time.delta());
  }

  async #render() {
    const { width, height } = this.renderer.getDrawableSize();
    this.renderer.setViewport(0, 0, width, height);

    // Directional shadow system
    await this._shadowSys?.update(this);

    this.shader.geometry.use();
    this.renderer.beginGeometryPass();
    if (this.features.debugGLVerbose) {
      this.renderer.debugDumpState?.("after beginGeometryPass");
      this.renderer.debugCheckError?.("after beginGeometryPass");
    }

    await this.forEachActiveComponent(Camera, (camera) => {
      camera.renderCameraToGeometry();
    });
    await this.forEachActiveComponent(MeshRenderer, (renderer) => {
      renderer.render();
    });
    await this.forEachActiveComponent(SpriteRenderer, (renderer) => {
      renderer.render();
    });
    this.renderer.endGeometryPass();
    if (this.features.debugGLVerbose) this.renderer.debugCheckError?.("after endGeometryPass");

    this.shader.lighting.use();
    this.renderer.beginLightingPass({ postToneMapping: this.features.postToneMapping });
    if (this.features.debugGLVerbose) {
      this.renderer.debugDumpState?.("after beginLightingPass");
      this.renderer.debugCheckError?.("after beginLightingPass");
    }

    // If post-processing is enabled, keep lighting buffer in linear (no gamma here)
    this.shader.lighting.setUniform1i("uApplyGamma", this.features.postToneMapping ? 0 : 1);
    this.shader.lighting.setUniform1f("uGamma", this.features.toneGamma ?? 2.2);

    this.shader.lighting.setUniform1i("uDebugMode", this.features.debugLightingView ?? 0);
    this.shader.lighting.setUniform1i("uShadowDebug", this.features.shadowDebug ?? 0);
    await this.forEachActiveComponent(Camera, (camera) => {
      camera.renderCameraToLighting();
    });
    await this.forEachActiveComponent(Light, (light) => {
      this._shadowSys?.bindForLight(this, light);
      light.renderLight();
    });
    if (this.features.debugGLVerbose) {
      this.renderer.debugDumpState?.("after lights");
      this.renderer.debugCheckError?.("after lights");
    }

    // End lighting pass before any post logic and check errors
    this.renderer.endLightingPass();
    if (this.features.debugGLVerbose) this.renderer.debugCheckError?.("after endLightingPass");

    // Particle forward pass (after lighting, before post)
    if (this.renderer.beginParticlePass) {
      let hasParticles = false;
      await this.forEachActiveComponent(ParticleEmitter, (emitter) => {
        if (emitter.aliveCount > 0) hasParticles = true;
      });
      if (hasParticles) {
        this.renderer.beginParticlePass();
        const particleShader = this.shader.particle;
        particleShader.use();
        await this.forEachActiveComponent(Camera, (camera) => {
          particleShader.setUniformMat4("uView", camera.viewMatrix);
          particleShader.setUniformMat4("uProjection", camera.projectionMatrix);
        });

        // Lazy-init shared particle quad VAO
        if (!this.#particleQuadVao) {
          this.#particleQuadVao = this.renderer.createVertexArray();
          this.#particleQuadVbo = this.renderer.createBuffer("vertex");
          this.#particleQuadVbo.update(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
          const posLoc = particleShader.getAttribLocation("aPosition");
          this.#particleQuadVao.setVertexBuffer(posLoc, this.#particleQuadVbo!, 2);
          this.#particleInstanceVbo = this.renderer.createBuffer("vertex");
        }

        const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

        await this.forEachActiveComponent(ParticleEmitter, (emitter) => {
          const count = emitter.aliveCount;
          if (count === 0) return;

          // Upload packed instance data
          this.#particleInstanceVbo!.update(emitter.instanceData.subarray(0, count * 8));

          // Bind per-instance attributes with divisor=1
          const posSizeLoc = particleShader.getAttribLocation("aInstancePosSize");
          const colorLoc = particleShader.getAttribLocation("aInstanceColor");
          this.#particleQuadVao!.setVertexBufferInstanced?.(
            posSizeLoc, this.#particleInstanceVbo!, 4, 1, { stride: 32, offset: 0 }
          );
          this.#particleQuadVao!.setVertexBufferInstanced?.(
            colorLoc, this.#particleInstanceVbo!, 4, 1, { stride: 32, offset: 16 }
          );

          particleShader.setUniformMat4("uModel", identity);

          this.renderer.drawArraysInstanced?.(this.#particleQuadVao!, {
            mode: "triangle-strip",
            count: 4,
            instanceCount: count,
          });
        });

        this.renderer.endParticlePass?.();
      }
    }

    // Allocate bloom resources lazily when bloom is enabled
    if (this.features.bloom && this.renderer.allocateBloomResources) {
      if (!this.renderer.hasBloomTexture?.()) {
        this.renderer.allocateBloomResources();
      }
    }

    // Execute post-processing (tone mapping + bloom + gamma) to the default framebuffer
    if (this.features.postToneMapping) {
      this.postProcessing.render(this.renderer, {
        post: this.shader.post,
        bloomBright: this.shader.bloomBright,
        bloomBlur: this.shader.bloomBlur,
      }, this.features);
    }
  }

  static async forEach(callback: (instance: Application) => void) {
    Application.instanceList.forEach(callback);
  }
  static async forEachActive(callback: (instance: Application) => void) {
    Application.#activeInstances.forEach(callback);
  }
}
