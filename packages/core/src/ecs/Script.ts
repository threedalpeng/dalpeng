import Component from "./Component";

export default class Script extends Component {
  #hasStarted = false;
  get hasStarted() {
    return this.#hasStarted;
  }
  /** @internal */
  _markStarted() {
    this.#hasStarted = true;
  }

  // Explicit getter: TS/JS shadows parent accessors when subclass defines
  // only a setter, so the inherited getter would return undefined without this.
  override get isActive(): boolean {
    return super.isActive;
  }
  override set isActive(active: boolean) {
    const wasActive = super.isActive;
    super.isActive = active;
    if (wasActive !== active) {
      if (active) this.onEnable();
      else this.onDisable();
    }
  }

  onStart(): void {
    this.emit("start");
  }
  onDestroy(): void {
    this.emit("destroy");
  }
  onEnable(): void {
    this.emit("enable");
  }
  onDisable(): void {
    this.emit("disable");
  }

  fixedUpdate() {
    this.emit("fixedUpdate");
  }
  update() {
    this.emit("update");
  }
  lateUpdate() {
    this.emit("lateUpdate");
  }
}
