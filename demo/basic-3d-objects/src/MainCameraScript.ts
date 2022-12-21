import { Camera, Input, Script } from "dalpeng";

export default class MainCameraScript extends Script {
  camera!: Camera;

  setup(): void {
    this.camera = this.getComponent(Camera)!;
    this.camera.size = 10;
  }

  update(): void {
    if (Input.keyDown("KeyA")) {
      this.camera.isOrthographic = !this.camera.isOrthographic;
    } else if (Input.keyDown("KeyI")) {
      this.camera.size += 1;
      console.log(this.camera.size);
    } else if (Input.keyDown("KeyK")) {
      this.camera.size -= 1;
      console.log(this.camera.size);
    }
  }
}
