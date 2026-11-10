const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// UI Elements
const lobbyPanel = document.getElementById("lobbyPanel");
const gameOverPanel = document.getElementById("gameOver");
const pausePanel = document.getElementById("pausePanel");
const victoryPanel = document.getElementById("victoryPanel");

const scoreEl = document.getElementById("score");
const coinCountEl = document.getElementById("coinCount");
const reviveCountEl = document.getElementById("reviveCount");
const livesEl = document.getElementById("lives");
const hudStageTag = document.getElementById("hudStageTag");

const buffLaser = document.getElementById("buffLaser");
const buffLaserTime = document.getElementById("buffLaserTime");
const buffSpread = document.getElementById("buffSpread");
const buffSpreadTime = document.getElementById("buffSpreadTime");
const buffShield = document.getElementById("buffShield");

const bossHud = document.getElementById("bossHud");
const bossBarFill = document.getElementById("bossBarFill");

// Lobby Elements
const lobbyGoldEl = document.getElementById("lobbyGold");
const lobbyRevivesEl = document.getElementById("lobbyRevives");
const tabCampaignBtn = document.getElementById("tabCampaignBtn");
const tabHangarBtn = document.getElementById("tabHangarBtn");
const tabCampaignContent = document.getElementById("tabCampaignContent");
const tabHangarContent = document.getElementById("tabHangarContent");

const stageCards = [
  document.getElementById("stageCard1"),
  document.getElementById("stageCard2"),
  document.getElementById("stageCard3")
];
const lockStage2 = document.getElementById("lockStage2");
const lockStage3 = document.getElementById("lockStage3");

// Shop & Upgrade Elements
const itemReviveCountEl = document.getElementById("itemReviveCount");
const buyReviveBtn = document.getElementById("buyReviveBtn");
const weaponLevelText = document.getElementById("weaponLevelText");
const upgradeWeaponBtn = document.getElementById("upgradeWeaponBtn");
const shieldStatusText = document.getElementById("shieldStatusText");
const buyShieldPermBtn = document.getElementById("buyShieldPermBtn");
const engineLevelText = document.getElementById("engineLevelText");
const upgradeEngineBtn = document.getElementById("upgradeEngineBtn");

// Modals
const startButton = document.getElementById("startButton");
const resumeButton = document.getElementById("resumeButton");
const lobbyButton = document.getElementById("lobbyButton");
const nextStageButton = document.getElementById("nextStageButton");
const victoryLobbyButton = document.getElementById("victoryLobbyButton");
const restartButton = document.getElementById("restartButton");
const gameOverLobbyButton = document.getElementById("gameOverLobbyButton");
const pauseBtn = document.getElementById("pauseBtn");

// ==================== PERSISTENT USER DATA ====================
let userGold = Number(localStorage.getItem("rooster_gold"));
if (isNaN(userGold) || userGold < 0) userGold = 80;

let userRevives = Number(localStorage.getItem("rooster_revives"));
if (isNaN(userRevives) || userRevives < 0) userRevives = 1;

let weaponLevel = Number(localStorage.getItem("rooster_weapon_level"));
if (isNaN(weaponLevel) || weaponLevel < 1 || weaponLevel > 4) weaponLevel = 1;

let hasStartShield = Boolean(Number(localStorage.getItem("rooster_has_shield") || 0));

let engineLevel = Number(localStorage.getItem("rooster_engine_level"));
if (isNaN(engineLevel) || engineLevel < 0 || engineLevel > 3) engineLevel = 0;

let unlockedStage = Number(localStorage.getItem("rooster_unlocked_stage"));
if (isNaN(unlockedStage) || unlockedStage < 1 || unlockedStage > 3) unlockedStage = 1;

let selectedStage = 1;
let bestScore = Number(localStorage.getItem("chickenStrikeBest") || 0);

function saveUserData() {
  localStorage.setItem("rooster_gold", String(userGold));
  localStorage.setItem("rooster_revives", String(userRevives));
  localStorage.setItem("rooster_weapon_level", String(weaponLevel));
  localStorage.setItem("rooster_has_shield", hasStartShield ? "1" : "0");
  localStorage.setItem("rooster_engine_level", String(engineLevel));
  localStorage.setItem("rooster_unlocked_stage", String(unlockedStage));
  updateLobbyUI();
}

// ==================== GAME STATE ====================
const keys = {};
let running = false;
let paused = false;
let lastTime = 0;
let gameTime = 0;
let spawnTimer = 0;
let score = 0;
let stageKills = 0;
let shake = 0;
let flashAlpha = 0;
let boss = null;
let bannerText = "";
let bannerTimer = 0;

// Player definition
const player = {
  x: 480,
  y: 470,
  w: 64,
  h: 56,
  baseSpeed: 360,
  speed: 360,
  vx: 0,
  tilt: 0,
  wingCycle: 0,
  cooldown: 0,
  baseCooldown: 0.16,
  lives: 3,
  invulnerable: 0,
  thrusterPulse: 0,
  hasShield: false,
  laserTimer: 0,
  spreadTimer: 0
};

let bullets = [];
let enemyBullets = [];
let planes = [];
let items = []; // Support drops: Coins, Revive token, Laser, Spread, Shield
let particles = [];
let debris = [];
let shockwaves = [];
let clouds = [];
let windStreaks = [];

// ==================== STAGE DEFINITIONS ====================
const STAGES = {
  1: {
    id: 1,
    name: "MÀN 1: BÌNH MINH NGOẠI Ô",
    tag: "MÀN 1: BÌNH MINH",
    targetKills: 15,
    rewardCoins: 50,
    skyTop: "#08142e",
    skyMid: "#183664",
    skyLow: "#32629b",
    skyHorizon: "#dfa46e",
    sunColor: "#ffeec2",
    hasBoss: false
  },
  2: {
    id: 2,
    name: "MÀN 2: HẺM NÚI HOÀNG HÔN",
    tag: "MÀN 2: HOÀNG HÔN",
    targetKills: 25,
    rewardCoins: 80,
    skyTop: "#170420",
    skyMid: "#3d0c34",
    skyLow: "#8f1d35",
    skyHorizon: "#f39c12",
    sunColor: "#ff7675",
    hasBoss: false
  },
  3: {
    id: 3,
    name: "MÀN 3: PHÁO ĐÀI BÃO ĐÊM",
    tag: "MÀN 3: TRÙM TITAN",
    targetKills: 15, // Plane kills before Boss spawns
    rewardCoins: 150,
    skyTop: "#02040a",
    skyMid: "#0d1024",
    skyLow: "#231138",
    skyHorizon: "#4b134f",
    sunColor: "#e84118",
    hasBoss: true
  }
};

