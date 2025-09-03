// api/rakuten_loose.js
// 「まずは表示されること」を最優先にした超ゆる検索エンドポイント
// 必要環境変数: RAKUTEN_APP_ID

import https from "node:https";

// Node.js 16 などで fetch が存在しない場合に備えて簡易実装を用意
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: async () => JSON.parse(data),
          })
        );
      })
      .on("error", reject);
  });
}

export default async function handler(req, res) {
  try {
    const {
      keyword = "",      // 未指定ならデフォルト語を使う
      hits = "30",       // API上限30
      minPrice = "",
      maxPrice = "",
      page = "",
      sort = "+itemPrice" // 必要なら -updateTimestamp とかに変更可
    } = req.query;

    const appId = process.env.RAKUTEN_APP_ID;
    if (!appId) return res.status(500).json({ error: "RAKUTEN_APP_ID not set" });

    // “とりあえず拾う”ためのデフォルト語彙
    const kw = (keyword && keyword.trim().length > 0)
      ? keyword
      : "サーフボード ショート ミッド ロング フィッシュ ツイン";

    const url = new URL("https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601");
    url.searchParams.set("applicationId", appId);
    url.searchParams.set("format", "json");
    url.searchParams.set("formatVersion", "2");   // フラット配列
    url.searchParams.set("keyword", kw);
    url.searchParams.set("hits", String(Math.min(Number(hits) || 30, 30)));
    url.searchParams.set("orFlag", "1");          // 語を OR マッチ
    url.searchParams.set("field", "0");           // 広い検索
    url.searchParams.set("availability", "0");    // 売切も含む（まず候補を見たい）
    url.searchParams.set("imageFlag", "0");       // 画像なしも許容（ヒット優先）
    url.searchParams.set("sort", sort);

    if (minPrice) url.searchParams.set("minPrice", String(minPrice));
    if (maxPrice) url.searchParams.set("maxPrice", String(maxPrice));
    if (page) url.searchParams.set("page", String(page));

    const fetchFn = globalThis.fetch || fetchJson;
    const resp = await fetchFn(url.toString());
    if (!resp.ok) throw new Error(`Rakuten API HTTP ${resp.status}`);
    const data = await resp.json();

    const raw = Array.isArray(data.items) ? data.items
              : Array.isArray(data.Items) ? data.Items.map(({ Item }) => Item)
              : [];

    const items = raw.map((x) => ({
      id: x.itemCode,
      name: x.itemName,
      url: x.itemUrl,
      price: x.itemPrice,
      shop: x.shopName,
      // 画像なし許容なのでプレースホルダに委ねる
      image:
        x.mediumImageUrls?.[0]?.imageUrl?.replace("?_ex=128x128", "") ||
        x.smallImageUrls?.[0]?.imageUrl || null
    }));

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    return res.status(200).json({ count: items.length, items, usedKeyword: kw });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
