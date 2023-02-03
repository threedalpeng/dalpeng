import Component from "./component/Component";

export default class Script extends Component {
  set isActive(active: boolean) {
    super.isActive = active;
    if (active) {
      this.currentApp.activeScripts.set(this.id, this);
    } else {
      this.currentApp.activeScripts.delete(this.id);
    }
  }

  fixedUpdate() {
    this.emit("fixedUpdate");
  }
  update() {
    this.emit("update");
  }
}
