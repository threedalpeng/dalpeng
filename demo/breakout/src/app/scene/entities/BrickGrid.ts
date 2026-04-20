import { vec3 } from "@dalpeng/math";
import { defineEntity, withName } from "dalpeng";
import { createBrick } from "./Brick";

const COLS = 8;
const ROWS = 4;
const BRICK_W = 1.9;
const BRICK_H = 0.7;
const START_X = -((COLS - 1) * BRICK_W) / 2;
const START_Y = 4;

const ROW_COLORS = [
  vec3(0.9, 0.2, 0.2), // red
  vec3(0.9, 0.5, 0.1), // orange
  vec3(0.9, 0.8, 0.1), // yellow
  vec3(0.2, 0.8, 0.3), // green
];

export default defineEntity(() => {
  withName("BrickGrid");

  const bricks = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = START_X + col * BRICK_W;
      const y = START_Y - row * BRICK_H;
      const color = ROW_COLORS[row];
      const hp = row < 2 ? 2 : 1;
      // createBrick returns a factory (same shape as `export default defineEntity(...)`);
      // invoke it to get the descriptor before handing it to the scene tree.
      bricks.push(createBrick(x, y, color, hp)());
    }
  }
  return bricks;
});
