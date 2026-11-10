const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const startPanel = document.getElementById("startPanel");
const gameOverPanel = document.getElementById("gameOver");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");
const finalScoreEl = document.getElementById("finalScore");

const keys = {};
let running = false;
let lastTime = 0;
let gameTime = 0;
let spawnTimer = 0;
let score = 0;
let best = Number(localStorage.getItem("chickenStrikeBest") || 0);
let shake = 0;
let flashAlpha = 0;

// Player configuration with banking physics, animation cycle, and thrusters
const player = {
  x: 480,
  y: 470,
  w: 64,
  h: 56,
  speed: 380,
  vx: 0,
  tilt: 0,
  wingCycle: 0,
  cooldown: 0,
  lives: 3,
  invulnerable: 0,
  thrusterPulse: 0
};

let bullets = [];
let planes = [];
let particles = [];
let debris = [];
let shockwaves = [];
let clouds = [];
let distantHills = [];
let windStreaks = [];

bestEl.textContent = best;

// Initialize parallax cloud layers (3 depth tiers: far, mid, near)
function initClouds() {
  clouds = [];
  // Far clouds (slow, soft, high altitude)
  for (let i = 0; i < 7; i++) {
    clouds.push({
      x: Math.random() * 1100 - 50,
      y: 40 + Math.random() * 140,
      scale: 0.7 + Math.random() * 0.5,
      speed: 6 + Math.random() * 6,
      layer: 0,
      opacity: 0.35 + Math.random() * 0.2
    });
  }
  // Mid clouds (volumetric, fluffy, dynamic lighting)
  for (let i = 0; i < 9; i++) {
    clouds.push({
      x: Math.random() * 1100 - 50,
      y: 110 + Math.random() * 200,
      scale: 1.1 + Math.random() * 0.7,
      speed: 16 + Math.random() * 12,
      layer: 1,
      opacity: 0.65 + Math.random() * 0.25
    });
  }
  // Near wispy clouds (fast, foreground depth)
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * 1100 - 50,
      y: 260 + Math.random() * 220,
      scale: 1.6 + Math.random() * 0.9,
      speed: 35 + Math.random() * 25,
      layer: 2,
      opacity: 0.18 + Math.random() * 0.15
    });
  }

  // Atmospheric wind speed streaks
  windStreaks = [];
  for (let i = 0; i < 22; i++) {
    windStreaks.push({
      x: Math.random() * 960,
      y: Math.random() * 540,
      len: 25 + Math.random() * 60,
      speed: 140 + Math.random() * 180,
      alpha: 0.08 + Math.random() * 0.12
    });
  }
}
initClouds();

function resizeDrawing() {
  canvas.width = 960;
  canvas.height = 540;
}

function startGame() {
  score = 0;
  gameTime = 0;
  bullets = [];
  planes = [];
  particles = [];
  debris = [];
  shockwaves = [];
  spawnTimer = 0.6;
  player.x = 480;
  player.y = 470;
  player.vx = 0;
  player.tilt = 0;
  player.lives = 3;
  player.invulnerable = 0;
  scoreEl.textContent = "0";
  livesEl.textContent = "♥♥♥";
  startPanel.style.display = "none";
  gameOverPanel.hidden = true;
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  if (score > best) {
    best = score;
    localStorage.setItem("chickenStrikeBest", String(best));
    bestEl.textContent = best;
  }
  finalScoreEl.textContent = score;
  gameOverPanel.hidden = false;
}

function shoot() {
  if (!running || player.cooldown > 0) return;
  // High-velocity egg projectile with aerodynamic trail
  bullets.push({
    x: player.x,
    y: player.y - 32,
    vx: (player.tilt * 80),
    vy: -680,
    r: 8.5,
    rot: player.tilt * 0.5,
    glow: 1
  });
  player.cooldown = 0.15;

  // Muzzle flash at rooster beak
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const speed = 60 + Math.random() * 90;
    particles.push({
      x: player.x + (Math.random() - 0.5) * 8,
      y: player.y - 28,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.2 + Math.random() * 0.15,
      maxLife: 0.35,
      size: 4 + Math.random() * 3,
      color: "#fff4b8",
      type: "spark"
    });
  }
}

function spawnPlane() {
  const isHeavy = score > 15 && Math.random() < 0.28;
  const size = isHeavy ? 54 + Math.random() * 12 : 38 + Math.random() * 14;
  const fromLeft = Math.random() > 0.5;
  planes.push({
    x: fromLeft ? -70 : 1030,
    y: 65 + Math.random() * 210,
    targetY: 65 + Math.random() * 210,
    vx: (fromLeft ? 1 : -1) * (85 + Math.random() * 75 + score * 0.75),
    vy: 0,
    w: size * 1.6,
    h: size,
    isHeavy,
    maxHp: isHeavy ? 3 : 1,
    hp: isHeavy ? 3 : 1,
    propellerAngle: 0,
    afterburnerTimer: Math.random() * 10,
    strobeTimer: Math.random() * 2
  });
}