// ==================== INITIALIZATION & LOBBY UI ====================
function initClouds() {
  clouds = [];
  for (let i = 0; i < 7; i++) {
    clouds.push({
      x: Math.random() * 1100 - 50,
      y: 30 + Math.random() * 130,
      scale: 0.7 + Math.random() * 0.5,
      speed: 6 + Math.random() * 6,
      layer: 0,
      opacity: 0.35 + Math.random() * 0.2
    });
  }
  for (let i = 0; i < 9; i++) {
    clouds.push({
      x: Math.random() * 1100 - 50,
      y: 100 + Math.random() * 190,
      scale: 1.1 + Math.random() * 0.7,
      speed: 15 + Math.random() * 12,
      layer: 1,
      opacity: 0.65 + Math.random() * 0.25
    });
  }
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

function updateLobbyUI() {
  lobbyGoldEl.textContent = userGold;
  lobbyRevivesEl.textContent = userRevives;
  coinCountEl.textContent = userGold;
  reviveCountEl.textContent = userRevives;
  itemReviveCountEl.textContent = userRevives;

  // Revive button status
  if (userRevives >= 3) {
    buyReviveBtn.textContent = "ĐÃ ĐẦY (3/3)";
    buyReviveBtn.disabled = true;
  } else {
    buyReviveBtn.textContent = "MUA (80 🪙)";
    buyReviveBtn.disabled = userGold < 80;
  }

  // Weapon upgrade status
  const weaponNames = [
    "",
    "Cấp 1: Đạn Thường",
    "Cấp 2: Đạn Đôi",
    "Cấp 3: Đạn Chùm 3 Hướng",
    "Cấp 4: Tia Laze Tối Thượng"
  ];
  const weaponCosts = [0, 120, 240, 450, 0];
  weaponLevelText.textContent = weaponNames[weaponLevel];
  if (weaponLevel >= 4) {
    upgradeWeaponBtn.textContent = "TỐI ĐA (MAX)";
    upgradeWeaponBtn.disabled = true;
  } else {
    const cost = weaponCosts[weaponLevel];
    upgradeWeaponBtn.textContent = `NÂNG CẤP (${cost} 🪙)`;
    upgradeWeaponBtn.disabled = userGold < cost;
  }

  // Start Shield status
  if (hasStartShield) {
    shieldStatusText.textContent = "Đã kích hoạt";
    buyShieldPermBtn.textContent = "ĐÃ SỞ HỮU";
    buyShieldPermBtn.disabled = true;
  } else {
    shieldStatusText.textContent = "Chưa kích hoạt";
    buyShieldPermBtn.textContent = "KÍCH HOẠT (100 🪙)";
    buyShieldPermBtn.disabled = userGold < 100;
  }

  // Engine upgrade status
  engineLevelText.textContent = `Cấp ${engineLevel}/3`;
  const engineCosts = [120, 220, 350];
  if (engineLevel >= 3) {
    upgradeEngineBtn.textContent = "TỐI ĐA (MAX)";
    upgradeEngineBtn.disabled = true;
  } else {
    const cost = engineCosts[engineLevel];
    upgradeEngineBtn.textContent = `NÂNG CẤP (${cost} 🪙)`;
    upgradeEngineBtn.disabled = userGold < cost;
  }

  // Stage unlock status
  stageCards.forEach((card, idx) => {
    const stageNum = idx + 1;
    card.classList.toggle("selected", selectedStage === stageNum);
    const isLocked = stageNum > unlockedStage;
    card.classList.toggle("locked", isLocked);
    if (stageNum === 2) lockStage2.hidden = !isLocked;
    if (stageNum === 3) lockStage3.hidden = !isLocked;
  });
}

// Stage selection handler
stageCards.forEach((card, idx) => {
  card.addEventListener("click", () => {
    const stageNum = idx + 1;
    if (stageNum <= unlockedStage) {
      selectedStage = stageNum;
      updateLobbyUI();
    }
  });
});

// Shop purchases
buyReviveBtn.addEventListener("click", () => {
  if (userGold >= 80 && userRevives < 3) {
    userGold -= 80;
    userRevives++;
    saveUserData();
  }
});

upgradeWeaponBtn.addEventListener("click", () => {
  const weaponCosts = [0, 120, 240, 450];
  const cost = weaponCosts[weaponLevel];
  if (weaponLevel < 4 && userGold >= cost) {
    userGold -= cost;
    weaponLevel++;
    saveUserData();
  }
});

buyShieldPermBtn.addEventListener("click", () => {
  if (!hasStartShield && userGold >= 100) {
    userGold -= 100;
    hasStartShield = true;
    saveUserData();
  }
});

upgradeEngineBtn.addEventListener("click", () => {
  const engineCosts = [120, 220, 350];
  const cost = engineCosts[engineLevel];
  if (engineLevel < 3 && userGold >= cost) {
    userGold -= cost;
    engineLevel++;
    saveUserData();
  }
});

// Tab navigation
tabCampaignBtn.addEventListener("click", () => {
  tabCampaignBtn.classList.add("active");
  tabHangarBtn.classList.remove("active");
  tabCampaignContent.hidden = false;
  tabHangarContent.hidden = true;
});

tabHangarBtn.addEventListener("click", () => {
  tabHangarBtn.classList.add("active");
  tabCampaignBtn.classList.remove("active");
  tabCampaignContent.hidden = true;
  tabHangarContent.hidden = false;
});

// Pause / Resume / Lobby
function showLobby() {
  running = false;
  paused = false;
  lobbyPanel.style.display = "flex";
  pausePanel.hidden = true;
  victoryPanel.hidden = true;
  gameOverPanel.hidden = true;
  bossHud.hidden = true;
  updateLobbyUI();
}

function togglePause() {
  if (!running && !paused) return;
  paused = !paused;
  pausePanel.hidden = !paused;
  if (!paused) {
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

pauseBtn.addEventListener("click", togglePause);
resumeButton.addEventListener("click", togglePause);
lobbyButton.addEventListener("click", showLobby);
victoryLobbyButton.addEventListener("click", showLobby);
gameOverLobbyButton.addEventListener("click", showLobby);

nextStageButton.addEventListener("click", () => {
  if (selectedStage < 3) selectedStage++;
  startMission();
});

// ==================== MISSION START & FLOW ====================
function startMission() {
  const stage = STAGES[selectedStage];
  hudStageTag.textContent = stage.tag;

  // Apply engine upgrades to speed & fire rate
  player.speed = player.baseSpeed + engineLevel * 45;
  player.baseCooldown = Math.max(0.09, 0.16 - engineLevel * 0.02);
  player.cooldown = 0;
  player.lives = 3;
  player.invulnerable = 1.2;
  player.x = 480;
  player.y = 470;
  player.vx = 0;
  player.tilt = 0;
  player.hasShield = hasStartShield;
  player.laserTimer = (weaponLevel >= 4) ? 999999 : 0;
  player.spreadTimer = (weaponLevel === 3) ? 999999 : 0;

  bullets = [];
  enemyBullets = [];
  planes = [];
  items = [];
  particles = [];
  debris = [];
  shockwaves = [];
  boss = null;
  stageKills = 0;
  spawnTimer = 0.5;
  gameTime = 0;

  bannerText = stage.name;
  bannerTimer = 2.8;

  scoreEl.textContent = score;
  livesEl.textContent = "♥♥♥";
  bossHud.hidden = true;

  lobbyPanel.style.display = "none";
  gameOverPanel.hidden = true;
  pausePanel.hidden = true;
  victoryPanel.hidden = true;

  running = true;
  paused = false;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", startMission);
restartButton.addEventListener("click", startMission);

// ==================== WEAPONS & PROJECTILES ====================
function shoot() {
  if (!running || paused || player.cooldown > 0) return;

  const isLaser = player.laserTimer > 0;
  const isSpread = player.spreadTimer > 0;

  if (isLaser) {
    // Hyper Laser beam column
    bullets.push({
      type: "laser",
      x: player.x,
      y: player.y - 45,
      w: 18,
      h: 460,
      damage: 2.5,
      life: 0.12
    });
    player.cooldown = 0.08;
  } else if (isSpread) {
    // 3-way or 5-way spread
    const angles = [-0.28, -0.12, 0, 0.12, 0.28];
    angles.forEach(ang => {
      bullets.push({
        type: "egg",
        x: player.x,
        y: player.y - 30,
        vx: Math.sin(ang + player.tilt * 0.5) * 620,
        vy: -Math.cos(ang + player.tilt * 0.5) * 650,
        r: 7.5,
        damage: 1
      });
    });
    player.cooldown = player.baseCooldown * 1.1;
  } else if (weaponLevel === 2) {
    // Dual eggs
    [-12, 12].forEach(offset => {
      bullets.push({
        type: "egg",
        x: player.x + offset,
        y: player.y - 30,
        vx: player.tilt * 80,
        vy: -660,
        r: 7.5,
        damage: 1
      });
    });
    player.cooldown = player.baseCooldown;
  } else {
    // Single powerful egg
    bullets.push({
      type: "egg",
      x: player.x,
      y: player.y - 30,
      vx: player.tilt * 80,
      vy: -660,
      r: 8.5,
      damage: 1
    });
    player.cooldown = player.baseCooldown;
  }

  // Muzzle flash sparks
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const speed = 70 + Math.random() * 80;
    particles.push({
      x: player.x + (Math.random() - 0.5) * 6,
      y: player.y - 28,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.18 + Math.random() * 0.1,
      maxLife: 0.28,
      size: 4,
      color: isLaser ? "#00d2d3" : "#fff0a8",
      type: "spark"
    });
  }
}

// ==================== ENEMIES & BOSS ====================
function spawnPlane() {
  const currentStage = STAGES[selectedStage];

  // In Stage 3, after 15 plane kills, spawn Titan Boss
  if (currentStage.hasBoss && stageKills >= currentStage.targetKills && !boss) {
    spawnTitanBoss();
    return;
  }

  // Standard enemy fighters
  const isHeavy = (selectedStage >= 2 && Math.random() < 0.35) || (selectedStage === 3 && Math.random() < 0.5);
  const size = isHeavy ? 54 + Math.random() * 10 : 38 + Math.random() * 12;
  const fromLeft = Math.random() > 0.5;

  planes.push({
    x: fromLeft ? -70 : 1030,
    y: 65 + Math.random() * 210,
    targetY: 65 + Math.random() * 210,
    vx: (fromLeft ? 1 : -1) * (85 + Math.random() * 75 + score * 0.5),
    vy: 0,
    w: size * 1.6,
    h: size,
    isHeavy,
    maxHp: isHeavy ? (selectedStage === 3 ? 4 : 3) : 1,
    hp: isHeavy ? (selectedStage === 3 ? 4 : 3) : 1,
    canShoot: selectedStage >= 2 && Math.random() < 0.45,
    shootTimer: 1.0 + Math.random() * 2.0,
    strobeTimer: Math.random() * 2
  });
}

function spawnTitanBoss() {
  boss = {
    x: 480,
    y: -120,
    targetY: 130,
    vx: 85,
    w: 220,
    h: 100,
    maxHp: 85,
    hp: 85,
    shootTimer: 1.2,
    missileTimer: 3.5,
    strobeTimer: 0
  };
  bossHud.hidden = false;
  bossBarFill.style.width = "100%";
  bannerText = "⚠ CẢNH BÁO: SIÊU PHÁO ĐÀI TITAN XUẤT HIỆN! ⚠";
  bannerTimer = 3.5;
  shake = 10;
}

// Drops when plane destroyed
function spawnItemDrop(x, y) {
  const rand = Math.random();
  if (rand < 0.45) {
    // Gold Coin (+10 coins)
    items.push({ x, y, vy: 75, type: "gold", val: 10, r: 12, rot: 0 });
  } else if (rand < 0.6) {
    // Revive Token (1-UP)
    items.push({ x, y, vy: 65, type: "revive", r: 15, rot: 0 });
  } else if (rand < 0.76) {
    // Laser Beam (12s)
    items.push({ x, y, vy: 65, type: "laser", r: 15, rot: 0 });
  } else if (rand < 0.88) {
    // Spread Shot (15s)
    items.push({ x, y, vy: 65, type: "spread", r: 15, rot: 0 });
  } else if (rand < 0.95) {
    // Energy Shield
    items.push({ x, y, vy: 65, type: "shield", r: 15, rot: 0 });
  } else {
    // Screen Bomb
    items.push({ x, y, vy: 65, type: "bomb", r: 15, rot: 0 });
  }
}

// ==================== EXPLOSIONS & FX ====================
function createExplosion(x, y, scale = 1, colorTint = "#ff9520") {
  shockwaves.push({ x, y, r: 10, maxR: 55 * scale, alpha: 0.9, life: 0.45 });

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

  const smokeCount = Math.floor(14 * scale);
  for (let i = 0; i < smokeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (15 + Math.random() * 90) * scale;
    particles.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 45,
      life: 0.6 + Math.random() * 0.7,
      maxLife: 1.3,
      size: (16 + Math.random() * 20) * scale,
      grow: 35 * scale,
      type: "smoke"
    });
  }

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

// Stage Victory Handler
function completeStage() {
  running = false;
  const stage = STAGES[selectedStage];
  const reward = stage.rewardCoins;
  userGold += reward;

  // Unlock next stage
  if (selectedStage === unlockedStage && unlockedStage < 3) {
    unlockedStage++;
  }
  saveUserData();

  document.getElementById("clearRewardCoins").textContent = `+${reward} 🪙`;
  document.getElementById("victoryScore").textContent = score;
  victoryPanel.hidden = false;
  nextStageButton.hidden = selectedStage >= 3;
}

// Player Defeat / Revive Handler
function playerDied() {
  if (userRevives > 0) {
    // USE REVIVE TOKEN!
    userRevives--;
    saveUserData();
    player.lives = 3;
    player.invulnerable = 3.5;
    player.hasShield = true;
    shake = 18;
    flashAlpha = 0.5;

    // Massive screen wipe shockwave
    shockwaves.push({ x: player.x, y: player.y, r: 10, maxR: 450, alpha: 1.0, life: 0.6 });
    enemyBullets = [];
    planes.forEach(p => p.hp--);
    bannerText = "✨ ĐÃ KÍCH HOẠT XU HỒI SINH! BẤT TỬ 3.5S ✨";
    bannerTimer = 3.0;
    livesEl.textContent = "♥♥♥";
  } else {
    // GAME OVER
    running = false;
    document.getElementById("finalScore").textContent = score;
    document.getElementById("finalCoins").textContent = `${userGold} 🪙`;
    gameOverPanel.hidden = false;
  }
}

// ==================== MAIN UPDATE LOOP ====================
function update(dt) {
  gameTime += dt;

  // Background environment
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

  if (bannerTimer > 0) bannerTimer -= dt;

  if (!running || paused) return;

  // Update buffs & HUD badges
  if (player.laserTimer > 0 && weaponLevel < 4) {
    player.laserTimer -= dt;
    buffLaser.hidden = false;
    buffLaserTime.textContent = `${Math.ceil(player.laserTimer)}s`;
  } else {
    buffLaser.hidden = weaponLevel < 4;
    buffLaserTime.textContent = "MAX";
  }

  if (player.spreadTimer > 0 && weaponLevel !== 3) {
    player.spreadTimer -= dt;
    buffSpread.hidden = false;
    buffSpreadTime.textContent = `${Math.ceil(player.spreadTimer)}s`;
  } else {
    buffSpread.hidden = weaponLevel !== 3;
    buffSpreadTime.textContent = "MAX";
  }

  buffShield.hidden = !player.hasShield;

  // Player input & banking physics
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

  if (keys.ArrowUp || keys.KeyW || keys.touchUp) player.y -= player.speed * dt;
  if (keys.ArrowDown || keys.KeyS || keys.touchDown) player.y += player.speed * dt;

  player.vx += (moveDir * player.speed - player.vx) * 14 * dt;
  player.x += player.vx * dt;
  player.tilt += (targetTilt - player.tilt) * 12 * dt;
  player.x = Math.max(42, Math.min(918, player.x));
  player.y = Math.max(player.h / 2, Math.min(540 - player.h / 2, player.y));

  player.cooldown -= dt;
  player.invulnerable -= dt;
  if (moveDir !== 0) player.wingCycle += dt * 10;

  if (keys.Space || keys.touchShoot) shoot();

  // Update player bullets
  bullets.forEach(b => {
    if (b.type === "laser") {
      b.x = player.x;
      b.y = player.y - 45;
      b.life -= dt;
    } else {
      b.x += (b.vx || 0) * dt;
      b.y += b.vy * dt;
      if (Math.random() < 0.6) {
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
    }
  });
  bullets = bullets.filter(b => b.type === "laser" ? b.life > 0 : b.y > -30);

  // Update enemy bullets
  enemyBullets.forEach(eb => {
    eb.x += eb.vx * dt;
    eb.y += eb.vy * dt;
  });
  enemyBullets = enemyBullets.filter(eb => eb.y < 560 && eb.x > -20 && eb.x < 980);

  // Spawning logic
  const currentStage = STAGES[selectedStage];
  if (!boss && (currentStage.hasBoss ? stageKills < currentStage.targetKills : stageKills < currentStage.targetKills)) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnPlane();
      spawnTimer = Math.max(0.4, 1.25 - score * 0.008) + Math.random() * 0.5;
    }
  } else if (!currentStage.hasBoss && stageKills >= currentStage.targetKills && planes.length === 0) {
    completeStage();
    return;
  }

  // Update planes
  planes.forEach(p => {
    p.x += p.vx * dt;
    p.strobeTimer = (p.strobeTimer + dt) % 1.2;
    p.y += (p.targetY - p.y) * 2.5 * dt;

    // Enemy shooting
    if (p.canShoot) {
      p.shootTimer -= dt;
      if (p.shootTimer <= 0) {
        p.shootTimer = 2.2 + Math.random() * 1.5;
        const angle = Math.atan2(player.y - p.y, player.x - p.x);
        enemyBullets.push({
          x: p.x,
          y: p.y + 15,
          vx: Math.cos(angle) * 220,
          vy: Math.sin(angle) * 220,
          r: 5
        });
      }
    }

    // Damage smoke
    if (p.hp < p.maxHp) {
      particles.push({
        x: p.x - (p.vx > 0 ? 25 : -25),
        y: p.y,
        vx: -p.vx * 0.2 + (Math.random() - 0.5) * 20,
        vy: -20 - Math.random() * 30,
        life: 0.5,
        maxLife: 0.8,
        size: 9 + Math.random() * 10,
        grow: 20,
        type: "smoke"
      });
    }
  });
  planes = planes.filter(p => p.x > -120 && p.x < 1080);

  // Update Titan Boss
  if (boss) {
    if (boss.y < boss.targetY) boss.y += 60 * dt;

    boss.x += boss.vx * dt;
    if (boss.x > 750) boss.vx = -Math.abs(boss.vx);
    if (boss.x < 210) boss.vx = Math.abs(boss.vx);

    boss.strobeTimer = (boss.strobeTimer + dt) % 0.8;

    // Boss main guns
    boss.shootTimer -= dt;
    if (boss.shootTimer <= 0) {
      boss.shootTimer = 1.1;
      [-70, -25, 25, 70].forEach(gunOffset => {
        enemyBullets.push({
          x: boss.x + gunOffset,
          y: boss.y + 40,
          vx: (gunOffset / 70) * 80,
          vy: 240,
          r: 6.5
        });
      });
    }

    // Boss missiles
    boss.missileTimer -= dt;
    if (boss.missileTimer <= 0) {
      boss.missileTimer = 3.2;
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      enemyBullets.push({
        x: boss.x,
        y: boss.y + 30,
        vx: Math.cos(angle) * 310,
        vy: Math.sin(angle) * 310,
        r: 9
      });
      createExplosion(boss.x, boss.y + 30, 0.4, "#ff4757");
    }

    // Update Boss HP Bar
    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    bossBarFill.style.width = `${hpRatio * 100}%`;

    // Boss damaged smoke plumes
    if (boss.hp < boss.maxHp * 0.6) {
      particles.push({
        x: boss.x + (Math.random() - 0.5) * 80,
        y: boss.y + 10,
        vx: (Math.random() - 0.5) * 30,
        vy: -30,
        life: 0.6,
        maxLife: 1.0,
        size: 16,
        grow: 28,
        type: "smoke"
      });
    }
  }

  // Update Item Drops
  items.forEach(it => {
    it.y += it.vy * dt;
    it.rot += dt * 3;

    // Magnetic pull towards player if close
    const dx = player.x - it.x;
    const dy = player.y - it.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 140) {
      it.x += (dx / dist) * 260 * dt;
      it.y += (dy / dist) * 260 * dt;
    }

    // Pickup collision
    if (dist < player.w * 0.5 + it.r) {
      it.picked = true;
      if (it.type === "gold") {
        userGold += it.val;
        score += 15;
        saveUserData();
      } else if (it.type === "revive") {
        if (player.lives < 3) {
          player.lives = Math.min(3, player.lives + 1);
          livesEl.textContent = "♥".repeat(player.lives) + "♡".repeat(3 - player.lives);
        } else {
          userRevives = Math.min(3, userRevives + 1);
          saveUserData();
        }
        bannerText = "🪙+ NHẶT ĐƯỢC XU HỒI SINH!";
        bannerTimer = 2.0;
      } else if (it.type === "laser") {
        player.laserTimer = 12;
        bannerText = "⚡ TIA LAZE HỦY DIỆT ĐƯỢC KÍCH HOẠT (12s)!";
        bannerTimer = 2.0;
      } else if (it.type === "spread") {
        player.spreadTimer = 15;
        bannerText = "◈ ĐẠN CHÙM 5 HƯỚNG KÍCH HOẠT (15s)!";
        bannerTimer = 2.0;
      } else if (it.type === "shield") {
        player.hasShield = true;
        bannerText = "🛡️ KHIÊN NĂNG LƯỢNG KÍCH HOẠT!";
        bannerTimer = 2.0;
      } else if (it.type === "bomb") {
        // Wipe screen
        createExplosion(480, 270, 2.8, "#ffeaa7");
        planes.forEach(p => {
          createExplosion(p.x, p.y, 0.9);
          score += 10;
        });
        planes = [];
        enemyBullets = [];
        if (boss) boss.hp -= 20;
        shake = 22;
        flashAlpha = 0.6;
        bannerText = "💣 BOM HẠT NHÂN ĐÃ QUÉT SẠCH KẺ ĐỊCH!";
        bannerTimer = 2.0;
      }
      createExplosion(it.x, it.y, 0.45, "#feca57");
    }
  });
  items = items.filter(it => !it.picked && it.y < 560);

  // Bullets vs Planes & Boss
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    // Check vs normal planes
    for (let j = planes.length - 1; j >= 0; j--) {
      const p = planes[j];
      const hitTest = b.type === "laser"
        ? (Math.abs(b.x - p.x) < p.w * 0.5 + 8 && p.y < player.y)
        : (Math.abs(b.x - p.x) < p.w * 0.52 && Math.abs(b.y - p.y) < p.h * 0.52);

      if (hitTest) {
        if (b.type !== "laser") bullets.splice(i, 1);
        p.hp -= b.damage || 1;
        createExplosion(p.x, p.y, 0.35, "#ffe57f");
        shake = Math.max(shake, 3);

        if (p.hp <= 0) {
          createExplosion(p.x, p.y, p.isHeavy ? 1.4 : 1.0, "#ff841f");
          spawnItemDrop(p.x, p.y);
          planes.splice(j, 1);
          stageKills++;
          score += p.isHeavy ? 25 : 10;
          scoreEl.textContent = score;
          shake = Math.max(shake, p.isHeavy ? 10 : 7);
          flashAlpha = 0.2;
        }
        break;
      }
    }

    // Check vs Boss
    if (boss) {
      const bossHit = b.type === "laser"
        ? (Math.abs(b.x - boss.x) < boss.w * 0.45 && boss.y < player.y)
        : (Math.abs(b.x - boss.x) < boss.w * 0.48 && Math.abs(b.y - boss.y) < boss.h * 0.48);

      if (bossHit) {
        if (b.type !== "laser") bullets.splice(i, 1);
        boss.hp -= b.damage || 1;
        createExplosion(b.x, b.y, 0.4, "#ff4757");
        shake = Math.max(shake, 4);

        if (boss.hp <= 0) {
          // Boss Defeated!
          createExplosion(boss.x, boss.y, 3.2, "#ff9f43");
          for (let k = 0; k < 6; k++) {
            spawnItemDrop(boss.x + (Math.random() - 0.5) * 120, boss.y + (Math.random() - 0.5) * 60);
          }
          boss = null;
          bossHud.hidden = true;
          score += 250;
          scoreEl.textContent = score;
          shake = 26;
          flashAlpha = 0.6;
          bannerText = "🏆 SIÊU PHÁO ĐÀI TITAN BỊ TIÊU DIỆT! 🏆";
          bannerTimer = 3.0;
          setTimeout(completeStage, 2200);
          break;
        }
      }
    }
  }

  // Player collisions (enemy bullets & planes)
  if (player.invulnerable <= 0) {
    // Enemy Bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      if (Math.abs(eb.x - player.x) < 24 && Math.abs(eb.y - player.y) < 24) {
        enemyBullets.splice(i, 1);
        if (player.hasShield) {
          player.hasShield = false;
          createExplosion(player.x, player.y, 0.8, "#54a0ff");
          shake = 8;
        } else {
          player.lives--;
          player.invulnerable = 1.9;
          shake = 14;
          createExplosion(player.x, player.y, 1.0, "#ff3b30");
          livesEl.textContent = "♥".repeat(Math.max(0, player.lives)) + "♡".repeat(Math.max(0, 3 - player.lives));
          if (player.lives <= 0) playerDied();
        }
        break;
      }
    }

    // Direct Plane Crash
    for (let i = planes.length - 1; i >= 0; i--) {
      const p = planes[i];
      if (Math.abs(p.x - player.x) < (p.w * 0.5 + 24) && Math.abs(p.y - player.y) < (p.h * 0.5 + 20)) {
        createExplosion(p.x, p.y, 1.2);
        planes.splice(i, 1);

        if (player.hasShield) {
          player.hasShield = false;
          createExplosion(player.x, player.y, 0.9, "#54a0ff");
          shake = 10;
        } else {
          player.lives--;
          player.invulnerable = 1.9;
          shake = 16;
          createExplosion(player.x, player.y, 1.2, "#ff3b30");
          livesEl.textContent = "♥".repeat(Math.max(0, player.lives)) + "♡".repeat(Math.max(0, 3 - player.lives));
          if (player.lives <= 0) playerDied();
        }
        break;
      }
    }
  }

  // Update particles
  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.grow) p.size += p.grow * dt;
    if (p.type === "spark") p.vy += 220 * dt;
    if (p.type === "smoke") p.vy -= 18 * dt;
    p.life -= dt;
  });
  particles = particles.filter(p => p.life > 0);

  // Update debris
  debris.forEach(d => {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vy += 280 * dt;
    d.rot += d.vRot * dt;
    d.life -= dt;
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

// ==================== RENDERING SYSTEM ====================
function drawBackground() {
  const stage = STAGES[selectedStage];

  // 1. Sky Gradient based on current Stage
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 540);
  skyGrad.addColorStop(0, stage.skyTop);
  skyGrad.addColorStop(0.35, stage.skyMid);
  skyGrad.addColorStop(0.7, stage.skyLow);
  skyGrad.addColorStop(1, stage.skyHorizon);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 960, 540);

  // 2. Realistic Celestial Body (Sun in Stage 1/2, Blood Moon in Stage 3)
  const sunX = 740;
  const sunY = 95;

  if (selectedStage === 3) {
    // Blood Moon with dark red glow & eerie corona
    const moonGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 160);
    moonGlow.addColorStop(0, "rgba(235, 77, 75, 0.65)");
    moonGlow.addColorStop(1, "rgba(75, 19, 79, 0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 160, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff7979";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
    ctx.fill();

    // Occasional lightning strike in Stage 3
    if (Math.random() < 0.008) {
      flashAlpha = 0.35;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sunX - 100, 0);
      ctx.lineTo(sunX - 60, 160);
      ctx.lineTo(sunX - 90, 220);
      ctx.lineTo(sunX - 40, 360);
      ctx.stroke();
    }
  } else {
    // Sun
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 260);
    sunGlow.addColorStop(0, "rgba(255, 250, 220, 0.8)");
    sunGlow.addColorStop(0.2, "rgba(255, 215, 140, 0.35)");
    sunGlow.addColorStop(1, "rgba(255, 150, 80, 0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(sunX - 260, sunY - 260, 520, 520);

    ctx.fillStyle = stage.sunColor;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Wind Streaks
  ctx.lineWidth = 1;
  windStreaks.forEach(w => {
    ctx.strokeStyle = `rgba(255, 255, 255, ${w.alpha})`;
    ctx.beginPath();
    ctx.moveTo(w.x, w.y);
    ctx.lineTo(w.x + w.len, w.y);
    ctx.stroke();
  });

  // 4. Parallax Mountain Ridges
  ctx.fillStyle = selectedStage === 3 ? "rgba(10, 8, 22, 0.85)" : "rgba(30, 48, 76, 0.45)";
  ctx.beginPath();
  ctx.moveTo(0, 540);
  ctx.lineTo(0, 420); ctx.lineTo(90, 370); ctx.lineTo(190, 415);
  ctx.lineTo(310, 350); ctx.lineTo(440, 425); ctx.lineTo(580, 340);
  ctx.lineTo(720, 410); ctx.lineTo(840, 360); ctx.lineTo(960, 395);
  ctx.lineTo(960, 540);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = selectedStage === 3 ? "rgba(6, 4, 14, 0.95)" : "rgba(16, 28, 48, 0.8)";
  ctx.beginPath();
  ctx.moveTo(0, 540);
  ctx.lineTo(0, 460); ctx.lineTo(130, 410); ctx.lineTo(260, 455);
  ctx.lineTo(400, 400); ctx.lineTo(520, 460); ctx.lineTo(670, 390);
  ctx.lineTo(810, 445); ctx.lineTo(960, 415); ctx.lineTo(960, 540);
  ctx.closePath();
  ctx.fill();

  // Clouds
  clouds.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale * 0.65);
    const puffs = [
      { x: -35, y: 5, r: 24 },
      { x: -15, y: -8, r: 32 },
      { x: 15, y: -12, r: 38 },
      { x: 42, y: -4, r: 30 },
      { x: 62, y: 8, r: 22 }
    ];
    puffs.forEach(p => {
      const puffGrad = ctx.createRadialGradient(p.x + 8, p.y - 12, 4, p.x, p.y, p.r);
      puffGrad.addColorStop(0, `rgba(255, 248, 238, ${c.opacity})`);
      puffGrad.addColorStop(0.7, `rgba(180, 195, 220, ${c.opacity * 0.6})`);
      puffGrad.addColorStop(1, `rgba(140, 160, 190, 0)`);
      ctx.fillStyle = puffGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  });
}

