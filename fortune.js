(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  $("#year").textContent = new Date().getFullYear();

  // 参照
  const elName = $("#name");
  const elDob = $("#dob");
  const elLevel = $("#level");
  const elGoal = $("#goal");
  const elRange = $("#range");

  const btnFortune = $("#btnFortune");
  const btnCopy = $("#btnCopy");
  const btnShare = $("#btnShare");

  const title = $("#title");
  const subtitle = $("#subtitle");
  const chipsEl = $("#chips");
  const luckyWave = $("#luckyWave");
  const luckyColor = $("#luckyColor");
  const luckyItem = $("#luckyItem");
  const avoid = $("#avoid");
  const advice = $("#advice");
  const planList = $("#planList");
  const seedInfo = $("#seedInfo");

  const gaugeSvg = $("#gaugeSvg");
  ensureGaugeGradient(gaugeSvg);

  const histList = $("#histList");
  const btnClear = $("#btnClear");
  const btnExport = $("#btnExport");

  // 履歴 保存キー
  const LS_KEY = "fortune_history_v1";

  // 候補データ
  const WAVES = ["マシンウェーブ", "スモールクリーン", "腹～胸", "肩～頭", "リーフのショルダー", "ビーチのアウト", "ミドルの張り", "ショアブレイク"];
  const COLORS = ["マリンブルー", "ミントグリーン", "ネイビー", "サンセットオレンジ", "モノクロ", "ターコイズ", "ラベンダー", "コーラル"];
  const ITEMS = ["耳栓", "日焼け止め", "ワックス", "ビーチサンダル", "予備リーシュ", "小さめタオル", "保温ボトル", "バインダー"];
  const AVOIDS = ["焦ってテイクオフ", "インサイド固執", "人の多いピーク", "新品ギアの試用", "長居しすぎ", "寝不足パドル", "スマホ見過ぎ"];
  const ADVICE = [
    "波を選ぶ勇気が、乗る勇気になる。",
    "3本に1本“見送る”と、1本が伸びる。",
    "最初の2ストロークを丁寧に。",
    "今日はライン小さめ、角度は高め。",
    "“戻る”判断が上達を守る。",
    "焦らずルーティンを守ろう。"
  ];

  // メニュー（スコア・レベル・目的で出し分け）
  const PLANS = {
    sea_easy: ["インサイドで角度付けのテイクオフ", "1本ごとに戻ってフォーム確認", "リラックスしてクルージング"],
    sea_mid: ["アウトで張り待ち→ショートライド集中", "レール-to-レールの切り返し", "ピークの見極め練習"],
    sea_hard: ["サイズがあれば1本“勝負波”を決める", "トライ＆エラーで試す技を1つに絞る", "コンディション悪ければ早上がり"],
    land: ["チューブ呼吸（ボックス呼吸）2分×3", "肩甲骨モビリティ、腸腰筋ストレッチ", "バランスボードで2分×2セット"]
  };

  // 履歴
  let history = loadJSON(LS_KEY, []);

  // URL seed（共有再現）
  const urlSeed = getHashParam("s");
  if (urlSeed) {
    const parsed = parseInt(urlSeed, 10);
    const res = generate(parsed);
    render(res);
  }

  // イベント
  btnFortune.addEventListener("click", () => {
    const res = generate();
    render(res, true);
  });
  btnCopy.addEventListener("click", async () => {
    const text = collectText();
    await navigator.clipboard.writeText(text);
    flash(btnCopy, "コピーしました");
  });
  btnShare.addEventListener("click", () => {
    const seed = seedInfo.dataset.seed || String(Date.now());
    const shareUrl = withSeedInUrl(location.href.split("#")[0], seed);
    const text = collectText() + "\n" + shareUrl;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  });
  window.addEventListener("keydown", (e) => {
    if (["INPUT","SELECT","TEXTAREA"].includes(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "g") btnFortune.click();
    if (k === "c") btnCopy.click();
  });

  btnClear?.addEventListener("click", () => {
    if (!confirm("履歴をすべて消しますか？")) return;
    history = [];
    saveJSON(LS_KEY, history);
    renderHistory();
  });
  btnExport?.addEventListener("click", () => {
    const csv = toCSV(history);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fortune_history.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  renderHistory(); // 初期

  // ===== 生成 =====
  function generate(forcedSeed = null) {
    // “日付”と“入力”から毎日安定するシード
    const todayKey = elRange.value === "week" ? getWeekKey(new Date()) : getDateKey(new Date());
    const name = (elName.value || "").trim().toLowerCase();
    const dob = (elDob.value || "").replaceAll("-", "");
    const lvl = elLevel.value;
    const goal = elGoal.value;

    const seed = forcedSeed ?? hash(todayKey + "|" + name + "|" + dob + "|" + lvl + "|" + goal);
    const rng = mulberry32(seed);

    // 基本スコア：0-100（少し“良い日”に寄せるカーブ）
    let score = Math.floor(Math.pow(rng(), 0.7) * 100);
    // レベルや目的で微調整
    if (lvl === "beginner") score = clamp(score + 6, 0, 100);
    if (goal === "challenge") score = clamp(score - 4, 0, 100);
    if (goal === "cruise") score = clamp(score + 4, 0, 100);

    const wave = pick(WAVES, rng);
    const color = pick(COLORS, rng);
    const item = pick(ITEMS, rng);
    const avoidThing = pick(AVOIDS, rng);
    const tip = pick(ADVICE, rng);

    // メニュー選定
    const plans = [];
    if (score >= 70) {
      plans.push(...PLANS.sea_hard.slice(0,2));
    } else if (score >= 40) {
      plans.push(...PLANS.sea_mid.slice(0,2));
    } else {
      plans.push(...PLANS.sea_easy.slice(0,2));
    }
    // どのスコアでも1つは陸メニューを入れる
    plans.push(pick(PLANS.land, rng));

    // タイトル/サブタイトル
    const ttl = score >= 75 ? "今日は当て勘が冴える日"
              : score >= 55 ? "読みとリズムが合いやすい日"
              : score >= 35 ? "慎重に選べば楽しめる日"
              : "無理しない勇気が光る日";
    const sub = elRange.value === "week" ? "今週の波運" : "今日の波運";

    const chips = [
      labelForLevel(lvl),
      labelForGoal(goal),
      elRange.value === "week" ? "#今週" : "#今日"
    ];

    return {
      seed, score, wave, color, item, avoid: avoidThing, tip,
      plans, ttl, sub, chips,
      inputs: { name, dob, lvl, goal, range: elRange.value }
    };
  }

  // ===== 描画 =====
  function render(data, pushHist=false) {
    // ゲージ
    setGauge(data.score);

    // テキスト
    title.textContent = data.ttl;
    subtitle.textContent = data.sub;
    chipsEl.innerHTML = data.chips.map(c => `<span class="chip">${escapeHtml(c)}</span>`).join("");

    luckyWave.textContent = data.wave;
    luckyColor.textContent = data.color;
    luckyItem.textContent = data.item;
    avoid.textContent = data.avoid;
    advice.textContent = data.tip;

    planList.innerHTML = "";
    data.plans.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      planList.appendChild(li);
    });

    seedInfo.textContent = `seed: ${data.seed}`;
    seedInfo.dataset.seed = String(data.seed);

    if (pushHist) {
      history.unshift({
        ts: new Date().toISOString(),
        ...data
      });
      if (history.length > 200) history.length = 200;
      saveJSON(LS_KEY, history);
      renderHistory();
    }
  }

  // ===== 履歴 =====
  function renderHistory() {
    histList.innerHTML = "";
    if (!history.length) {
      histList.innerHTML = `<li class="item"><div class="txt">まだ履歴はありません。</div></li>`;
      return;
    }
    history.forEach(h => {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `
        <div class="row">
          <div class="txt">${escapeHtml(`${h.sub}：${h.ttl}（波運 ${h.score}）`)}</div>
          <div class="tools">
            <button class="btn btn-sm" data-k="use">開く</button>
            <button class="btn btn-sm" data-k="copy">コピー</button>
            <button class="btn btn-sm" data-k="share">共有</button>
          </div>
        </div>
        <div class="row">
          <span class="badge">seed:${h.seed}</span>
          <span class="badge">${h.chips.join(" ")}</span>
        </div>
      `;
      histList.appendChild(li);
      const [bUse, bCopy, bShare] = $$("button", li);
      bUse.addEventListener("click", () => render(h, false));
      bCopy.addEventListener("click", async () => {
        await navigator.clipboard.writeText(historyText(h));
        flash(bCopy, "コピーしました");
      });
      bShare.addEventListener("click", () => {
        const shareUrl = withSeedInUrl(location.href.split("#")[0], h.seed);
        const text = historyText(h) + "\n" + shareUrl;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
      });
    });
  }

  // ===== ゲージ描画 =====
  function ensureGaugeGradient(svg){
    // シンプルな線形グラデ
    const defs = document.createElementNS("http://www.w3.org/2000/svg","defs");
    const grad = document.createElementNS("http://www.w3.org/2000/svg","linearGradient");
    grad.setAttribute("id","grad1");
    grad.setAttribute("x1","0"); grad.setAttribute("y1","0");
    grad.setAttribute("x2","1"); grad.setAttribute("y2","1");
    const s1 = document.createElementNS("http://www.w3.org/2000/svg","stop");
    s1.setAttribute("offset","0%"); s1.setAttribute("stop-color","#60a5fa");
    const s2 = document.createElementNS("http://www.w3.org/2000/svg","stop");
    s2.setAttribute("offset","100%"); s2.setAttribute("stop-color","#2dd4bf");
    grad.appendChild(s1); grad.appendChild(s2);
    defs.appendChild(grad);
    svg.insertBefore(defs, svg.firstChild);
  }

  function setGauge(score){
    const fg = $(".g-fg", gaugeSvg);
    const txt = $(".g-score", gaugeSvg);
    const circumference = 2 * Math.PI * 50; // r=50
    const dash = Math.round(circumference * (score/100));
    fg.setAttribute("stroke-dasharray", `${dash} ${circumference - dash}`);
    txt.textContent = String(score);
  }

  // ===== テキスト収集 =====
  function collectText(){
    const n = (elName.value || "").trim();
    const head = n ? `【${n}の波乗り占い】` : "【波乗り占い】";
    return [
      `${head} ${title.textContent}（${subtitle.textContent}）`,
      `波運: ${$(".g-score").textContent}`,
      `ラッキーウェーブ: ${luckyWave.textContent}`,
      `ラッキーカラー: ${luckyColor.textContent}`,
      `ラッキーアイテム: ${luckyItem.textContent}`,
      `避けるべきこと: ${avoid.textContent}`,
      `今日のひと言: ${advice.textContent}`,
      `おすすめ: ${[...$("#planList").querySelectorAll("li")].map(li=>li.textContent).join(" / ")}`
    ].join("\n");
  }

  function historyText(h){
    return [
      `【波乗り占い】${h.ttl}（${h.sub}）`,
      `波運: ${h.score}`,
      `ラッキーウェーブ: ${h.wave}`,
      `ラッキーカラー: ${h.color}`,
      `ラッキーアイテム: ${h.item}`,
      `避けるべきこと: ${h.avoid}`,
      `今日のひと言: ${h.tip}`,
      `おすすめ: ${h.plans.join(" / ")}`
    ].join("\n");
  }

  // ===== ユーティリティ =====
  function getDateKey(d){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), da=String(d.getDate()).padStart(2,"0");
    return `${y}${m}${da}`;
  }
  function getWeekKey(d){
    // 年+週番号（ISO準拠風）
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7; // 0=Monday
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(),0,4));
    const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay()+6)%7)) / 7);
    return `${date.getUTCFullYear()}W${String(week).padStart(2,"0")}`;
  }
  function labelForLevel(v){ return v==="beginner" ? "#ビギナー" : v==="advanced" ? "#上級" : "#中級"; }
  function labelForGoal(v){ return v==="cruise" ? "#クルーズ" : v==="challenge" ? "#チャレンジ" : "#練習"; }

  function pick(arr, rng=Math){ return arr[Math.floor(rng()*arr.length)]; }
  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
  function hash(str){
    let h=0; for(let i=0;i<str.length;i++){ h = (h<<5)-h + str.charCodeAt(i); h|=0; }
    return Math.abs(h);
  }
  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }
  function withSeedInUrl(base, seed){
    try { const u = new URL(base); u.hash = `s=${seed}`; return u.toString(); }
    catch { return `${base}#s=${seed}`; }
  }
  function getHashParam(key){
    const m = location.hash.match(new RegExp(`${key}=([0-9]+)`));
    return m ? m[1] : null;
  }
  function saveJSON(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
  function loadJSON(k, def){ try{ return JSON.parse(localStorage.getItem(k)) ?? def; }catch{ return def; } }
  function toCSV(arr){
    const header = ["time","seed","score","title","sub","chips","wave","color","item","avoid","advice","plans"];
    const lines = [header.join(",")];
    arr.forEach(h => {
      const row = [
        h.ts,
        h.seed,
        h.score,
        q(h.ttl),
        q(h.sub),
        q(h.chips.join(" ")),
        q(h.wave),
        q(h.color),
        q(h.item),
        q(h.avoid),
        q(h.tip),
        q(h.plans.join(" / "))
      ].join(",");
      lines.push(row);
    });
    return lines.join("\n");
  }
  function q(s){ const t = String(s ?? "").replaceAll('"','""'); return `"${t}"`; }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function flash(btn, msg){
    const prev = btn.textContent; btn.textContent = msg;
    setTimeout(()=> btn.textContent = prev, 900);
  }
})();
