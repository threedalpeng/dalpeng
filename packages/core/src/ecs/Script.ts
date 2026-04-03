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

  set isActive(active: boolean) {
    const wasActive = this.isActive;
    super.isActive = active;
    if (active) {
      this.currentApp.activeScripts.set(this.id, this);
    } else {
      this.currentApp.activeScripts.delete(this.id);
    }
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
