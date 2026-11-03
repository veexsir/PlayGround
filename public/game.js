const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const speedEl = document.getElementById('speed');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

const road = {
  x: canvas.width / 2 - 180,
  width: 360,
  laneWidth: 120,
  scroll: 0,
  speed: 280,
};

const player = {
  x: canvas.width / 2,
  y: canvas.height - 110,
  width: 54,
  height: 90,
  color: '#8ae1ff',
  lane: 1,
  tilt: 0,
  boost: 1,
};

const stars = Array.from({ length: 90 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() * 2.2 + 0.6,
  speed: Math.random() * 0.8 + 0.3,
}));

const traffic = [];
const pickups = [];

const keys = {
  left: false,
  right: false,
  boost: false,
};

let gameState = 'menu';
let score = 0;
let best = Number(localStorage.getItem('roadster-best') || 0);
let lastTime = 0;
let spawnTimer = 0;
let pickupTimer = 0;
let crashFlash = 0;

bestEl.textContent = String(best);

function resetGame() {
  road.scroll = 0;
  road.speed = 280;
  player.x = canvas.width / 2;
  player.y = canvas.height - 110;
  player.lane = 1;
  player.tilt = 0;
  player.boost = 1;
  score = 0;
  traffic.length = 0;
  pickups.length = 0;
  spawnTimer = 0;
  pickupTimer = 0;
  crashFlash = 0;
  updateHud();
}

function startGame() {
  resetGame();
  gameState = 'playing';
  startScreen.classList.add('hidden');
  startScreen.classList.remove('visible');
  gameOverScreen.classList.add('hidden');
}

function endGame() {
  gameState = 'gameover';
  if (score > best) {
    best = score;
    localStorage.setItem('roadster-best', String(best));
    bestEl.textContent = String(best);
  }
  finalScoreEl.textContent = `Score: ${score}`;
  gameOverScreen.classList.remove('hidden');
}

function updateHud() {
  scoreEl.textContent = String(Math.floor(score));
  speedEl.textContent = `${(road.speed / 280).toFixed(1)}x`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function spawnTraffic() {
  const lane = Math.floor(Math.random() * 3);
  const laneCenter = road.x + road.laneWidth * lane + road.laneWidth / 2;
  const size = 44 + Math.random() * 26;
  const car = {
    lane,
    x: laneCenter,
    y: -80,
    w: size,
    h: size * 1.5,
    color: ['#ff6b6b', '#ffb86b', '#7ce7ff', '#b69cff', '#ff7ac6'][Math.floor(Math.random() * 5)],
    speed: road.speed * (0.8 + Math.random() * 0.6),
  };
  traffic.push(car);
}

function spawnPickup() {
  const lane = Math.floor(Math.random() * 3);
  const x = road.x + road.laneWidth * lane + road.laneWidth / 2;
  pickups.push({
    x,
    y: -20,
    radius: 12,
    pulse: Math.random() * Math.PI * 2,
  });
}

function collision(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) * 0.38 && Math.abs(a.y - b.y) < (a.h + b.h) * 0.44;
}

function handleInput() {
  if (gameState !== 'playing') return;

  const step = keys.left ? -1 : keys.right ? 1 : 0;
  if (step !== 0) {
    player.lane = clamp(player.lane + step, 0, 2);
    player.tilt = step * 0.8;
  } else {
    player.tilt *= 0.8;
  }

  const targetX = road.x + road.laneWidth * player.lane + road.laneWidth / 2;
  player.x += (targetX - player.x) * 0.16;

  if (keys.boost && player.boost > 0) {
    road.speed += 260 * 0.025;
    player.boost = Math.max(0, player.boost - 0.009);
  } else {
    player.boost = Math.min(1, player.boost + 0.003);
  }

  if (player.boost <= 0.05) {
    road.speed = Math.max(280, road.speed - 120 * 0.016);
  }
}

function update(delta) {
  if (gameState !== 'playing') return;

  road.speed += 18 * delta;
  road.scroll += road.speed * delta;
  score += road.speed * delta * 0.06;

  handleInput();
  updateHud();

  spawnTimer -= delta;
  pickupTimer -= delta;

  if (spawnTimer <= 0) {
    spawnTraffic();
    spawnTimer = Math.max(0.32, 1.2 - score / 350);
  }

  if (pickupTimer <= 0) {
    spawnPickup();
    pickupTimer = 6.5;
  }

  for (let i = traffic.length - 1; i >= 0; i--) {
    const car = traffic[i];
    car.y += (road.speed + car.speed) * delta;
    if (car.y > canvas.height + 100) {
      traffic.splice(i, 1);
      continue;
    }

    if (collision(car, { x: player.x, y: player.y, w: player.width, h: player.height })) {
      crashFlash = 1;
      endGame();
      return;
    }
  }

  for (let i = pickups.length - 1; i >= 0; i--) {
    const pickup = pickups[i];
    pickup.y += road.speed * delta * 0.9;
    pickup.pulse += delta * 8;

    const dist = Math.hypot(player.x - pickup.x, player.y - pickup.y);
    if (dist < 30) {
      pickups.splice(i, 1);
      score += 120;
      road.speed = Math.min(920, road.speed + 32);
      continue;
    }

    if (pickup.y > canvas.height + 30) {
      pickups.splice(i, 1);
    }
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const star of stars) {
    star.y += star.speed * 2;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const horizon = canvas.height * 0.46;
  ctx.fillStyle = '#0a1423';
  ctx.fillRect(0, 0, canvas.width, horizon);

  ctx.fillStyle = '#10233e';
  ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);
}

