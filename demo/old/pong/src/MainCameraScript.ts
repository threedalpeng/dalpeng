import { Camera2D, Script } from "dalpeng";

export default class MainCameraScript extends Script {
  setup() {
    let camera = this.getComponent(Camera2D)!;
    camera.size = 360;
  }

  update() {}
}