// Draw Player Rooster
function drawChicken() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.tilt);

  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 14) % 2) {
    ctx.globalAlpha = 0.4;
  }

  // Energy Shield Aura
  if (player.hasShield) {
    ctx.save();
    ctx.strokeStyle = "rgba(84, 160, 255, 0.85)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#00d2d3";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();

    const shieldFill = ctx.createRadialGradient(0, 0, 20, 0, 0, 42);
    shieldFill.addColorStop(0, "rgba(84, 160, 255, 0)");
    shieldFill.addColorStop(1, "rgba(0, 210, 211, 0.25)");
    ctx.fillStyle = shieldFill;
    ctx.fill();
    ctx.restore();
  }

  // Thruster Flames
  const pulse = Math.sin(player.thrusterPulse) * 4;
  const flameLen = 28 + pulse;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  [-18, 18].forEach(sideX => {
    const thrusterGrad = ctx.createLinearGradient(sideX, 16, sideX, 16 + flameLen);
    thrusterGrad.addColorStop(0, "rgba(100, 200, 255, 0.95)");
    thrusterGrad.addColorStop(0.4, "rgba(255, 180, 40, 0.85)");
    thrusterGrad.addColorStop(1, "rgba(255, 60, 10, 0)");
    ctx.fillStyle = thrusterGrad;
    ctx.beginPath();
    ctx.moveTo(sideX - 6, 16);
    ctx.quadraticCurveTo(sideX - 7, 16 + flameLen * 0.6, sideX, 16 + flameLen);
    ctx.quadraticCurveTo(sideX + 7, 16 + flameLen * 0.6, sideX + 6, 16);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();

  // Thruster Pods
  [-18, 18].forEach(sideX => {
    const podGrad = ctx.createLinearGradient(sideX - 6, 0, sideX + 6, 0);
    podGrad.addColorStop(0, "#3a4659");
    podGrad.addColorStop(0.5, "#d4dde8");
    podGrad.addColorStop(1, "#253140");
    ctx.fillStyle = podGrad;
    ctx.beginPath();
    ctx.roundRect(sideX - 6, 4, 12, 16, 3);
    ctx.fill();
  });

  // Tail Feathers
  const tailSway = -player.tilt * 22 + Math.sin(player.wingCycle * 0.5) * 4;
  const tailGrad = ctx.createLinearGradient(-15, -5, -45 + tailSway, -25);
  tailGrad.addColorStop(0, "#173b32");
  tailGrad.addColorStop(0.5, "#256653");
  tailGrad.addColorStop(1, "#0f172a");
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.bezierCurveTo(-28, 4, -48 + tailSway, -8, -50 + tailSway, -28);
  ctx.bezierCurveTo(-42 + tailSway, -12, -26, -2, -8, -2);
  ctx.closePath();
  ctx.fill();

  // Body Plumage
  const bodyGrad = ctx.createRadialGradient(-6, -6, 4, 0, 0, 32);
  bodyGrad.addColorStop(0, "#ffffff");
  bodyGrad.addColorStop(0.35, "#fff2cf");
  bodyGrad.addColorStop(0.75, "#e5b868");
  bodyGrad.addColorStop(1, "#8e5720");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  const flapAngle = Math.sin(player.wingCycle) * 0.16 + Math.abs(player.tilt) * 0.25;

  ctx.save();
  ctx.translate(-16, 2);
  ctx.rotate(-0.25 - flapAngle);
  ctx.fillStyle = "#dfa956";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-18, -12, -32, -4, -36, 12);
  ctx.bezierCurveTo(-26, 18, -12, 14, 0, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(16, 2);
  ctx.rotate(0.25 + flapAngle);
  ctx.fillStyle = "#ebd08f";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(18, -12, 32, -4, 36, 12);
  ctx.bezierCurveTo(26, 18, 12, 14, 0, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Comb & Wattles
  const combGrad = ctx.createLinearGradient(0, -36, 0, -14);
  combGrad.addColorStop(0, "#ff3b30");
  combGrad.addColorStop(1, "#800512");
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

  ctx.beginPath();
  ctx.ellipse(14, 11, 6, 10, 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Beak & Eye
  ctx.fillStyle = "#f59f00";
  ctx.beginPath();
  ctx.moveTo(15, -6);
  ctx.quadraticCurveTo(28, -7, 36, 2);
  ctx.lineTo(24, 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffea79";
  ctx.beginPath();
  ctx.arc(8, -8, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(8.5, -8, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Aviator Goggles
  ctx.strokeStyle = "#c59b27";
  ctx.lineWidth = 2.4;
  ctx.fillStyle = "rgba(20, 30, 48, 0.75)";
  ctx.beginPath();
  ctx.roundRect(-4, -18, 18, 9, 3);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// Draw Enemy Aircraft
function drawPlane(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const facing = p.vx > 0 ? 1 : -1;
  ctx.scale(facing, 1);

  const scale = p.isHeavy ? 1.3 : 1.0;
  ctx.scale(scale, scale);

  // Jet exhaust
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(255, 140, 30, 0.85)";
  ctx.beginPath();
  ctx.moveTo(-40, -4);
  ctx.lineTo(-65, 0);
  ctx.lineTo(-40, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Fuselage
  const fuseGrad = ctx.createLinearGradient(0, -12, 0, 12);
  fuseGrad.addColorStop(0, p.isHeavy ? "#475569" : "#2c3e50");
  fuseGrad.addColorStop(0.5, p.isHeavy ? "#64748b" : "#4a6572");
  fuseGrad.addColorStop(1, "#0b1015");
  ctx.fillStyle = fuseGrad;

  ctx.beginPath();
  ctx.moveTo(-42, -5);
  ctx.lineTo(-32, -9);
  ctx.lineTo(18, -10);
  ctx.quadraticCurveTo(46, -6, 52, 0);
  ctx.quadraticCurveTo(46, 6, 18, 9);
  ctx.lineTo(-32, 8);
  ctx.lineTo(-42, 5);
  ctx.closePath();
  ctx.fill();

  // Cockpit glass
  ctx.fillStyle = "rgba(100, 210, 255, 0.85)";
  ctx.beginPath();
  ctx.moveTo(6, -8);
  ctx.quadraticCurveTo(18, -17, 30, -7);
  ctx.lineTo(28, -2);
  ctx.lineTo(4, -2);
  ctx.closePath();
  ctx.fill();

  // Wing
  ctx.fillStyle = p.isHeavy ? "#64748b" : "#34495e";
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.lineTo(4, 36);
  ctx.lineTo(18, 34);
  ctx.lineTo(14, 2);
  ctx.closePath();
  ctx.fill();

  // Navigation light
  if (p.strobeTimer < 0.6) {
    ctx.fillStyle = facing > 0 ? "#00ff66" : "#ff2a2a";
    ctx.beginPath();
    ctx.arc(10, 35, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Health bar for heavy planes
  if (p.isHeavy && p.hp > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(-22, -26, 44, 5);
    ctx.fillStyle = p.hp > 1 ? "#2ecc71" : "#e74c3c";
    ctx.fillRect(-21, -25, (42 * (p.hp / p.maxHp)), 3);
  }

  ctx.restore();
}

// Draw Titan Boss
function drawBoss(b) {
  ctx.save();
  ctx.translate(b.x, b.y);

  // 4 Jet Thrusters
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  [-75, -35, 35, 75].forEach(tx => {
    ctx.fillStyle = "rgba(255, 80, 20, 0.9)";
    ctx.beginPath();
    ctx.moveTo(tx - 8, -45);
    ctx.lineTo(tx, -80);
    ctx.lineTo(tx + 8, -45);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();

  // Giant Heavy Armor Wings
  const wingGrad = ctx.createLinearGradient(0, -30, 0, 50);
  wingGrad.addColorStop(0, "#2c3e50");
  wingGrad.addColorStop(0.5, "#4a5568");
  wingGrad.addColorStop(1, "#1a202c");
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(0, -45);
  ctx.lineTo(-110, 10);
  ctx.lineTo(-100, 35);
  ctx.lineTo(0, 50);
  ctx.lineTo(100, 35);
  ctx.lineTo(110, 10);
  ctx.closePath();
  ctx.fill();

  // Central Command Citadel
  const citGrad = ctx.createLinearGradient(-30, 0, 30, 0);
  citGrad.addColorStop(0, "#1f2937");
  citGrad.addColorStop(0.5, "#4b5563");
  citGrad.addColorStop(1, "#111827");
  ctx.fillStyle = citGrad;
  ctx.beginPath();
  ctx.roundRect(-40, -30, 80, 75, 10);
  ctx.fill();

  // Red Glowing Eye / Core
  ctx.fillStyle = "#ff4757";
  ctx.shadowColor = "#ff4757";
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(0, 5, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Heavy Cannons
  ctx.fillStyle = "#0f172a";
  [-70, -25, 25, 70].forEach(cx => {
    ctx.fillRect(cx - 5, 20, 10, 32);
  });

  ctx.restore();
}

// Draw Item Drops
function drawItems() {
  items.forEach(it => {
    ctx.save();
    ctx.translate(it.x, it.y);

    // Glowing aura
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, it.r + 6);
    let auraColor = "#feca57";
    if (it.type === "revive") auraColor = "#48dbfb";
    if (it.type === "laser") auraColor = "#00d2d3";
    if (it.type === "spread") auraColor = "#ff9f43";
    if (it.type === "shield") auraColor = "#54a0ff";
    if (it.type === "bomb") auraColor = "#ff6b6b";

    aura.addColorStop(0, auraColor);
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, it.r + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Circle base
    ctx.fillStyle = "rgba(10, 20, 35, 0.9)";
    ctx.strokeStyle = auraColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, it.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Icon glyph
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";

    if (it.type === "gold") ctx.fillText("🪙", 0, 1);
    else if (it.type === "revive") ctx.fillText("♥+", 0, 1);
    else if (it.type === "laser") ctx.fillText("⚡", 0, 1);
    else if (it.type === "spread") ctx.fillText("◈", 0, 1);
    else if (it.type === "shield") ctx.fillText("🛡️", 0, 1);
    else if (it.type === "bomb") ctx.fillText("💣", 0, 1);

    ctx.restore();
  });
}

// Draw Bullets & Lasers
function drawBullets() {
  bullets.forEach(b => {
    if (b.type === "laser") {
      // Hyper Laser Beam
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const beamGrad = ctx.createLinearGradient(b.x - b.w, 0, b.x + b.w, 0);
      beamGrad.addColorStop(0, "rgba(0, 210, 211, 0)");
      beamGrad.addColorStop(0.35, "rgba(0, 210, 211, 0.85)");
      beamGrad.addColorStop(0.5, "#ffffff");
      beamGrad.addColorStop(0.65, "rgba(0, 210, 211, 0.85)");
      beamGrad.addColorStop(1, "rgba(0, 210, 211, 0)");
      ctx.fillStyle = beamGrad;
      ctx.fillRect(b.x - b.w, 0, b.w * 2, b.y);

      // Core glow line
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(b.x, 0);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    } else {
      // 3D Egg projectile
      ctx.save();
      ctx.translate(b.x, b.y);
      const eggGrad = ctx.createRadialGradient(-2.5, -3, 1, 0, 0, b.r * 1.3);
      eggGrad.addColorStop(0, "#ffffff");
      eggGrad.addColorStop(0.4, "#fff7dc");
      eggGrad.addColorStop(0.8, "#f5dc9e");
      eggGrad.addColorStop(1, "#b38634");
      ctx.fillStyle = eggGrad;
      ctx.beginPath();
      ctx.moveTo(0, -b.r * 1.35);
      ctx.bezierCurveTo(b.r * 0.95, -b.r * 1.1, b.r * 0.9, b.r * 0.8, 0, b.r * 1.15);
      ctx.bezierCurveTo(-b.r * 0.9, b.r * 0.8, -b.r * 0.95, -b.r * 1.1, 0, -b.r * 1.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });

  // Enemy Bullets (Red Plasma spheres)
  enemyBullets.forEach(eb => {
    ctx.save();
    ctx.translate(eb.x, eb.y);
    ctx.globalCompositeOperation = "lighter";
    const ebGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, eb.r);
    ebGrad.addColorStop(0, "#ffffff");
    ebGrad.addColorStop(0.5, "#ff4757");
    ebGrad.addColorStop(1, "rgba(255, 71, 87, 0)");
    ctx.fillStyle = ebGrad;
    ctx.beginPath();
    ctx.arc(0, 0, eb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// Master Draw Loop
function draw() {
  ctx.save();
  if (shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  drawBackground();
  drawBullets();
  drawItems();
  planes.forEach(drawPlane);
  if (boss) drawBoss(boss);
  if (running || player.lives > 0) drawChicken();

  // Particles & Debris
  debris.forEach(d => {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillStyle = "#334155";
    ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
    ctx.restore();
  });

  particles.forEach(p => {
    const normLife = Math.max(0, p.life / p.maxLife);
    if (p.type === "fireball") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const rad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      rad.addColorStop(0, `rgba(255, 255, 255, ${normLife})`);
      rad.addColorStop(0.4, `rgba(255, 170, 40, ${normLife * 0.8})`);
      rad.addColorStop(1, `rgba(200, 30, 0, 0)`);
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.type === "smoke") {
      ctx.save();
      ctx.fillStyle = `rgba(30, 36, 45, ${normLife * 0.4})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = p.color || "#ffeaa7";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * normLife, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  // Shockwaves
  shockwaves.forEach(s => {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 230, 180, ${s.alpha})`;
    ctx.lineWidth = 3.5 * s.alpha;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  // Screen Flash
  if (flashAlpha > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255, 240, 220, ${flashAlpha})`;
    ctx.fillRect(0, 0, 960, 540);
    ctx.restore();
  }

  // Banner Announcement
  if (bannerTimer > 0) {
    ctx.save();
    ctx.font = "900 20px 'Black Ops One', Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd32a";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 12;
    ctx.fillText(bannerText, 480, 120);
    ctx.restore();
  }

  // Vignette
  const vignette = ctx.createRadialGradient(480, 270, 320, 480, 270, 560);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 4, 12, 0.65)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 960, 540);

  ctx.restore();
}

function loop(time) {
  if (!running || paused) return;
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  update(dt);
  draw();
  if (running && !paused) requestAnimationFrame(loop);
}

function renderIdle() {
  if (!running || paused) {
    update(0.016);
    draw();
  }
  requestAnimationFrame(renderIdle);
}

// ==================== EVENT LISTENERS ====================
window.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "KeyP" || e.code === "Escape") togglePause();
  if (!running && e.code === "Space" && lobbyPanel.style.display !== "none") startMission();
});

window.addEventListener("keyup", e => { keys[e.code] = false; });

function bindHold(id, key) {
  const button = document.getElementById(id);
  if (!button) return;
  const down = e => { e.preventDefault(); keys[key] = true; };
  const up = e => { e.preventDefault(); keys[key] = false; };
  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointerleave", up);
  button.addEventListener("pointercancel", up);
}
bindHold("leftButton", "touchLeft");
bindHold("upButton", "touchUp");
bindHold("downButton", "touchDown");
bindHold("rightButton", "touchRight");
bindHold("shootButton", "touchShoot");

// Start initial lobby
updateLobbyUI();
draw();
renderIdle();
