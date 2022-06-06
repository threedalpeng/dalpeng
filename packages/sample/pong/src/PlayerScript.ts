import { Input, Script, Time, Transform2D } from "dalpeng";
import { Vec2 } from "@dalpeng/math";

export default class PlayerScript extends Script {
  transform!: Transform2D;
  direction = new Vec2([0, -1]);
  upKey!: string;
  downKey!: string;
  speed = 0.5;

  setup() {}

  update() {
    if (Input.keyPressed(this.upKey)) {
      this.speed = 1;
    } else if (Input.keyPressed(this.downKey)) {
      this.speed = -1;
    } else {
      this.speed = 0;
    }
    const velocity = this.direction.muli(this.speed * Time.delta());
    this.transform.translate(velocity);
    if (this.transform.position.y < 72) {
      this.transform.position.y = 72;
    }
    if (this.transform.position.y > 648) {
      this.transform.position.y = 648;
    }
  }
}
