(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const barStamina = document.getElementById("staminaBar");
  const barCurrent = document.getElementById("currentBar");
  document.getElementById("year").textContent = new Date().getFullYear();

  // ===== 基本サイズ =====
  const W = canvas.width;   // 400
  const H = canvas.height;  // 600

  // ===== プレイヤー =====
  const surfer = {
    x: W/2, y: H*0.75, r: 14, vx: 0,
    color: "#ffe37a"
  };

  // ===== 状態 =====
  let running = true;
  let score = 0;
  let best = Number(localStorage.getItem("surf_best") || 0);
  bestEl.textContent = `Best: ${best}`;

  // ===== オブジェクト =====
  const rocks = [];  // ▲
  const coins = [];  // ★
  const sets  = [];  // ━（隙間のある波の壁）

  // ===== 難易度 & 物理 =====
  let speed = 2.4;               // 縦スクロール基本速度

  // 岩スポーン
  let rockTimer = 0;
  let rockInterval = 78;         // 岩の出現間隔（徐々に短縮）

  // コインスポーン（岩と分離）
  let coinTimer = 0;
  const COIN_INTERVAL_BASE = 115;
  let coinInterval = COIN_INTERVAL_BASE;

  // ブレイクセット（波の壁）
  let setTimer = 0;
  let setInterval = 240;

  let waveT = 0;

  // ===== スタミナ & カレント =====
  let stamina = 100;             // 0〜100
  const STAMINA_DECAY = 0.010;   // 消費やや緩め
  const STAMINA_COIN  = 18;      // コイン回復強め

  // カレント（横流れ）：開始はかなり弱く、徐々に強く
  let currentT = 0;                     // 位相
  let currentPower = 0.0;               // 0〜1
  const CURRENT_BASE = 0.05;            // ← 初期の基本ゆらぎの強さ（前は 0.2 相当）
  const CURRENT_GROWTH = 0.00004;       // 成長速度（ゆるやか）
  const CURRENT_GROWTH_BOOST = 0.00006; // 中盤以降じわっと強くするための追加係数

  // ===== ブレイクセット（壁）当たり判定改良 =====
  const WALL_THICKNESS = 20;
  const SAFE_PAD = Math.max(12, Math.floor(surfer.r * 1.1));
  const HIT_GRACE_MS = 60;       // 当たりデバウンス
  let hitAccumMs = 0;

  // ===== 緊急補給（“無理ゲー”防止） =====
  let msSinceLastCoinCatch = 0;
  const EMERGENCY_STAMINA = 20;      // 20%未満で候補
  const EMERGENCY_MS = 2000;         // 2秒未取得で投下
  const EMERGENCY_COOLDOWN_MS = 3000;
  let msSinceEmergency = EMERGENCY_COOLDOWN_MS;

  // ===== 入力 =====
  const keys = { left: false, right: false };
  let touchX = null;

  // ===== ユーティリティ =====
  const rand = (a, b) => a + Math.random()*(b-a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 画面→キャンバス内部座標（CSSスケールを補正）
  function toCanvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (evt.clientX - rect.left) * scaleX;
    const y = (evt.clientY - rect.top) * scaleY;
    return { x, y };
  }

  // 円vs円
  function hit(ax, ay, ar, bx, by, br) {
    const dx = ax - bx;
    const dy = ay - by;
    return (dx*dx + dy*dy) <= (ar + br) * (ar + br);
  }

  // 円vs長方形（正確判定）
  function circleRectHit(cx, cy, cr, rx, ry, rw, rh) {
    if (rw <= 0 || rh <= 0) return false;
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx*dx + dy*dy) <= cr*cr;
  }

  function reset() {
    score = 0;
    speed = 2.4;

    rockTimer = 0;
    rockInterval = 78;

    coinTimer = 0;
    coinInterval = COIN_INTERVAL_BASE;

    setTimer = 0;
    setInterval = 240;

    rocks.length = 0;
    coins.length = 0;
    sets.length  = 0;

    surfer.x = W/2;
    surfer.vx = 0;

    stamina = 100;

    // カレントを弱く初期化
    currentT = 0;
    currentPower = 0.0;

    hitAccumMs = 0;
    msSinceLastCoinCatch = 0;
    msSinceEmergency = EMERGENCY_COOLDOWN_MS;

    running = true;
  }

  // ===== 背景の波 =====
  function drawWaves() {
    waveT += 0.01;
    const lines = 5;
    for (let i=0; i<lines; i++) {
      const yBase = (i/lines) * H;
      ctx.beginPath();
      for (let x=0; x<=W; x+=8) {
        const y = yBase + Math.sin(x*0.03 + waveT*2 + i)*4 + (waveT*speed*20 % H);
        if (x===0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(255,255,255,${0.04 + i*0.01})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawSurfer() {
    ctx.save();
    ctx.translate(surfer.x, surfer.y);
    // 初期はかなり小さい揺れにする
    ctx.rotate((surfer.vx + currentPower * Math.sin(currentT*0.6)) * 0.06);

    // デッキ
    ctx.fillStyle = "#f4a261";
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 10, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.25)";
    ctx.stroke();

    // 人
    ctx.fillStyle = surfer.color;
    ctx.beginPath();
    ctx.arc(0, -10, surfer.r*0.6, 0, Math.PI*2);
    ctx.fill();

    ctx.strokeStyle = "#ffe37a";
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, 10);
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, 6);
    ctx.moveTo(0, 0);
    ctx.lineTo(8, 6);
    ctx.stroke();

    ctx.restore();
  }

  // ===== スポーン =====
  function spawnRocksAndSets() {
    // 岩
    rockTimer++;
    if (rockTimer >= rockInterval) {
      rockTimer = 0;
      const x = rand(40, W-40);
      const y = -20;
      rocks.push({ x, y, r: rand(10,16), vy: speed + rand(0.8, 1.8) });

      if (rockInterval > 50) rockInterval -= 0.35;
      speed = Math.min(5.0, speed + 0.008);
    }

    // ブレイクセット（波の壁）
    setTimer++;
    if (setTimer >= setInterval) {
      setTimer = 0;
      const gapW = Math.max(80, 140 - score * 0.05); // 最小幅（判定は後でSAFE_PAD拡張）
      sets.push({
        y: -30,
        vy: speed + 1.2,
        gapX: rand(60, W-60),
        gapW,
        cleared: false
      });
      if (setInterval > 160) setInterval -= 1.2;
    }
  }

  function adaptiveCoinInterval() {
    // スタミナが低いほど間隔を短縮（下限50）
    const lack = (100 - stamina) / 100; // 0〜1
    const target = COIN_INTERVAL_BASE - lack * 60; // 115 → 55 まで
    coinInterval = Math.max(50, target);
  }

  function maybeSpawnCoin(dt) {
    coinTimer++;
    adaptiveCoinInterval();

    const MAX_COINS = 8;
    if (coins.length < MAX_COINS && coinTimer >= coinInterval) {
      coinTimer = 0;
      const x = rand(30, W-30);
      const y = -20;
      coins.push({ x, y, r: 8, vy: speed + rand(0.7, 1.3), wob: 0, magnet: false });
    }

    // 緊急補給
    msSinceLastCoinCatch += dt;
    msSinceEmergency += dt;
    if (stamina < EMERGENCY_STAMINA && msSinceLastCoinCatch > EMERGENCY_MS && msSinceEmergency > EMERGENCY_COOLDOWN_MS) {
      msSinceEmergency = 0;
      msSinceLastCoinCatch = 0;
      const offset = rand(-60, 60);
      const x = clamp(surfer.x + offset, 24, W-24);
      const y = -26;
      coins.push({ x, y, r: 8, vy: speed + 0.9, wob: 0, magnet: true });
    }
  }

  // ===== アップデート =====
  function updateObjects(dt) {
    let collidedThisFrame = false;

    // 岩
    for (let i=rocks.length-1; i>=0; i--) {
      const o = rocks[i];
      o.y += o.vy;
      if (o.y > H + 20) { rocks.splice(i,1); continue; }
      if (hit(o.x, o.y, o.r, surfer.x, surfer.y, surfer.r)) {
        collidedThisFrame = true;
      }
    }

    // コイン（近距離でマグネット吸引）
    for (let i=coins.length-1; i>=0; i--) {
      const c = coins[i];
      c.wob += 0.2;
      c.y += c.vy;
      c.x += Math.sin(c.wob) * 0.5;

      const dx = surfer.x - c.x;
      const dy = surfer.y - c.y;
      const dist = Math.hypot(dx, dy);
      if (stamina < 50 && dist <= 80) {
        const pull = (c.magnet ? 0.11 : 0.06) * (1 - stamina/50);
        c.x += dx * pull;
        c.y += dy * pull * 0.8;
      }

      if (c.y > H + 24) { coins.splice(i,1); continue; }
      if (hit(c.x, c.y, c.r, surfer.x, surfer.y, surfer.r)) {
        coins.splice(i,1);
        score += 10;
        stamina = Math.min(100, stamina + STAMINA_COIN);
        msSinceLastCoinCatch = 0;
      }
    }

    // ブレイクセット
    for (let i=sets.length-1; i>=0; i--) {
      const s = sets[i];
      s.y += s.vy;
      if (s.y > H + 20) { sets.splice(i,1); continue; }

      // 通過判定
      const bandTop = surfer.y - WALL_THICKNESS/2;
      const bandBot = surfer.y + WALL_THICKNESS/2;
      if (!s.cleared && s.y >= bandTop && s.y <= bandBot) {
        const gapL = (s.gapX - s.gapW/2) - SAFE_PAD;
        const gapR = (s.gapX + s.gapW/2) + SAFE_PAD;
        if (surfer.x >= gapL && surfer.x <= gapR) s.cleared = true;
      }
      if (s.cleared) continue;

      const leftW  = Math.max(0, (s.gapX - s.gapW/2) - SAFE_PAD);
      const rightX = (s.gapX + s.gapW/2) + SAFE_PAD;

      const leftRect  = { x: 0,      y: s.y - WALL_THICKNESS/2, w: leftW,           h: WALL_THICKNESS };
      const rightRect = { x: rightX, y: s.y - WALL_THICKNESS/2, w: Math.max(0, W - rightX), h: WALL_THICKNESS };

      const hitLeft  = circleRectHit(surfer.x, surfer.y, surfer.r, leftRect.x, leftRect.y, leftRect.w, leftRect.h);
      const hitRight = circleRectHit(surfer.x, surfer.y, surfer.r, rightRect.x, rightRect.y, rightRect.w, rightRect.h);
      if (hitLeft || hitRight) collidedThisFrame = true;
    }

    // 衝突デバウンス
    if (collidedThisFrame) {
      hitAccumMs += dt;
      if (hitAccumMs >= HIT_GRACE_MS) running = false;
    } else {
      hitAccumMs = 0;
    }
  }

  function drawObjects() {
    // 岩 ▲
    for (const o of rocks) {
      ctx.fillStyle = "#e76f51";
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - o.r);
      ctx.lineTo(o.x - o.r, o.y + o.r);
      ctx.lineTo(o.x + o.r, o.y + o.r);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.2)";
      ctx.stroke();
    }

    // コイン ★
    for (const c of coins) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.wob * 0.2);
      ctx.fillStyle = "#ffd166";
      starPath(ctx, 0, 0, 5, c.r, c.r/2);
      ctx.fill();
      ctx.restore();
    }

    // ブレイクセット（見た目も判定に一致）
    for (const s of sets) {
      const leftW  = Math.max(0, (s.gapX - s.gapW/2) - SAFE_PAD);
      const rightX = (s.gapX + s.gapW/2) + SAFE_PAD;

      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.fillRect(0, s.y - WALL_THICKNESS/2, leftW, WALL_THICKNESS);
      ctx.fillRect(rightX, s.y - WALL_THICKNESS/2, Math.max(0, W - rightX), WALL_THICKNESS);

      const visualGapX = leftW;
      const visualGapW = Math.max(0, W - leftW - Math.max(0, W - rightX));
      ctx.strokeStyle = "rgba(45,212,191,.6)";
      ctx.strokeRect(visualGapX, s.y - WALL_THICKNESS/2, visualGapW, WALL_THICKNESS);

      if (s.cleared) {
        ctx.strokeStyle = "rgba(34,197,94,.5)";
        ctx.strokeRect(visualGapX, s.y - WALL_THICKNESS/2, visualGapW, WALL_THICKNESS);
      }
    }
  }

  function starPath(ctx, x, y, points, outer, inner) {
    const step = Math.PI / points;
    ctx.beginPath();
    for (let i = 0; i < 2*points; i++) {
      const r = i % 2 ? inner : outer;
      const a = i * step - Math.PI/2;
      const sx = x + Math.cos(a) * r;
      const sy = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
  }

  function updateSurfer(dt) {
    // カレント（横流れ）
    currentT += dt * 0.002;

    // 前半は弱く、スコアが伸びると少しずつ上げる
    const midBoost = Math.min(1, Math.max(0, (score - 150) / 300)); // score=150〜450で0→1
    currentPower = clamp(currentPower + (CURRENT_GROWTH + CURRENT_GROWTH_BOOST * midBoost) * dt, 0, 1);

    const currentAx = Math.sin(currentT) * (CURRENT_BASE + currentPower * 0.6); // 最大でも以前より弱め

    // 入力
    const axKey = (keys.left ? -0.6 : 0) + (keys.right ? 0.6 : 0);

    // 合成
    const ax = axKey + currentAx * 0.3;
    surfer.vx += ax;
    surfer.vx *= 0.89;
    surfer.x += surfer.vx;
    surfer.x = clamp(surfer.x, 24, W-24);
  }

  function updateHUD(dt) {
    // スコア（時間加点）
    score += dt * 0.022;
    scoreEl.textContent = `Score: ${Math.floor(score)}`;

    // スタミナ
    stamina -= STAMINA_DECAY * dt; // 時間で減る
    stamina = clamp(stamina, 0, 100);
    barStamina.style.width = `${stamina}%`;

    // カレント表示
    barCurrent.style.width = `${Math.floor(currentPower*100)}%`;

    if (stamina <= 0) running = false;
  }

  // ===== ループ =====
  let last = performance.now();
  function loop(now) {
    const dt = now - last; // ms
    last = now;

    ctx.clearRect(0,0,W,H);
    drawWaves();

    if (running) {
      updateSurfer(dt);
      spawnRocksAndSets();
      maybeSpawnCoin(dt);
      updateObjects(dt);
      drawObjects();
      drawSurfer();
      updateHUD(dt);
    } else {
      drawObjects();
      drawSurfer();
      gameOverScreen();
    }

    requestAnimationFrame(loop);
  }

  function gameOverScreen() {
    if (score > best) {
      best = Math.floor(score);
      localStorage.setItem("surf_best", best);
      bestEl.textContent = `Best: ${best}`;
    }
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(0,0,W,H);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", W/2, H/2 - 16);
    ctx.font = "16px system-ui";
    ctx.fillText(`Score: ${Math.floor(score)}`, W/2, H/2 + 10);

    // もう一度ボタン（キャンバス内部座標で 160×36）
    ctx.fillStyle = "#2dd4bf";
    ctx.fillRect(W/2 - 80, H/2 + 34, 160, 36);
    ctx.fillStyle = "#042f2a";
    ctx.font = "bold 16px system-ui";
    ctx.fillText("もう一度", W/2, H/2 + 59);
  }

  // ===== 入力 =====
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") keys.left = true;
    if (e.key === "ArrowRight") keys.right = true;
    if (e.key.toLowerCase() === "p") running = !running;

    // ゲームオーバー時のリトライ（Enter/Space）
    if (!running && (e.key === "Enter" || e.key === " ")) {
      reset();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") keys.left = false;
    if (e.key === "ArrowRight") keys.right = false;
  });

  // タッチ
  const getRect = () => canvas.getBoundingClientRect();
  canvas.addEventListener("touchstart", (e) => {
    const rect = getRect();
    const x = e.touches[0].clientX - rect.left;
    touchX = x;
    if (!running) { reset(); return; }
    keys.left = x < rect.width/2;
    keys.right = x >= rect.width/2;
  });
  canvas.addEventListener("touchmove", (e) => {
    const rect = getRect();
    const x = e.touches[0].clientX - rect.left;
    if (x < touchX - 8) { keys.left = true; keys.right = false; }
    else if (x > touchX + 8) { keys.left = false; keys.right = true; }
    touchX = x;
  });
  canvas.addEventListener("touchend", () => {
    keys.left = keys.right = false;
  });

  // クリック（スケール補正して当たり判定）
  canvas.addEventListener("click", (e) => {
    if (!running) {
      const { x, y } = toCanvasPos(e); // ← 補正後の内部座標
      if (x >= W/2 - 80 && x <= W/2 + 80 && y >= H/2 + 34 && y <= H/2 + 70) {
        reset();
      }
    }
  });

  // 画面ボタン
  document.getElementById("btnLeft").addEventListener("pointerdown", () => keys.left = true);
  document.getElementById("btnLeft").addEventListener("pointerup", () => keys.left = false);
  document.getElementById("btnRight").addEventListener("pointerdown", () => keys.right = true);
  document.getElementById("btnRight").addEventListener("pointerup", () => keys.right = false);
  document.getElementById("btnPause").addEventListener("click", () => running = !running);

  // start
  reset();
  requestAnimationFrame(loop);
})();