// Realistic multi-tier particle explosion
function createExplosion(x, y, scale = 1, colorTint = "#ff9520") {
  // Shockwave ring
  shockwaves.push({
    x,
    y,
    r: 10,
    maxR: 55 * scale,
    alpha: 0.9,
    life: 0.45
  });

  // Core bright flash particles (white/hot yellow)
  const fireballCount = Math.floor(18 * scale);
  for (let i = 0; i < fireballCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (20 + Math.random() * 180) * scale;
    particles.push({
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      life: 0.35 + Math.random() * 0.45,
      maxLife: 0.8,
      size: (12 + Math.random() * 16) * scale,
      grow: 28 * scale,
      type: "fireball",
      tint: colorTint
    });
  }

  // Dark billowing smoke plumes
  const smokeCount = Math.floor(14 * scale);
  for (let i = 0; i < smokeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (15 + Math.random() * 90) * scale;
    particles.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 45, // rises upwards
      life: 0.6 + Math.random() * 0.7,
      maxLife: 1.3,
      size: (16 + Math.random() * 20) * scale,
      grow: 35 * scale,
      type: "smoke"
    });
  }

  // Flying fiery sparks/embers
  const sparkCount = Math.floor(25 * scale);
  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (70 + Math.random() * 260) * scale;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 0.4 + Math.random() * 0.6,
      maxLife: 1.0,
      size: 2 + Math.random() * 2.5,
      color: Math.random() > 0.4 ? "#ffe96b" : "#ff5d24",
      type: "spark"
    });
  }

  // Realistic tumbling aircraft metal debris
  const debrisCount = Math.floor((4 + Math.random() * 4) * scale);
  for (let i = 0; i < debrisCount; i++) {
    const angle = -Math.PI * 0.8 + Math.random() * Math.PI * 1.6;
    const speed = (60 + Math.random() * 190) * scale;
    debris.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 16,
      w: (6 + Math.random() * 12) * scale,
      h: (3 + Math.random() * 7) * scale,
      life: 0.9 + Math.random() * 0.8,
      smokeTimer: 0
    });
  }
}

function update(dt) {
  gameTime += dt;

  // Always update ambient scenery (clouds & atmospheric wind)
  clouds.forEach(c => {
    c.x += c.speed * dt;
    if (c.x > 1080) c.x = -160;
  });

  windStreaks.forEach(w => {
    w.x += w.speed * dt;
    if (w.x > 1020) {
      w.x = -80;
      w.y = Math.random() * 540;
    }
  });

  player.wingCycle += dt * 8;
  player.thrusterPulse += dt * 25;

  if (!running) return;

  // Rooster movement & smooth aerodynamic banking physics
  let targetTilt = 0;
  let moveDir = 0;
  if (keys.ArrowLeft || keys.KeyA || keys.touchLeft) {
    moveDir -= 1;
    targetTilt = -0.32;
  }
  if (keys.ArrowRight || keys.KeyD || keys.touchRight) {
    moveDir += 1;
    targetTilt = 0.32;
  }

  player.vx += (moveDir * player.speed - player.vx) * 14 * dt;
  player.x += player.vx * dt;
  player.tilt += (targetTilt - player.tilt) * 12 * dt;
  player.x = Math.max(42, Math.min(918, player.x));

  player.cooldown -= dt;
  player.invulnerable -= dt;
  if (moveDir !== 0) player.wingCycle += dt * 10;

  if (keys.Space || keys.touchShoot) shoot();

  // Update projectiles
  bullets.forEach(b => {
    b.x += (b.vx || 0) * dt;
    b.y += b.vy * dt;
    // Aerodynamic particle trail behind egg
    if (Math.random() < 0.65) {
      particles.push({
        x: b.x + (Math.random() - 0.5) * 3,
        y: b.y + 10,
        vx: (Math.random() - 0.5) * 10,
        vy: 40 + Math.random() * 60,
        life: 0.18 + Math.random() * 0.12,
        maxLife: 0.3,
        size: 3 + Math.random() * 3,
        type: "eggTrail"
      });
    }
  });
  bullets = bullets.filter(b => b.y > -30);

  // Spawn enemy warplanes
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnPlane();
    spawnTimer = Math.max(0.4, 1.15 - score * 0.011) + Math.random() * 0.55;
  }

  // Update planes
  planes.forEach(p => {
    p.x += p.vx * dt;
    p.propellerAngle += dt * 38;
    p.afterburnerTimer += dt;
    p.strobeTimer = (p.strobeTimer + dt) % 1.2;

    // Smooth subtle altitude wander
    if (Math.random() < 0.015) {
      p.targetY = Math.max(60, Math.min(280, p.y + (Math.random() - 0.5) * 70));
    }
    p.y += (p.targetY - p.y) * 2.5 * dt;

    // Damaged engine smoke & fire trail
    if (p.hp < p.maxHp) {
      if (Math.random() < 0.8) {
        particles.push({
          x: p.x - (p.vx > 0 ? 25 : -25),
          y: p.y,
          vx: -p.vx * 0.2 + (Math.random() - 0.5) * 20,
          vy: -20 - Math.random() * 30,
          life: 0.5 + Math.random() * 0.4,
          maxLife: 0.9,
          size: 9 + Math.random() * 12,
          grow: 22,
          type: "smoke"
        });
      }
      if (Math.random() < 0.4) {
        particles.push({
          x: p.x - (p.vx > 0 ? 25 : -25),
          y: p.y,
          vx: -p.vx * 0.3 + (Math.random() - 0.5) * 35,
          vy: (Math.random() - 0.5) * 30,
          life: 0.2 + Math.random() * 0.15,
          maxLife: 0.35,
          size: 3.5,
          color: "#ff7426",
          type: "spark"
        });
      }
    }
  });
  planes = planes.filter(p => p.x > -120 && p.x < 1080);

  // Bullet-plane collision
  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = planes.length - 1; j >= 0; j--) {
      const b = bullets[i];
      const p = planes[j];
      if (Math.abs(b.x - p.x) < p.w * 0.52 && Math.abs(b.y - p.y) < p.h * 0.52) {
        bullets.splice(i, 1);
        p.hp--;
        // Hit spark burst
        createExplosion(b.x, b.y, 0.38, "#ffe57f");
        shake = Math.max(shake, 3.5);

        if (p.hp <= 0) {
          // Full plane destruction
          createExplosion(p.x, p.y, p.isHeavy ? 1.5 : 1.0, "#ff841f");
          planes.splice(j, 1);
          score += p.isHeavy ? 25 : 10;
          scoreEl.textContent = score;
          shake = Math.max(shake, p.isHeavy ? 12 : 8);
          flashAlpha = p.isHeavy ? 0.32 : 0.2;
        }
        break;
      }
    }
  }

  // Player collision with planes
  if (player.invulnerable <= 0) {
    for (let i = planes.length - 1; i >= 0; i--) {
      const p = planes[i];
      if (Math.abs(p.x - player.x) < (p.w * 0.5 + 24) && Math.abs(p.y - player.y) < (p.h * 0.5 + 20)) {
        createExplosion(p.x, p.y, 1.2);
        planes.splice(i, 1);
        player.lives--;
        player.invulnerable = 1.9;
        shake = 16;
        flashAlpha = 0.45;
        createExplosion(player.x, player.y, 1.1, "#ff3b30");
        livesEl.textContent = "♥".repeat(Math.max(0, player.lives)) + "♡".repeat(Math.max(0, 3 - player.lives));
        if (player.lives <= 0) endGame();
        break;
      }
    }
  }

  // Update particles
  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.grow) p.size += p.grow * dt;
    if (p.type === "spark") p.vy += 220 * dt; // gravity on sparks
    if (p.type === "smoke") p.vy -= 18 * dt;  // buoyancy on smoke
    p.life -= dt;
  });
  particles = particles.filter(p => p.life > 0);

  // Update tumbling debris
  debris.forEach(d => {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vy += 280 * dt; // gravity
    d.rot += d.vRot * dt;
    d.life -= dt;
    d.smokeTimer -= dt;
    if (d.smokeTimer <= 0) {
      d.smokeTimer = 0.06;
      particles.push({
        x: d.x,
        y: d.y,
        vx: (Math.random() - 0.5) * 15,
        vy: -15,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
        size: 5 + Math.random() * 5,
        grow: 12,
        type: "smoke"
      });
    }
  });
  debris = debris.filter(d => d.life > 0 && d.y < 560);

  // Update shockwaves
  shockwaves.forEach(s => {
    s.r += (s.maxR - s.r) * 10 * dt;
    s.alpha -= dt * (1 / s.life);
  });
  shockwaves = shockwaves.filter(s => s.alpha > 0);

  shake *= 0.88;
  flashAlpha = Math.max(0, flashAlpha - dt * 2.2);
}

