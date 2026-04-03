import { ref } from "dalpeng";

export const score = ref(0);
export const lives = ref(3);
export const gameOver = ref(false);
export const cleared = ref(false);
export const speedMultiplier = ref(1);
export const message = ref("");

export function addScore(points: number) {
  score.value += points;
}

export function addLife() {
  lives.value++;
}

export function loseLife() {
  lives.value--;
  if (lives.value <= 0) {
    gameOver.value = true;
    message.value = "GAME OVER";
  }
}

export function setCleared() {
  cleared.value = true;
  message.value = "STAGE CLEAR!";
}

export function setSpeedMultiplier(m: number) {
  speedMultiplier.value = Math.max(0.5, Math.min(2.0, m));
}

export function resetGame() {
  score.value = 0;
  lives.value = 3;
  gameOver.value = false;
  cleared.value = false;
  speedMultiplier.value = 1;
  message.value = "";
}