function drawRoad() {
  const roadTop = 0;
  const roadHeight = canvas.height;
  ctx.fillStyle = '#101822';
  ctx.fillRect(0, roadTop, canvas.width, roadHeight);

  const roadY = road.scroll % 80;
  for (let y = -80; y < canvas.height + 80; y += 80) {
    ctx.fillStyle = '#1a2e44';
    ctx.fillRect(road.x, y + roadY, road.width, 60);
  }

  for (let i = 0; i <= 3; i++) {
    const x = road.x + i * road.laneWidth;
    ctx.fillStyle = '#8fe5ff';
    ctx.fillRect(x, 0, 6, canvas.height);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(road.x, 0);
  ctx.lineTo(road.x, canvas.height);
  ctx.moveTo(road.x + road.width, 0);
  ctx.lineTo(road.x + road.width, canvas.height);
  ctx.stroke();

  for (let stripe = 0; stripe < 14; stripe++) {
    const y = ((stripe * 70) + (road.scroll % 70)) % (canvas.height + 120) - 60;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(road.x + road.width / 2 - 8, y, 16, 38);
    ctx.fillRect(road.x + road.width / 2 - 8 + road.laneWidth, y, 16, 38);
    ctx.fillRect(road.x + road.width / 2 - 8 - road.laneWidth, y, 16, 38);
  }
}

function drawPlayer() {
  const bodyX = player.x - player.width / 2;
  const bodyY = player.y - player.height / 2;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.tilt);

  ctx.fillStyle = '#c7f2ff';
  ctx.fillRect(-18, -34, 36, 48);
  ctx.fillStyle = '#7ad2ff';
  ctx.fillRect(-26, -14, 52, 28);
  ctx.fillStyle = '#d9f7ff';
  ctx.fillRect(-8, -46, 16, 18);

  ctx.fillStyle = '#1a2b39';
  ctx.fillRect(-22, -36, 10, 20);
  ctx.fillRect(12, -36, 10, 20);
  ctx.fillRect(-22, 22, 10, 18);
  ctx.fillRect(12, 22, 10, 18);

  ctx.fillStyle = '#ff8d5a';
  ctx.fillRect(-10, 20, 20, 8);

  ctx.restore();

  const boostGlow = 8 + (1 - player.boost) * 18;
  if (keys.boost && player.boost > 0.08) {
    ctx.fillStyle = 'rgba(116, 225, 255, 0.7)';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y + 52);
    ctx.lineTo(player.x - 12, player.y + 82 + boostGlow);
    ctx.lineTo(player.x + 12, player.y + 82 + boostGlow);
    ctx.closePath();
    ctx.fill();
  }
}

function drawTraffic() {
  for (const car of traffic) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.fillStyle = car.color;
    ctx.fillRect(-car.w / 2, -car.h / 2, car.w, car.h);
    ctx.fillStyle = '#e9f9ff';
    ctx.fillRect(-car.w * 0.28, -car.h * 0.12, car.w * 0.56, car.h * 0.35);
    ctx.fillStyle = '#222';
    ctx.fillRect(-car.w * 0.36, -car.h * 0.5, 10, 18);
    ctx.fillRect(car.w * 0.26, -car.h * 0.5, 10, 18);
    ctx.fillRect(-car.w * 0.36, car.h * 0.32, 10, 18);
    ctx.fillRect(car.w * 0.26, car.h * 0.32, 10, 18);
    ctx.restore();
  }
}

function drawPickups() {
  for (const pickup of pickups) {
    const glow = 12 + Math.sin(pickup.pulse) * 4;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(121, 233, 255, 0.9)';
    ctx.arc(pickup.x, pickup.y, glow / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dff9ff';
    ctx.beginPath();
    ctx.moveTo(pickup.x, pickup.y - 12);
    ctx.lineTo(pickup.x + 10, pickup.y);
    ctx.lineTo(pickup.x, pickup.y + 12);
    ctx.lineTo(pickup.x - 10, pickup.y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHudGlow() {
  if (crashFlash > 0) {
    ctx.fillStyle = `rgba(255, 90, 105, ${crashFlash * 0.6})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    crashFlash *= 0.9;
  }
}

function draw() {
  drawBackground();
  drawRoad();
  drawPickups();
  drawTraffic();
  drawPlayer();
  drawHudGlow();
}

function gameLoop(timestamp) {
  const delta = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.033);
  lastTime = timestamp;

  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = true;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = true;
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    keys.boost = true;
  }
  if (event.key.toLowerCase() === 'r' && gameState === 'gameover') {
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false;
  if (event.key === ' ' || event.code === 'Space') keys.boost = false;
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

resetGame();
updateHud();
requestAnimationFrame(gameLoop);
