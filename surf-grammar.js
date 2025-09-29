(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  $("#year").textContent = new Date().getFullYear();

  // UI参照
  const elLevel = $("#level");
  const elTopic = $("#topic");
  const elStyle = $("#style");
  const elTone = $("#tone");
  const elSentences = $("#sentences");

  const btnGen = $("#btnGen");
  const btnCopy = $("#btnCopy");
  const btnShare = $("#btnShare");

  const elText = $("#text");
  const elTags = $("#tags");
  const elSeed = $("#seed");
  const glossList = $("#glossList");

  const histList = $("#histList");
  const btnClear = $("#btnClear");
  const btnExport = $("#btnExport");

  // 履歴
  const LS_KEY = "surf_grammar_hist_v1";
  let history = loadJSON(LS_KEY, []);

  // 乱数（シードあり）
  function mulberry32(a){ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; } }
  const pick = (arr, rng=Math)=>arr[Math.floor(rng()*arr.length)];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

  // ======= 用語辞書（短い注釈） =======
  // 要約定義（国内サイト等を参考に簡潔化）
  const TERMS = {
    "ピーク":"波が最初に割れ始める頂点。テイクオフ起点になりやすい。",
    "ショルダー":"切り立ち始める乗れる斜面側（混雑回避・ライン取りの基準）。",
    "フェイス":"まだ割れていない斜面。マニューバーを描く場所。",
    "リップ":"トップから飛び出す部分。リエントリー/オフザリップの目印。",
    "トップ":"波の上端。ここから滑り降りると加速しやすい。",
    "ボトム":"波の最下部。ボトムターンの踏切点。",
    "ダンパー":"一気に全体が崩れる波。ライディングに不向き。",
    "テイクオフ":"立ち上がって滑り始める動作。",
    "パーリング":"ノーズが刺さって前転する失敗。",
    "ホワイトウォーター":"砕けた白波。ビギナーの練習にも使える。",
    "アウトサイド":"沖側のブレイクエリア。ゲティングアウト後に待つ場所。",
    "インサイド":"岸寄りの砕けたセクション。戻り時は安全確認を。",
    "ラインナップ":"沖で待つ列・エリア。優先権の秩序を守る場所。",
    "ドロップイン":"他人の優先波に割り込む反則行為。",
    "ドルフィンスルー":"崩れる波の下をくぐるテクニック（ショート向け）。",
    "トリム":"ボードの角度/重心を微調整して速度とラインを保つ。",
    "ボトムターン":"ボトムで深く踏んで方向転換し、次の技へつなぐ。",
    "カットバック":"ショルダー側へ戻ってパワーゾーンに復帰するターン。",
    "カービング":"大きくレールを使う弧のターン。",
    "フェザー":"割れ始めの白い筋。ブレイクの合図。"
  };
  const TERM_KEYS = Object.keys(TERMS);

  // ======= テンプレ（短文ピース） =======
  const P = {
    // 主語トーン
    subj: {
      beginner: ["今日は","朝イチは","自分は","ビギナーだけど"],
      intermediate: ["今日は","ミドルタイドで","最近は","自分の課題は"],
      advanced: ["コンディション的に","読みとしては","セットでは","狙いとしては"]
    },
    // 用語片
    yogo: {
      takeoff: ["テイクオフ","ピーク","フェイス","パーリング","ホワイトウォーター","ドルフィンスルー"],
      turn: ["ボトムターン","カットバック","カービング","リップ","トリム","ショルダー"],
      wait: ["ラインナップ","ピーク","ショルダー","フェザー","アウトサイド","インサイド"],
      conditions: ["ダンパー","フェイス","リップ","トップ","ボトム","ショルダー"],
      crowd: ["ラインナップ","ドロップイン","優先権","ピーク","ショルダー","アウトサイド"],
      gear: ["ボードサイズ","レール","フィン","テール形状","浮力","パドル"],
      safety: ["インサイド","アウトサイド","見張り","優先権","ホワイトウォーター","退避"],
      fail: ["パーリング","ワイプアウト","タイミング","加重","目線","ドルフィンスルー"]
    },
    // 動詞・述部（動作/所感）
    verb: {
      explain: [
        "でポジションを合わせると安定します",
        "を意識すると走りが伸びます",
        "に戻るとパワーを拾えます",
        "が甘いと失速します",
        "を見てから動くと成功率が上がります"
      ],
      diary: [
        "を狙ったけど合わず、次は修正します",
        "で合わせられて気持ちよかった",
        "に戻れず失速した…",
        "を見逃して悔しい",
        "を意識したら一本伸びた"
      ],
      sns: [
        "で安定。今日の課題クリア",
        "意識して一本伸びた！",
        "甘くて失速…次やる",
        "見逃しがち→要改善",
        "戻れば拾えるやつ"
      ],
      coach: [
        "を合図にテイクオフの角度を作りましょう",
        "の後、ボトムでしっかり溜めを作りましょう",
        "に戻ってから次の技へつなぎましょう",
        "が見えたら早めに退避判断を",
        "を使って速度を維持しましょう"
      ]
    },
    // つなぎ
    link: ["、","。"," — ","／"],
    // 文末口調
    tail: {
      desu:["。","。","。","。"],
      casual:["。","。","。","！"],
      emoji:["。🤙","！🌊","。🌀","。💪"]
    },
    // ハッシュ系
    tags: {
      takeoff:["#テイクオフ","#ピーク","#角度"],
      turn:["#ターン","#レール","#ライン取り"],
      wait:["#波待ち","#ポジション","#セット待ち"],
      conditions:["#コンディション","#面の状態","#ブレイク"],
      crowd:["#優先権","#混雑回避","#マナー"],
      gear:["#ギア","#サイズ感","#フィン"],
      safety:["#安全","#退避","#確認"],
      fail:["#反省","#次こそ","#メンタル"]
    }
  };

  // ======= 生成 =======
  function generate(forcedSeed=null){
    const seed = forcedSeed ?? (Date.now() ^ Math.floor(Math.random()*1e9));
    const rng = mulberry32(seed);

    const lvl = elLevel.value;
    const topicSel = elTopic.value;
    const topic = topicSel === "any" ? pick(Object.keys(P.yogo), rng) : topicSel;
    const style = elStyle.value;
    const tone = elTone.value;
    const nSent = Number(elSentences.value);

    const subj = pick(P.subj[lvl], rng);
    const words = P.yogo[topic].slice().sort(()=>rng()-0.5);
    const chosen = words.slice(0, Math.max(2, Math.min(3, nSent+1))); // 2〜3語

    // 文体に応じた述部
    const pool = P.verb[
      style === "explain" ? "explain" :
      style === "diary" ? "diary" :
      style === "sns" ? "sns" : "coach"
    ];

    const sents = [];
    for(let i=0;i<nSent;i++){
      const term = chosen[i % chosen.length];
      const tail = pick(P.tail[tone], rng);
      const v = pick(pool, rng);
      // 例文：主語 + 用語 + 述部
      // 文体差を少し
      const head = i===0 ? subj : pick(["それと","あと","ついでに","結果的に"], rng);
      sents.push(`${head}${P.link[0]}${term}${P.link[0]}${v}${tail}`);
    }

    // テキスト結合
    let text = sents.join(" ");

    // ハッシュタグ
    const tags = ["#サーフ構文", ...P.tags[topic]];

    // 用語注釈（本文に出てきた語のみ）
    const termsIn = Array.from(new Set(chosen.filter(t => TERMS[t])));
    const gloss = termsIn.map(t => ({ term: t, def: TERMS[t] }));

    return { seed, text, tags, lvl, topic, style, tone, gloss };
  }

  // ======= 描画 =======
  function render(obj, pushHist=false){
    elText.textContent = obj.text;
    elTags.textContent = obj.tags.join(" ");
    elSeed.textContent = `seed: ${obj.seed}`;
    elSeed.dataset.seed = String(obj.seed);

    // glossary
    glossList.innerHTML = "";
    if (!obj.gloss.length){
      const li = document.createElement("li");
      li.innerHTML = `<span class="term">（語なし）</span><span class="def">—</span>`;
      glossList.appendChild(li);
    } else {
      obj.gloss.forEach(g => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="term">${escapeHtml(g.term)}</span><span class="def">${escapeHtml(g.def)}</span>`;
        glossList.appendChild(li);
      });
    }

    if (pushHist){
      history.unshift({ ts:new Date().toISOString(), ...obj });
      if (history.length > 200) history.length = 200;
      saveJSON(LS_KEY, history);
      renderHistory();
    }
  }

  // ======= 履歴 =======
  function renderHistory(){
    histList.innerHTML = "";
    if (!history.length){
      histList.innerHTML = `<li class="item"><div class="txt">まだ履歴はありません。</div></li>`;
      return;
    }
    history.forEach(h => {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `
        <div class="row">
          <div class="txt">${escapeHtml(h.text)}</div>
          <div class="tools">
            <button class="btn btn-sm" data-k="use">使う</button>
            <button class="btn btn-sm" data-k="copy">コピー</button>
            <button class="btn btn-sm" data-k="share">共有</button>
          </div>
        </div>
        <div class="row">
          <span class="badge">${h.tags.join(" ")}</span>
          <span class="badge">seed:${h.seed}</span>
        </div>
      `;
      histList.appendChild(li);
      const [bUse, bCopy, bShare] = $$("button", li);
      bUse.addEventListener("click", () => render(h, false));
      bCopy.addEventListener("click", async () => {
        await navigator.clipboard.writeText(h.text);
        flash(bCopy, "コピーしました");
      });
      bShare.addEventListener("click", () => {
        const shareUrl = withSeedInUrl(location.href.split("#")[0], h.seed);
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(h.text+"\n"+shareUrl)}`, "_blank");
      });
    });
  }

  // ======= イベント =======
  btnGen.addEventListener("click", () => {
    const r = generate();
    render(r, true);
  });
  btnCopy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(elText.textContent.trim());
    flash(btnCopy, "コピーしました");
  });
  btnShare.addEventListener("click", () => {
    const seed = elSeed.dataset.seed || String(Date.now());
    const shareUrl = withSeedInUrl(location.href.split("#")[0], seed);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(elText.textContent.trim()+"\n"+shareUrl)}`, "_blank");
  });
  window.addEventListener("keydown", (e) => {
    if (["INPUT","SELECT","TEXTAREA"].includes(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "g") btnGen.click();
    if (k === "c") btnCopy.click();
  });

  // URLシードで再現
  const urlSeed = getHashParam("s");
  if (urlSeed){
    const parsed = parseInt(urlSeed, 10);
    const r = generate(parsed);
    render(r, false);
  }

  // ======= 共有/保存系 =======
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
  function flash(btn, msg){ const p=btn.textContent; btn.textContent=msg; setTimeout(()=>btn.textContent=p,900); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // CSV出力 & クリア（オプション：必要ならボタンをHTMLに追加）
  if (btnExport) btnExport.addEventListener("click", () => {
    const csv = toCSV(history);
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "surf_grammar.csv"; a.click();
    URL.revokeObjectURL(a.href);
  });
  if (btnClear) btnClear.addEventListener("click", () => {
    if (!confirm("履歴をすべて消しますか？")) return;
    history = []; saveJSON(LS_KEY, history); renderHistory();
  });
  function toCSV(arr){
    const header = ["time","seed","level","topic","style","tone","text","tags"];
    const lines = [header.join(",")];
    arr.forEach(x => {
      lines.push([x.ts, x.seed, x.lvl, x.topic, x.style, x.tone, q(x.text), q(x.tags.join(" "))].join(","));
    });
    return lines.join("\n");
  }
  function q(s){ const t=String(s??"").replaceAll('"','""'); return `"${t}"`; }
})();
