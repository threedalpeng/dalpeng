import { Input, Script, Time, Transform2D } from "dalpeng";
import { Vec2 } from "@dalpeng/math";

export default class BallScript extends Script {
  transform!: Transform2D;
  direction = new Vec2();
  player1!: Transform2D;
  player2!: Transform2D;
  speed = 0.5;

  player1ScoreDom!: HTMLHeadingElement;
  player2ScoreDom!: HTMLHeadingElement;
  player1Score = 0;
  player2Score = 0;

  state: "stop" | "start" = "stop";

  timePassed = 0;
  numUpdated = 0;

  setup() {
    const randomAngle = Math.random() * 2 * Math.PI;
    this.direction = new Vec2([Math.cos(randomAngle), Math.sin(randomAngle)]);
    this.player1ScoreDom = document.querySelector("#player1Score")!;
    this.player2ScoreDom = document.querySelector("#player2Score")!;
  }

  fixedUpdate() {
    switch (this.state) {
      case "start":
        let velocity = this.direction.muli(this.speed * Time.fixedDelta());

        const position = this.transform.position;
        const nextPos = position.add(velocity);
        if (nextPos.y <= 10 || 710 <= nextPos.y) {
          this.direction.y = -this.direction.y;
        }
        let angle;
        if ((angle = this.isCollidedWith(nextPos, this.player1)) !== null) {
          angle = -angle * Math.PI * 0.5;
          this.direction = new Vec2([Math.cos(angle), Math.sin(angle)]);
        } else if (
          (angle = this.isCollidedWith(nextPos, this.player2)) !== null
        ) {
          angle = (1 + angle * 0.5) * Math.PI;
          this.direction = new Vec2([Math.cos(angle), Math.sin(angle)]);
        }

        if (position.x < 0 || 1280 < position.x) {
          if (position.x < 0) {
            this.player2Score++;
            this.player2ScoreDom.textContent = this.player2Score.toString();
          } else {
            this.player1Score++;
            this.player1ScoreDom.textContent = this.player1Score.toString();
          }
          this.direction = new Vec2([0, 0]);
          this.transform.position = new Vec2([640, 360]);
          this.state = "stop";
          this.speed = 0.5;
          return;
        }

        velocity = this.direction.muli(this.speed * Time.fixedDelta());
        this.transform.translate(velocity);
        this.speed += 0.00001 * Time.fixedDelta();

        break;
    }
  }

  update() {
    this.timePassed += Time.delta();
    this.numUpdated++;
    if (this.numUpdated === 10) {
      //console.log("Fps:", this.timePassed / this.numUpdated);
      this.timePassed = 0;
      this.numUpdated = 0;
    }
    switch (this.state) {
      case "start":
        break;
      case "stop":
        if (Input.keyDown("Space")) {
          this.state = "start";
          this.shoot();
        }
        break;
    }
  }

  isCollidedWith(nextPos: Vec2, player: Transform2D) {
    const gapY = player.position.y - nextPos.y;
    const gapX = player.position.x - nextPos.x;
    if (-77 <= gapY && gapY <= 77 && -15 <= gapX && gapX < 15) {
      return gapY / 100;
    }
    return null;
  }

  shoot() {
    let randomAngle = Math.random();
    randomAngle = randomAngle > 0.5 ? randomAngle + 0.25 : randomAngle - 0.25;
    randomAngle = randomAngle * Math.PI;
    this.direction = new Vec2([Math.cos(randomAngle), Math.sin(randomAngle)]);
  }
}