// ==================== REALISTIC RENDERING SYSTEM ====================

function drawBackground() {
  // 1. Stratospheric to Twilight Atmosphere Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 540);
  skyGrad.addColorStop(0, "#08142e");     // Deep space/high stratosphere
  skyGrad.addColorStop(0.32, "#183664");  // Upper atmospheric blue
  skyGrad.addColorStop(0.68, "#32629b");  // Mid sky
  skyGrad.addColorStop(0.86, "#b27357");  // Horizon twilight orange
  skyGrad.addColorStop(1, "#dfa46e");     // Warm solar horizon haze
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 960, 540);

  // 2. Realistic Glowing Sun with Atmospheric Lens Flare
  const sunX = 740;
  const sunY = 95;

  // Sun outer atmospheric glow
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 260);
  sunGlow.addColorStop(0, "rgba(255, 250, 220, 0.8)");
  sunGlow.addColorStop(0.18, "rgba(255, 215, 140, 0.35)");
  sunGlow.addColorStop(0.55, "rgba(255, 170, 90, 0.12)");
  sunGlow.addColorStop(1, "rgba(255, 150, 80, 0)");
  ctx.fillStyle = sunGlow;
  ctx.fillRect(sunX - 260, sunY - 260, 520, 520);

  // Sun brilliant core
  const sunCore = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 32);
  sunCore.addColorStop(0, "#ffffff");
  sunCore.addColorStop(0.4, "#fff9e6");
  sunCore.addColorStop(1, "rgba(255, 230, 160, 0)");
  ctx.fillStyle = sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
  ctx.fill();

  // Subtle sun god rays
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255, 240, 200, 0.035)";
  for (let i = 0; i < 6; i++) {
    const angle = 0.7 + i * 0.32 + Math.sin(gameTime * 0.2 + i) * 0.05;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(sunX + Math.cos(angle - 0.08) * 850, sunY + Math.sin(angle - 0.08) * 850);
    ctx.lineTo(sunX + Math.cos(angle + 0.08) * 850, sunY + Math.sin(angle + 0.08) * 850);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 3. High Altitude Wind Streaks (Sense of speed)
  ctx.lineWidth = 1;
  windStreaks.forEach(w => {
    ctx.strokeStyle = `rgba(255, 255, 255, ${w.alpha})`;
    ctx.beginPath();
    ctx.moveTo(w.x, w.y);
    ctx.lineTo(w.x + w.len, w.y);
    ctx.stroke();
  });

  // 4. Parallax Mountain Ranges (Aerial Perspective with atmospheric scattering)
  // Layer 1: Distant hazy peaks (soft blue-grey, atmospheric depth)
  ctx.fillStyle = "rgba(42, 68, 102, 0.45)";
  ctx.beginPath();
  ctx.moveTo(0, 540);
  ctx.lineTo(0, 420);
  ctx.lineTo(90, 370);
  ctx.lineTo(190, 415);
  ctx.lineTo(310, 350);
  ctx.lineTo(440, 425);
  ctx.lineTo(580, 340);
  ctx.lineTo(720, 410);
  ctx.lineTo(840, 360);
  ctx.lineTo(960, 395);
  ctx.lineTo(960, 540);
  ctx.closePath();
  ctx.fill();

  // Layer 2: Mid-range rocky ridges with sunlit highlight faces
  const midRidgeGrad = ctx.createLinearGradient(0, 390, 0, 540);
  midRidgeGrad.addColorStop(0, "#1e3753");
  midRidgeGrad.addColorStop(1, "#0d1b2a");
  ctx.fillStyle = midRidgeGrad;
  ctx.beginPath();
  ctx.moveTo(0, 540);
  ctx.lineTo(0, 460);
  ctx.lineTo(130, 410);
  ctx.lineTo(260, 455);
  ctx.lineTo(400, 400);
  ctx.lineTo(520, 460);
  ctx.lineTo(670, 390);
  ctx.lineTo(810, 445);
  ctx.lineTo(960, 415);
  ctx.lineTo(960, 540);
  ctx.closePath();
  ctx.fill();

  // Layer 3: Foreground rolling foothills with subtle atmospheric valley fog
  const foreGrad = ctx.createLinearGradient(0, 450, 0, 540);
  foreGrad.addColorStop(0, "#102235");
  foreGrad.addColorStop(1, "#060d16");
  ctx.fillStyle = foreGrad;
  ctx.beginPath();
  ctx.moveTo(0, 540);
  ctx.lineTo(0, 490);
  ctx.lineTo(160, 465);
  ctx.lineTo(340, 495);
  ctx.lineTo(500, 460);
  ctx.lineTo(680, 490);
  ctx.lineTo(840, 455);
  ctx.lineTo(960, 480);
  ctx.lineTo(960, 540);
  ctx.closePath();
  ctx.fill();

  // Valley mist over mountains
  const mistGrad = ctx.createLinearGradient(0, 430, 0, 500);
  mistGrad.addColorStop(0, "rgba(223, 164, 110, 0.15)");
  mistGrad.addColorStop(1, "rgba(16, 34, 53, 0)");
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, 430, 960, 70);

  // 5. Draw Volumetric Parallax Clouds
  drawClouds();
}

