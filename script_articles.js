// ========= 設定（タクソノミの中間マッピング） =========
const STYLE_TO_TAGS = {
  cruise: ["cruise", "midlength", "fish", "readingwaves"],
  takeoff: ["takeoff", "paddle", "fundamentals", "practice"],
  maneuver: ["maneuver", "technique", "shortboard", "competition"]
};

const WAVES_TO_TAGS = {
  small: ["smallwave", "fish", "readingwaves", "wax"],
  medium: ["guide", "readingwaves", "duckdive"],
  big: ["duckdive", "safety", "shortboard", "maneuver"]
};

// ========= 状態 =========
const STATE = {
  articles: [],
  filtered: [],
  keyword: "",
  level: "",
  tag: "",
  style: "",
  waves: "",
  query: {} // URLクエリ保持
};

const els = {
  container: null,
  level: null,
  keyword: null,
  tag: null,
  reset: null
};

// ========= 初期化 =========
document.addEventListener("DOMContentLoaded", () => {
  els.container = document.getElementById("articlesContainer");
  els.level = document.getElementById("levelFilter");
  els.keyword = document.getElementById("keyword");
  els.tag = document.getElementById("tagFilter");
  els.reset = document.getElementById("resetBtn");

  parseQuery();         // URLクエリをSTATEへ
  initUIFromQuery();    // UIに反映
  attachEvents();       // フィルタ操作
  loadArticles();       // JSONロード & 初回スコアリング
});

function parseQuery() {
  const params = new URLSearchParams(location.search);
  STATE.query.level = params.get("level") || "";
  STATE.query.style = params.get("style") || params.get("tag") || ""; // 後方互換
  STATE.query.waves = params.get("waves") || "";
  STATE.level = STATE.query.level;
  STATE.style = STATE.query.style;
  STATE.waves = STATE.query.waves;
}

function initUIFromQuery() {
  if (STATE.level && els.level) els.level.value = STATE.level;
  if (STATE.style && els.tag) els.tag.value = STATE.style; // styleはtagドロップダウンにも反映
}

// ========= イベント =========
function attachEvents() {
  els.level.addEventListener("change", e => {
    STATE.level = e.target.value;
    applyAndRender();
  });
  els.keyword.addEventListener("input", e => {
    STATE.keyword = e.target.value;
    applyAndRender();
  });
  els.tag.addEventListener("change", e => {
    STATE.tag = e.target.value; // ここは自由タグフィルタ
    applyAndRender();
  });
  els.reset.addEventListener("click", () => {
    STATE.level = "";
    STATE.keyword = "";
    STATE.tag = "";
    STATE.style = "";
    STATE.waves = "";
    els.level.value = "";
    els.keyword.value = "";
    els.tag.value = "";
    STATE.filtered = STATE.articles.slice(0);
    render();
  });
}

// ========= データロード =========
async function loadArticles() {
  try {
    const res = await fetch("./articles.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    STATE.articles = data;
    applyAndRender(); // 初回スコアリング
  } catch (e) {
    console.error("記事JSONの読み込みに失敗:", e);
    if (els.container) {
      els.container.innerHTML = `<p class="muted">記事の読み込みに失敗しました。<br>ローカル直開きの場合は簡易サーバーで <code>http://localhost:…</code> から開いてください。</p>`;
    }
  }
}

// ========= コア：スコアリング & フィルタ =========
function applyAndRender() {
  // キーワード前処理
  const kw = (STATE.keyword || "").trim().toLowerCase();

  // 診断由来の望ましいタグ集合
  const desiredTags = new Set();
  if (STATE.style && STYLE_TO_TAGS[STATE.style]) {
    STYLE_TO_TAGS[STATE.style].forEach(t => desiredTags.add(t));
  }
  if (STATE.waves && WAVES_TO_TAGS[STATE.waves]) {
    WAVES_TO_TAGS[STATE.waves].forEach(t => desiredTags.add(t));
  }
  // 自由タグフィルタ（UIのタグセレクト）
  if (STATE.tag) desiredTags.add(STATE.tag);

  // スコア計算
  const scored = STATE.articles
    .map(a => {
      let score = 0;

      // level一致（強め）
      if (STATE.level && Array.isArray(a.level) && a.level.includes(STATE.level)) score += 3;

      // style一致（中）
      if (STATE.style && Array.isArray(a.style) && a.style.includes(STATE.style)) score += 2;

      // waves一致（弱〜中）
      if (STATE.waves && Array.isArray(a.waves) && a.waves.includes(STATE.waves)) score += 1;

      // タグ一致（診断派生 or UI選択タグ）
      if (desiredTags.size && Array.isArray(a.tags)) {
        for (const t of a.tags) {
          if (desiredTags.has(t)) score += 2;
        }
      }

      // キーワード簡易一致
      if (kw) {
        const text = (a.title + " " + a.desc + " " + (a.tags || []).join(" ")).toLowerCase();
        if (text.includes(kw)) score += 1.5;
      }

      return { a, score };
    })
    .sort((x, y) => y.score - x.score);

  // 上位をまず採用
  let top = scored.filter(s => s.score > 0).map(s => s.a);

  // フォールバック：何もヒットしない場合の段階措置
  if (top.length === 0) {
    // 1) levelだけで
    if (STATE.level) {
      top = STATE.articles.filter(a => Array.isArray(a.level) && a.level.includes(STATE.level));
    }
  }
  if (top.length === 0 && STATE.style) {
    // 2) styleだけで
    top = STATE.articles.filter(a => Array.isArray(a.style) && a.style.includes(STATE.style));
  }
  if (top.length === 0) {
    // 3) 人気汎用タグ（health/safety/gear等）で拾う
    const fallbackTags = new Set(["health", "safety", "gear", "guide"]);
    top = STATE.articles.filter(a => (a.tags || []).some(t => fallbackTags.has(t)));
  }
  if (top.length === 0) {
    // 4) 最終手段：全件
    top = STATE.articles.slice(0);
  }

  STATE.filtered = top;
  render();
}

// ========= 描画 =========
function render() {
  if (!els.container) return;
  if (!STATE.filtered.length) {
    els.container.innerHTML = `<p class="muted">条件に一致する記事がありません。</p>`;
    return;
  }
  els.container.innerHTML = STATE.filtered.map(a => `
    <a href="${a.url}" target="_blank" class="article" rel="noopener noreferrer">
      <img src="${a.img}" alt="${escapeHtml(a.title)}">
      <h3>${escapeHtml(a.title)}</h3>
      <p>${escapeHtml(a.desc)}</p>
    </a>
  `).join("");
}

// ========= Utils =========
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
