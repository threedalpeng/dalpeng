let _score = 0;
let _lives = 3;
let _gameOver = false;
let _cleared = false;

let _onScoreChange: ((score: number) => void) | null = null;
let _onLivesChange: ((lives: number) => void) | null = null;
let _onGameEnd: ((type: "gameover" | "clear") => void) | null = null;

export function onScoreChange(cb: (score: number) => void) { _onScoreChange = cb; }
export function onLivesChange(cb: (lives: number) => void) { _onLivesChange = cb; }
export function onGameEnd(cb: (type: "gameover" | "clear") => void) { _onGameEnd = cb; }

export function getScore() {
  return _score;
}

export function getLives() {
  return _lives;
}

export function isGameOver() {
  return _gameOver;
}

export function isCleared() {
  return _cleared;
}

export function addScore(points: number) {
  _score += points;
  console.log(`[Breakout] Score: ${_score}`);
  _onScoreChange?.(_score);
}

export function loseLife() {
  _lives--;
  console.log(`[Breakout] Lives: ${_lives}`);
  if (_lives <= 0) {
    _gameOver = true;
    console.log("[Breakout] GAME OVER");
    _onGameEnd?.("gameover");
  }
  _onLivesChange?.(_lives);
}

export function setCleared() {
  _cleared = true;
  console.log("[Breakout] STAGE CLEAR!");
  _onGameEnd?.("clear");
}

export function resetGame() {
  _score = 0;
  _lives = 3;
  _gameOver = false;
  _cleared = false;
}
