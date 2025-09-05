// api/surfnews.js
// THE SURF NEWS のRSSフィードから最新記事を取得し、サムネ画像つきでJSON返却
// 依存ライブラリなし（正規表現で簡易パース） / Vercel Serverless Function想定

export default async function handler(req, res) {
  const feedUrl = "https://www.surfnews.jp/feed"; // WordPress標準RSS（最新）
  const limit = Math.max(1, Math.min(12, Number(req.query.limit) || 4));

  try {
    const r = await fetch(feedUrl, { headers: { "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8" } });
    if (!r.ok) {
      return json(res, 502, { ok: false, error: `Upstream HTTP ${r.status}` });
    }
    const xml = await r.text();

    // --- item分割（かなり単純なパーサ。WPの一般的な構造を想定） ---
    const rawItems = xml.split(/<item>/).slice(1); // 最初のフィードメタを除外
    const items = [];

    for (const raw of rawItems) {
      if (items.length >= limit) break;

      const title = unesc(extractCdata(raw, "title")) || "";
      const link = extractText(raw, "link") || extractCdata(raw, "link") || "";
      const pubDate = extractText(raw, "pubDate") || "";
      const category = extractCdata(raw, "category") || "News";

      // 画像抽出：content:encoded または description 内の最初の <img src="...">
      const content = extractCdata(raw, "content:encoded") || extractCdata(raw, "description") || "";
      const img = extractFirstImage(content);

      // 念のため空リンクは除外
      if (!link || !title) continue;

      items.push({
        title: stripHtml(title),
        link: link.trim(),
        date: new Date(pubDate || Date.now()).toISOString(),
        category: stripHtml(category),
        image: img
      });
    }

    // キャッシュ（CDNキャッシュ: 30分 / SWR: 24h）
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=86400");

    return json(res, 200, { ok: true, count: items.length, items });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
}

/* ===== ユーティリティ ===== */
function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function extractText(src, tag) {
  const m = src.match(new RegExp(`<${escapeTag(tag)}>([\\s\\S]*?)<\\/${escapeTag(tag)}>`, "i"));
  return m ? m[1].trim() : "";
}

function extractCdata(src, tag) {
  // <![CDATA[ ... ]]> にも通常テキストにも対応
  const re = new RegExp(`<${escapeTag(tag)}>([\\s\\S]*?)<\\/${escapeTag(tag)}>`, "i");
  const m = src.match(re);
  if (!m) return "";
  const val = m[1];
  const c = val.match(/<!\[CDATA\[(.*?)\]\]>/s);
  return (c ? c[1] : val).trim();
}

function extractFirstImage(html) {
  if (!html) return null;
  // content:encoded/description 内の最初の img src
  const m = html.match(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))["'][^>]*>/i);
  if (m) return sanitizeUrl(m[1]);

  // fallback: 画像URLらしき文字列
  const m2 = html.match(/https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp)/i);
  return m2 ? sanitizeUrl(m2[0]) : null;
}

function sanitizeUrl(url) {
  // WordPress 生成のサイズ付きパラメータをそのまま利用（軽量）
  return url.replace(/&amp;/g, "&");
}

function unesc(s) {
  return (s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function stripHtml(s) {
  return (s || "").replace(/<[^>]*>/g, "").trim();
}

function escapeTag(t) {
  // content:encoded 等のコロンをそのまま扱えるように
  return t.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}
