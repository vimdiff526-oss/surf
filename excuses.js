(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  $("#year").textContent = new Date().getFullYear();

  // ===========================
  // データ：テンプレート
  // - situation: "skip"（今日は入らない） / "after"（入ったけど不発）
  // - category: tide, wind, crowd, gear, work, home, myth
  // スポット名は使いません（汎用表現）
  // ===========================
  const TEMPLATES_SKIP = {
    tide: [
      "今日は潮が“重い”。板が進む前に気持ちが戻された。",
      "満潮と干潮の狭間、波の呼吸が乱れてて合わない。今日は“波の機嫌が悪い日”。",
      "セットの周期が合わない。一本乗るごとに3年分歳を取るやつ。",
      "干潮で海底が丸見え。リーフのサイン会に参加する気はない。",
      "今日は“逆さ潮”。パドルしても後ろに下がる感じ。"
    ],
    wind: [
      "オンショア${wdeg}°で全部バラけてる。海は巨大な**かき混ぜ機**になった。",
      "オフショア強すぎてテイクオフで後ろから**ビンタ**される感じ。今日は見学日。",
      "風向きが1時間ごとに変わるロシアンルーレット。命は一つ。",
      "サイドショアが横殴りすぎてボードがカイトに。飛ぶなら飛行場でやりたい。",
      "今日は“無風”なのに面ツルじゃない。きっと誰かがドライヤー使ってる。"
    ],
    crowd: [
      "海が縁日状態。ドロップインの屋台が出てた。順番待ち券が必要。",
      "駐車場満タン、インサイド満タン、心の余裕ゼロ。撤退が最速の上達。",
      "ピークに**観客**が乗ってた。サーフィンって観る競技だっけ？",
      "人が多すぎて“波より人をさばく”練習になってる。",
      "ピーク争奪戦が**大相撲初場所**状態。今日は土俵入りを辞退する。"
    ],
    gear: [
      "フィンを家に忘れた。代わりに**割り箸**はある。刺さない方が良いと思う。",
      "ワックスが行方不明。すべての波は**滑り台**と化す。",
      "ウェットがまだ湿ってる。心も湿ってる。今日は乾燥大作戦。",
      "リーシュコードが“限界ロープ”。切れる前にやめとく。",
      "板にヒビ発見。今日は**板病院**に直行。"
    ],
    work: [
      "急ぎの案件：クライアントが“波に乗り遅れそう”らしい。まずはそっちの波待ち。",
      "PCの波（通知）が頭上で割れ続けてる。たぶん**ダブルオーバーヘッド**。",
      "会議が“長潮”。一日中ほとんど動かないやつ。",
      "上司が波待ちモード。声かけても入ってこない。今日はオフィスサーフ。",
      "エクセルがクラッシュして“ホワイトウォーター”。巻かれてる最中です。"
    ],
    home: [
      "洗濯槽が**ビッグスウェル**。回しとかないと家が沈む。",
      "家の植物がオンショア。全部傾いてるから支度が必要。",
      "うちの猫がリーシュコードを温めてる。どかせない。",
      "子どもが“波乗りごっこ”。優先権を譲るのが親の務め。",
      "冷蔵庫がインサイドでブレイク。今日中に買い物セッションが必要。"
    ],
    myth: [
      "イルカがピーク優先利用中。自治体ルールに従う。",
      "海の神様が“今日はOFF”って言ってた（夢枕）。",
      "水平線に**バグ**が出てる。アップデート待ち。",
      "波の女神が有給取得中。労基には逆らえない。",
      "宇宙線の影響で今日は波の形が“ピクセル化”。"
    ]
  };

  const TEMPLATES_AFTER = {
    tide: [
      "今日は潮位のタイミングを完全に読み違えた。全部インサイドで終わった。",
      "セットの周期がバラバラで、合わせた頃には波が老衰してた。",
      "面ツルに見えたのは錯覚。割れる頃には泡しか残ってなかった。"
    ],
    wind: [
      "オフショアが強すぎ、テイクオフで毎回フロントから**バックドロップ**。",
      "サイドショアに肩を持っていかれ、レールが言うことを聞かない日だった。",
      "ガスティでテイクオフが全部**賭博**。当たりはゼロ。"
    ],
    crowd: [
      "ピークのコール合戦に参加しただけで競技は終了。乗った本数より謝った回数が多い。",
      "前乗り回避でラインがグニャグニャ。美しいのは譲り合いの心だけ。",
      "人混みで波が**割り勘**になって、取り分が泡一口。"
    ],
    gear: [
      "フィンセッティングが迷子。直線は出るのにターンは出ない不思議な板に乗ってた。",
      "ワックスの塗りすぎで足が固定。ターンしようとしたら**家具**だった。",
      "リーシュが絡み芸を披露。解いてる間に今日が終わった。"
    ],
    work: [
      "リモートの通知が鳴るたびに集中が切れて、ターンの度に**Slack**が刺さる。",
      "“今日こそ定時”の誓いが重く、体幹が**コンプライアンス**に縛られてた。",
      "会議の議事録を脳内で書きながら乗ったら、波の方が議事進行に入ってこなかった。"
    ],
    home: [
      "寝不足で反射速度が**2フレーム**落ちてた。海ではフレーム落ちは命取り。",
      "洗濯物を干し忘れて頭の片隅がずっと雨。集中力の低気圧が停滞してた。",
      "家の鍵をどこに置いたか考えてたらショルダーに置いていかれた。"
    ],
    myth: [
      "イルカがライン取りに口を出してきて、全部“正解に近い失敗”になった。",
      "海の神様がテスト中。私のセクションだけ**A/Bテスト**に外されてた。",
      "星の配置がショルダー寄り。占星術に詳しい人ならわかるやつ。"
    ]
  };

  const TAGS = {
    tide: ["#潮"], wind: ["#風"], crowd: ["#混雑"], gear: ["#道具"],
    work: ["#仕事"], home: ["#家庭"], myth: ["#神話"]
  };

  // ふざけ度で付加
  const SILLY_ENDINGS = [
    "…という学術的結論に達しました。",
    "なので本日は**精神修行**に専念します。",
    "今日は海に敬意を表して“見学プロ”に徹します。",
    "代わりに波動画を観てイメトレ3時間いきます。",
    "次の台風まで心を充電します。",
    "波情報アプリに“本日臨時休業”と書いてあった（気がする）。"
  ];
  const SILLY_EMOJI = ["😂","🤙","🫠","🌀","🌊","🛟","📉","🧪"];

  // 永続化キー
  const LS_KEY = "excuses_history_v2";
  const FAV_KEY = "excuses_fav_v2";

  // 要素
  const elSituation = $("#situation");
  const elCategory = $("#category");
  const elTone = $("#tone");
  const elToneVal = $("#toneVal");
  const elText = $("#excuseText");
  const elTags = $("#excuseTags");
  const elSeed = $("#excuseSeed");
  const btnGen = $("#btnGen");
  const btnCopy = $("#btnCopy");
  const btnShare = $("#btnShare");
  const btnFav = $("#btnFav");
  const histList = $("#histList");
  const btnClear = $("#btnClear");
  const btnExport = $("#btnExport");

  // 状態
  let history = loadJSON(LS_KEY, []);
  let fav = new Set(loadJSON(FAV_KEY, []));

  // 初期UI
  elToneVal.textContent = elTone.value;
  renderHistory();

  // URL seed
  const urlSeed = getHashParam("s");
  if (urlSeed) {
    const parsed = parseInt(urlSeed, 10);
    const ex = generateExcuse(parsed);
    showExcuse(ex);
  }

  // イベント
  elTone.addEventListener("input", () => elToneVal.textContent = elTone.value);
  btnGen.addEventListener("click", () => showExcuse(generateExcuse(), true));
  btnCopy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(elText.textContent.trim());
    flash(btnCopy, "コピーしました");
  });
  btnShare.addEventListener("click", () => {
    const seed = elSeed.dataset.seed || String(Date.now());
    const shareUrl = withSeedInUrl(location.href.split("#")[0], seed);
    const text = `${elText.textContent.trim()}\n${shareUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  });
  btnFav.addEventListener("click", () => toggleFav(parseInt(elSeed.dataset.seed || "0", 10)));
  btnClear?.addEventListener("click", () => {
    if (!confirm("履歴をすべて消しますか？")) return;
    history = []; saveJSON(LS_KEY, history); renderHistory();
  });
  btnExport?.addEventListener("click", () => {
    const csv = toCSV(history);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "excuses.csv"; a.click();
    URL.revokeObjectURL(a.href);
  });

  // ショートカット：G / C
  window.addEventListener("keydown", (e) => {
    if (["INPUT","SELECT","TEXTAREA"].includes(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "g") btnGen.click();
    if (k === "c") btnCopy.click();
  });

  // ============= 生成ロジック =============
  function generateExcuse(forcedSeed = null) {
    const situationSel = elSituation.value; // mix / skip / after
    const situation = situationSel === "mix"
      ? (Math.random() < 0.5 ? "skip" : "after")
      : situationSel;

    const cats = Object.keys(TEMPLATES_SKIP);
    const cat = elCategory.value === "any" ? pick(cats) : elCategory.value;

    const tone = Number(elTone.value);

    const seed = forcedSeed ?? (Date.now() ^ Math.floor(Math.random()*1e9));
    const rng = mulberry32(seed);

    const wdeg = [45, 90, 135, 180, 225, 270][Math.floor(rng()*6)];
    const time = randomFrom(rng, ["朝イチ","ミドルタイド","夕方","夜明け前","満月タイム"]);

    const pool = situation === "skip" ? TEMPLATES_SKIP : TEMPLATES_AFTER;
    let base = pick(pool[cat], rng);

    // 置換
    let text = base.replaceAll("${wdeg}", wdeg).replaceAll("${time}", time);

    // ふざけ度
    if (tone >= 30) text += " " + pick(SILLY_ENDINGS, rng);
    if (tone >= 60) text = addExaggeration(text);
    if (tone >= 80) text += " " + repeat(pick(SILLY_EMOJI, rng), 2 + Math.floor(rng()*2));

    // タグ
    const tags = (TAGS[cat] || []).slice();
    tags.unshift(situation === "skip" ? "#入らない理由" : "#反省の理由");
    if (tone >= 60) tags.push("#ふざけ度高め");

    return { seed, text, tags, situation, cat, tone, time };
  }

  function showExcuse(ex, pushHistory=false) {
    elText.textContent = ex.text;
    elTags.textContent = ex.tags.join(" ");
    elSeed.textContent = `seed: ${ex.seed}`;
    elSeed.dataset.seed = String(ex.seed);

    if (pushHistory) {
      history.unshift({ ...ex, ts: new Date().toISOString(), fav: fav.has(ex.seed) });
      if (history.length > 200) history.length = 200;
      saveJSON(LS_KEY, history); renderHistory();
    }
    btnFav.classList.toggle("active", fav.has(ex.seed));
    btnFav.textContent = fav.has(ex.seed) ? "★ お気に入り中" : "★ お気に入り";
  }

  // ============= 履歴 =============
  function renderHistory() {
    histList.innerHTML = "";
    if (!history.length) {
      histList.innerHTML = `<li class="item"><div class="txt">まだ履歴はありません。</div></li>`;
      return;
    }
    history.forEach(item => {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `
        <div class="row">
          <div class="txt">${escapeHtml(item.text)}</div>
          <div class="tools">
            <button class="btn btn-sm" data-k="use">使う</button>
            <button class="btn btn-sm" data-k="copy">コピー</button>
            <button class="btn btn-sm" data-k="share">共有</button>
            <button class="btn btn-sm ${fav.has(item.seed)?'btn-primary':''}" data-k="fav">${fav.has(item.seed)?"★": "☆"}</button>
          </div>
        </div>
        <div class="row">
          <span class="badge">${item.tags.join(" ")}</span>
          <span class="badge">seed:${item.seed}</span>
        </div>
      `;
      histList.appendChild(li);

      const [btnUse, btnCopy2, btnShare2, btnFav2] = $$("button", li);
      btnUse.addEventListener("click", () => showExcuse(item, false));
      btnCopy2.addEventListener("click", async () => {
        await navigator.clipboard.writeText(item.text);
        flash(btnCopy2, "コピーしました");
      });
      btnShare2.addEventListener("click", () => {
        const shareUrl = withSeedInUrl(location.href.split("#")[0], item.seed);
        const text = `${item.text}\n${shareUrl}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
      });
      btnFav2.addEventListener("click", () => {
        toggleFav(item.seed);
        btnFav2.classList.toggle("btn-primary", fav.has(item.seed));
        btnFav2.textContent = fav.has(item.seed) ? "★" : "☆";
      });
    });
  }

  // ============= お気に入り =============
  function toggleFav(seed) {
    if (fav.has(seed)) fav.delete(seed); else fav.add(seed);
    saveJSON(FAV_KEY, Array.from(fav));
    btnFav.classList.toggle("active", fav.has(seed));
    btnFav.textContent = fav.has(seed) ? "★ お気に入り中" : "★ お気に入り";
    renderHistory();
  }

  // ============= ユーティリティ =============
  function pick(arr, rng=Math){ return arr[Math.floor(rng()*arr.length)]; }
  function randomFrom(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }

  function addExaggeration(text){
    return text
      .replace("強すぎて", "強すぎて**宇宙**")
      .replace("ロシアンルーレット", "ロシアンルーレット（全弾装填）")
      .replace("巨大な", "巨大な（当社比1.8倍）");
  }
  function repeat(s, n){ return Array.from({length:n}).map(()=>s).join(" "); }

  function flash(btn, msg){
    const prev = btn.textContent;
    btn.textContent = msg;
    setTimeout(()=>btn.textContent = prev, 900);
  }

  // 共有用：URLに #s=seed を付与
  function withSeedInUrl(base, seed){
    try { const url = new URL(base); url.hash = `s=${seed}`; return url.toString(); }
    catch { return `${base}#s=${seed}`; }
  }
  function getHashParam(key){
    const m = location.hash.match(new RegExp(`${key}=([0-9]+)`));
    return m ? m[1] : null;
  }

  // 乱数（シードあり）
  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  // 保存/読込
  function saveJSON(key, v){ localStorage.setItem(key, JSON.stringify(v)); }
  function loadJSON(key, def){ try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } }

  // CSV（situation列を追加）
  function toCSV(arr){
    const header = ["time","seed","situation","category","tone","text","tags"];
    const lines = [header.join(",")];
    arr.forEach(x => {
      const row = [
        x.ts ?? "",
        x.seed,
        x.situation,
        x.cat,
        x.tone,
        quote(x.text),
        quote((x.tags||[]).join(" "))
      ].join(",");
      lines.push(row);
    });
    return lines.join("\n");
  }
  function quote(s){
    const t = String(s ?? "").replaceAll('"','""');
    return `"${t}"`;
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
})();