// Volumetric soft shaded clouds
function drawClouds() {
  clouds.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale * 0.65);

    // Dynamic puff circles with radial gradient (sunlit top-right, shaded bottom-left)
    const puffs = [
      { x: -35, y: 5, r: 24 },
      { x: -15, y: -8, r: 32 },
      { x: 15, y: -12, r: 38 },
      { x: 42, y: -4, r: 30 },
      { x: 62, y: 8, r: 22 },
      { x: 10, y: 12, r: 28 }
    ];

    puffs.forEach(p => {
      const puffGrad = ctx.createRadialGradient(p.x + 8, p.y - 12, 4, p.x, p.y, p.r);
      // Top gets warm sunlight, underside gets cool sky shadow
      puffGrad.addColorStop(0, `rgba(255, 248, 238, ${c.opacity})`);
      puffGrad.addColorStop(0.65, `rgba(225, 234, 248, ${c.opacity * 0.75})`);
      puffGrad.addColorStop(1, `rgba(160, 180, 205, 0)`);
      ctx.fillStyle = puffGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  });
}

// ==================== DRAW PLAYER: LEGENDARY ROOSTER ====================
function drawChicken() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.tilt);

  // Invulnerability blink effect
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 14) % 2) {
    ctx.globalAlpha = 0.4;
  }

  // 1. Dual Jetpack Thruster Exhaust Flames (mounted behind wings)
  const pulse = Math.sin(player.thrusterPulse) * 4;
  const flameLen = 28 + pulse;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  [-18, 18].forEach(sideX => {
    // Outer flame (warm orange)
    const thrusterGrad = ctx.createLinearGradient(sideX, 16, sideX, 16 + flameLen);
    thrusterGrad.addColorStop(0, "rgba(100, 200, 255, 0.95)"); // cyan hot base
    thrusterGrad.addColorStop(0.35, "rgba(255, 180, 40, 0.85)");
    thrusterGrad.addColorStop(1, "rgba(255, 60, 10, 0)");
    ctx.fillStyle = thrusterGrad;
    ctx.beginPath();
    ctx.moveTo(sideX - 6, 16);
    ctx.quadraticCurveTo(sideX - 7, 16 + flameLen * 0.6, sideX, 16 + flameLen);
    ctx.quadraticCurveTo(sideX + 7, 16 + flameLen * 0.6, sideX + 6, 16);
    ctx.closePath();
    ctx.fill();

    // Inner hot blue-white core
    const coreGrad = ctx.createLinearGradient(sideX, 16, sideX, 16 + flameLen * 0.55);
    coreGrad.addColorStop(0, "#ffffff");
    coreGrad.addColorStop(0.5, "#70d6ff");
    coreGrad.addColorStop(1, "rgba(0, 160, 255, 0)");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(sideX - 3, 16);
    ctx.lineTo(sideX, 16 + flameLen * 0.55);
    ctx.lineTo(sideX + 3, 16);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();

  // 2. Thruster Turbine Pods (Metallic titanium canisters)
  [-18, 18].forEach(sideX => {
    const podGrad = ctx.createLinearGradient(sideX - 6, 0, sideX + 6, 0);
    podGrad.addColorStop(0, "#3a4659");
    podGrad.addColorStop(0.4, "#8a99ad");
    podGrad.addColorStop(0.7, "#d4dde8");
    podGrad.addColorStop(1, "#253140");
    ctx.fillStyle = podGrad;
    ctx.beginPath();
    ctx.roundRect(sideX - 6, 4, 12, 16, 3);
    ctx.fill();
  });

  // 3. Dynamic Sickle Tail Feathers (Iridescent emerald/navy curve with physics sway)
  const tailSway = -player.tilt * 22 + Math.sin(player.wingCycle * 0.5) * 4;
  ctx.save();
  const tailGrad = ctx.createLinearGradient(-15, -5, -45 + tailSway, -25);
  tailGrad.addColorStop(0, "#173b32");
  tailGrad.addColorStop(0.5, "#256653");
  tailGrad.addColorStop(0.85, "#1d3e68");
  tailGrad.addColorStop(1, "#0f172a");
  ctx.fillStyle = tailGrad;

  // Upper long arching feather
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.bezierCurveTo(-28, 4, -48 + tailSway, -8, -50 + tailSway, -28);
  ctx.bezierCurveTo(-42 + tailSway, -12, -26, -2, -8, -2);
  ctx.closePath();
  ctx.fill();

  // Mid arching feather
  ctx.beginPath();
  ctx.moveTo(-12, 10);
  ctx.bezierCurveTo(-30, 12, -45 + tailSway, 2, -46 + tailSway, -14);
  ctx.bezierCurveTo(-38 + tailSway, -4, -24, 4, -9, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. Main Body: Aerodynamic Layered Avian Plumage
  const bodyGrad = ctx.createRadialGradient(-6, -6, 4, 0, 0, 32);
  bodyGrad.addColorStop(0, "#ffffff");      // Specular sunlight highlight
  bodyGrad.addColorStop(0.35, "#fff2cf");   // Rich golden-cream feathers
  bodyGrad.addColorStop(0.75, "#e5b868");   // Warm golden-amber shading
  bodyGrad.addColorStop(1, "#8e5720");      // Deep bronze ambient occlusion
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Individual feather texture strokes on chest
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 1.5;
  for (let f = -12; f <= 12; f += 8) {
    ctx.beginPath();
    ctx.arc(f, 6, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // 5. Articulated Flight Wings with Layered Primary/Secondary Feathers
  const flapAngle = Math.sin(player.wingCycle) * 0.16 + Math.abs(player.tilt) * 0.25;

  // Left Wing
  ctx.save();
  ctx.translate(-16, 2);
  ctx.rotate(-0.25 - flapAngle);
  const wingGradL = ctx.createLinearGradient(0, -10, -28, 14);
  wingGradL.addColorStop(0, "#fff5d6");
  wingGradL.addColorStop(0.6, "#dfa956");
  wingGradL.addColorStop(1, "#7d4715");
  ctx.fillStyle = wingGradL;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-18, -12, -32, -4, -36, 12);
  ctx.bezierCurveTo(-26, 18, -12, 14, 0, 8);
  ctx.closePath();
  ctx.fill();
  // Primary feather tips
  ctx.strokeStyle = "#5a310c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-20, 2); ctx.lineTo(-34, 10);
  ctx.moveTo(-16, -2); ctx.lineTo(-30, 2);
  ctx.stroke();
  ctx.restore();

  // Right Wing
  ctx.save();
  ctx.translate(16, 2);
  ctx.rotate(0.25 + flapAngle);
  const wingGradR = ctx.createLinearGradient(0, -10, 28, 14);
  wingGradR.addColorStop(0, "#ffffff");
  wingGradR.addColorStop(0.6, "#ebd08f");
  wingGradR.addColorStop(1, "#945c1f");
  ctx.fillStyle = wingGradR;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(18, -12, 32, -4, 36, 12);
  ctx.bezierCurveTo(26, 18, 12, 14, 0, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a310c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 2); ctx.lineTo(34, 10);
  ctx.moveTo(16, -2); ctx.lineTo(30, 2);
  ctx.stroke();
  ctx.restore();

  // 6. Realistic Rooster Comb (Mào Gà Cờ - Ruby Red with serrations & highlights)
  const combGrad = ctx.createLinearGradient(0, -36, 0, -14);
  combGrad.addColorStop(0, "#ff3b30");     // Bright vivid crimson
  combGrad.addColorStop(0.65, "#cc1124");  // Deep ruby red
  combGrad.addColorStop(1, "#800512");     // Dark red shadow
  ctx.fillStyle = combGrad;

  ctx.beginPath();
  ctx.moveTo(-14, -18);
  ctx.quadraticCurveTo(-18, -28, -12, -34);
  ctx.quadraticCurveTo(-7, -26, -5, -36);
  ctx.quadraticCurveTo(2, -26, 5, -35);
  ctx.quadraticCurveTo(11, -26, 14, -30);
  ctx.quadraticCurveTo(16, -20, 12, -16);
  ctx.closePath();
  ctx.fill();

  // Comb specular highlight ridge
  ctx.strokeStyle = "rgba(255, 180, 180, 0.55)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, -31);
  ctx.lineTo(-6, -25);
  ctx.lineTo(-4, -33);
  ctx.lineTo(3, -25);
  ctx.lineTo(6, -32);
  ctx.stroke();

  // 7. Wattles (Tích Gà - Crimson fleshy lobe below beak)
  ctx.fillStyle = combGrad;
  ctx.beginPath();
  ctx.ellipse(14, 11, 6, 10, 0.25, 0, Math.PI * 2);
  ctx.fill();

  // 8. Powerful Raptor Beak with Keratin Highlights
  const beakGrad = ctx.createLinearGradient(16, -5, 38, 5);
  beakGrad.addColorStop(0, "#ffe066");
  beakGrad.addColorStop(0.6, "#f59f00");
  beakGrad.addColorStop(1, "#b36200");
  ctx.fillStyle = beakGrad;
  ctx.beginPath();
  ctx.moveTo(15, -6);
  ctx.quadraticCurveTo(28, -7, 36, 2);
  ctx.lineTo(24, 7);
  ctx.quadraticCurveTo(18, 5, 15, 6);
  ctx.closePath();
  ctx.fill();

  // Beak specular ridge & nostril
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(18, -5);
  ctx.quadraticCurveTo(26, -5, 33, 1);
  ctx.stroke();

  ctx.fillStyle = "#5c3300";
  ctx.beginPath();
  ctx.ellipse(20, -2, 1.8, 1, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // 9. Fierce Combat Eye with Corneal Catchlight
  // Sclera / eye base
  ctx.fillStyle = "#1e1305";
  ctx.beginPath();
  ctx.arc(8, -8, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Golden iris
  const irisGrad = ctx.createRadialGradient(8, -8, 1, 8, -8, 4.5);
  irisGrad.addColorStop(0, "#ffea79");
  irisGrad.addColorStop(0.7, "#f08c00");
  irisGrad.addColorStop(1, "#862e9c");
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(8, -8, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Intense black pupil
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.arc(8.5, -8, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Sharp specular catchlight
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(9.8, -9.5, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Fierce brow ridge
  ctx.strokeStyle = "#5a310c";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(3, -12);
  ctx.lineTo(14, -8);
  ctx.stroke();

  // 10. Aviator Tactical Visor / Goggles on Forehead
  ctx.save();
  // Goggle brass/carbon frame
  ctx.strokeStyle = "#c59b27";
  ctx.lineWidth = 2.4;
  ctx.fillStyle = "rgba(20, 30, 48, 0.75)";
  ctx.beginPath();
  ctx.roundRect(-4, -18, 18, 9, 3);
  ctx.fill();
  ctx.stroke();

  // Reflective cyan lens glare
  ctx.strokeStyle = "rgba(100, 230, 255, 0.75)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-1, -16);
  ctx.lineTo(10, -11);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ==================== DRAW ENEMY MILITARY AIRCRAFT ====================
function drawPlane(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const facing = p.vx > 0 ? 1 : -1;
  ctx.scale(facing, 1);

  // Subtle flight pitch
  const pitch = (p.targetY - p.y) * 0.003;
  ctx.rotate(pitch);

  const scale = p.isHeavy ? 1.3 : 1.0;
  ctx.scale(scale, scale);

  // 1. Jet Engine Afterburner Exhaust / Heat Distortion
  const jetPulse = Math.sin(gameTime * 28 + p.afterburnerTimer) * 3;
  const flameLength = (p.isHeavy ? 36 : 24) + jetPulse;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const exhaustGrad = ctx.createLinearGradient(-42, 0, -42 - flameLength, 0);
  exhaustGrad.addColorStop(0, "rgba(140, 220, 255, 0.95)");  // supersonic blue core
  exhaustGrad.addColorStop(0.35, "rgba(255, 140, 30, 0.85)"); // bright fire
  exhaustGrad.addColorStop(1, "rgba(255, 40, 10, 0)");
  ctx.fillStyle = exhaustGrad;
  ctx.beginPath();
  ctx.moveTo(-40, -5);
  ctx.lineTo(-40 - flameLength, 0);
  ctx.lineTo(-40, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Far Wing (underneath fuselage with darker shade)
  ctx.fillStyle = p.isHeavy ? "#1f2937" : "#2d3748";
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.lineTo(6, -34);
  ctx.lineTo(20, -32);
  ctx.lineTo(12, -4);
  ctx.closePath();
  ctx.fill();

  // 3. Main Aerodynamic Fuselage with Metallic Gradient Shading
  const fuseGrad = ctx.createLinearGradient(0, -12, 0, 12);
  if (p.isHeavy) {
    fuseGrad.addColorStop(0, "#475569");    // Slate grey armor
    fuseGrad.addColorStop(0.35, "#64748b");  // Specular reflection on top edge
    fuseGrad.addColorStop(0.7, "#334155");   // Mid fuselage
    fuseGrad.addColorStop(1, "#0f172a");     // Ambient shadow underneath
  } else {
    fuseGrad.addColorStop(0, "#2c3e50");    // Fighter dark metallic
    fuseGrad.addColorStop(0.35, "#566573");  // Highlight
    fuseGrad.addColorStop(0.7, "#1c2833");   // Shadow
    fuseGrad.addColorStop(1, "#0b1015");
  }

  ctx.fillStyle = fuseGrad;
  ctx.beginPath();
  ctx.moveTo(-42, -5);
  ctx.lineTo(-32, -9);
  ctx.lineTo(18, -10);
  ctx.quadraticCurveTo(46, -6, 52, 0); // sleek needle nose
  ctx.quadraticCurveTo(46, 6, 18, 9);
  ctx.lineTo(-32, 8);
  ctx.lineTo(-42, 5);
  ctx.closePath();
  ctx.fill();

  // Fine panel lines and rivet detailing
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-15, -8); ctx.lineTo(-15, 8);
  ctx.moveTo(5, -9);   ctx.lineTo(5, 9);
  ctx.moveTo(25, -7);  ctx.lineTo(25, 7);
  ctx.stroke();

  // 4. Cockpit Canopy: Tinted Polarized Glass with Glare Reflection
  const canopyGrad = ctx.createLinearGradient(8, -14, 24, 0);
  canopyGrad.addColorStop(0, "rgba(100, 210, 255, 0.9)");  // sky reflection
  canopyGrad.addColorStop(0.45, "rgba(30, 80, 120, 0.85)");
  canopyGrad.addColorStop(1, "rgba(5, 15, 25, 0.95)");
  ctx.fillStyle = canopyGrad;
  ctx.beginPath();
  ctx.moveTo(6, -8);
  ctx.quadraticCurveTo(18, -17, 30, -7);
  ctx.lineTo(28, -2);
  ctx.lineTo(4, -2);
  ctx.closePath();
  ctx.fill();

  // Canopy glass glare stripe
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(10, -11);
  ctx.lineTo(22, -11);
  ctx.stroke();

  // Pilot silhouette inside canopy
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.beginPath();
  ctx.arc(16, -6, 3, 0, Math.PI * 2);
  ctx.fill();

  // 5. Near Wing (Fore Wing with Camo / Military Roundel)
  const wingGrad = ctx.createLinearGradient(-15, 0, 15, 36);
  wingGrad.addColorStop(0, p.isHeavy ? "#475569" : "#34495e");
  wingGrad.addColorStop(0.5, p.isHeavy ? "#64748b" : "#4a6572");
  wingGrad.addColorStop(1, p.isHeavy ? "#1e293b" : "#1a252f");
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.lineTo(4, 36);
  ctx.lineTo(18, 34);
  ctx.lineTo(14, 2);
  ctx.closePath();
  ctx.fill();

  // Wing aileron line
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, 24);
  ctx.lineTo(14, 24);
  ctx.stroke();

  // Military Roundel / Insignia on wing
  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.arc(6, 18, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(6, 18, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 6. Tail Fin (Vertical Stabilizer with Warning Stripes)
  const finGrad = ctx.createLinearGradient(-35, -5, -45, -24);
  finGrad.addColorStop(0, "#2c3e50");
  finGrad.addColorStop(1, "#c0392b");
  ctx.fillStyle = finGrad;
  ctx.beginPath();
  ctx.moveTo(-28, -6);
  ctx.lineTo(-42, -24);
  ctx.lineTo(-32, -24);
  ctx.lineTo(-18, -6);
  ctx.closePath();
  ctx.fill();

  // 7. Navigation Strobe Light on Wingtip (Red / Green blinking)
  if (p.strobeTimer < 0.6) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = facing > 0 ? "#00ff66" : "#ff2a2a";
    ctx.beginPath();
    ctx.arc(10, 35, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Heavy plane health bar
  if (p.isHeavy && p.hp > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(-22, -28, 44, 5);
    ctx.fillStyle = p.hp > 1 ? "#2ecc71" : "#e74c3c";
    ctx.fillRect(-21, -27, (42 * (p.hp / p.maxHp)), 3);
  }

  ctx.restore();
}

// ==================== DRAW 3D EGG MISSILE PROJECTILE ====================
function drawBullet(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rot || 0);

  // 1. Supersonic Shockwave Ribbon Glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Shockwave cone
  ctx.fillStyle = "rgba(255, 230, 140, 0.22)";
  ctx.beginPath();
  ctx.moveTo(0, -b.r * 1.5);
  ctx.lineTo(-b.r * 1.6, b.r * 2.2);
  ctx.lineTo(b.r * 1.6, b.r * 2.2);
  ctx.closePath();
  ctx.fill();

  // High velocity plasma tail
  const trailGrad = ctx.createLinearGradient(0, 0, 0, 36);
  trailGrad.addColorStop(0, "rgba(255, 240, 160, 0.8)");
  trailGrad.addColorStop(0.4, "rgba(255, 170, 40, 0.5)");
  trailGrad.addColorStop(1, "rgba(255, 80, 20, 0)");
  ctx.fillStyle = trailGrad;
  ctx.beginPath();
  ctx.moveTo(-b.r * 0.6, 4);
  ctx.lineTo(0, 36);
  ctx.lineTo(b.r * 0.6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Realistic 3D Egg Geometry with Specular Sunlight Highlights
  // Egg base curvature
  const eggGrad = ctx.createRadialGradient(-2.5, -3, 1, 0, 0, b.r * 1.3);
  eggGrad.addColorStop(0, "#ffffff");      // Brilliant sun specular spot
  eggGrad.addColorStop(0.35, "#fff7dc");   // Smooth porcelain eggshell tone
  eggGrad.addColorStop(0.7, "#f5dc9e");    // Golden egg ambient shading
  eggGrad.addColorStop(1, "#b38634");      // Deep bronze ambient bounce shadow
  ctx.fillStyle = eggGrad;

  ctx.beginPath();
  // Realistic asymmetrical egg shape (narrow top, fuller bottom)
  ctx.moveTo(0, -b.r * 1.35);
  ctx.bezierCurveTo(b.r * 0.95, -b.r * 1.1, b.r * 0.9, b.r * 0.8, 0, b.r * 1.15);
  ctx.bezierCurveTo(-b.r * 0.9, b.r * 0.8, -b.r * 0.95, -b.r * 1.1, 0, -b.r * 1.35);
  ctx.closePath();
  ctx.fill();

  // Egg shell specular gleam curve
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(-2, -3, b.r * 0.45, b.r * 0.7, -0.2, -0.6, 1.2);
  ctx.stroke();

  ctx.restore();
}

// ==================== DRAW PARTICLES & POST-PROCESSING ====================
function drawFX() {
  // Shockwave distortion rings
  shockwaves.forEach(s => {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 240, 200, ${s.alpha})`;
    ctx.lineWidth = 3.5 * s.alpha;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  // Aircraft debris shards
  debris.forEach(d => {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    const debGrad = ctx.createLinearGradient(-d.w / 2, 0, d.w / 2, 0);
    debGrad.addColorStop(0, "#1f2937");
    debGrad.addColorStop(0.5, "#4b5563");
    debGrad.addColorStop(1, "#111827");
    ctx.fillStyle = debGrad;
    ctx.beginPath();
    ctx.moveTo(-d.w / 2, -d.h / 2);
    ctx.lineTo(d.w / 2, -d.h / 4);
    ctx.lineTo(d.w / 3, d.h / 2);
    ctx.lineTo(-d.w / 3, d.h / 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // Multi-tier particles
  particles.forEach(p => {
    const normLife = Math.max(0, p.life / p.maxLife);

    if (p.type === "fireball") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const rad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      rad.addColorStop(0, `rgba(255, 255, 255, ${normLife})`);
      rad.addColorStop(0.25, `rgba(255, 210, 80, ${normLife * 0.9})`);
      rad.addColorStop(0.65, `rgba(255, 90, 20, ${normLife * 0.6})`);
      rad.addColorStop(1, `rgba(180, 20, 0, 0)`);
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.type === "smoke") {
      ctx.save();
      const smokeAlpha = normLife * 0.38;
      const smokeGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      smokeGrad.addColorStop(0, `rgba(45, 52, 64, ${smokeAlpha})`);
      smokeGrad.addColorStop(0.6, `rgba(28, 32, 40, ${smokeAlpha * 0.7})`);
      smokeGrad.addColorStop(1, `rgba(15, 18, 22, 0)`);
      ctx.fillStyle = smokeGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.type === "eggTrail") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(255, 215, 120, ${normLife * 0.65})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * normLife, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Sparks / Embers
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * normLife, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  // Screen Flash (Explosion shock bloom)
  if (flashAlpha > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255, 240, 210, ${flashAlpha})`;
    ctx.fillRect(0, 0, 960, 540);
    ctx.restore();
  }

  // Cinematic Vignette (Darkens edges to focus action and simulate camera lens depth)
  const vignette = ctx.createRadialGradient(480, 270, 320, 480, 270, 560);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.75, "rgba(0, 5, 15, 0.2)");
  vignette.addColorStop(1, "rgba(0, 3, 10, 0.65)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 960, 540);
}

// Master draw loop
function draw() {
  ctx.save();
  // Dynamic camera shake with spring damping
  if (shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  drawBackground();
  bullets.forEach(drawBullet);
  planes.forEach(drawPlane);
  if (running || player.lives > 0) drawChicken();
  drawFX();

  ctx.restore();
}

function loop(time) {
  if (!running) return;
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  update(dt);
  draw();
  if (running) requestAnimationFrame(loop);
}

function renderIdle() {
  if (!running) {
    update(0.016);
    draw();
  }
  requestAnimationFrame(renderIdle);
}

window.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (!running && e.code === "Space") startGame();
});
window.addEventListener("keyup", e => { keys[e.code] = false; });
document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("restartButton").addEventListener("click", startGame);

function bindHold(id, key) {
  const button = document.getElementById(id);
  const down = e => { e.preventDefault(); keys[key] = true; };
  const up = e => { e.preventDefault(); keys[key] = false; };
  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointerleave", up);
  button.addEventListener("pointercancel", up);
}
bindHold("leftButton", "touchLeft");
bindHold("rightButton", "touchRight");
bindHold("shootButton", "touchShoot");

resizeDrawing();
draw();
renderIdle();
