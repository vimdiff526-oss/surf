// api/rakuten.js
// 楽天 Ichiba Item Search API を叩いて、最低限の項目に整形して返す。
// 必要環境変数: RAKUTEN_APP_ID
// メモ: 20220601 に更新。formatVersion=2 を優先しつつ、旧フォーマット(20170706)も吸収。

export default async function handler(req, res) {
  try {
    const {
      keyword = "",
      hits = "12",
      minPrice = "",
      maxPrice = "",
      field = "",       // 0=広い検索, 1=絞り込み（既定）
      orFlag = "",      // 1=OR検索
      NGKeyword = "",   // 除外キーワード（半角空白区切り）
      page = "",
      sort = "+itemPrice",
      availability = "", // 0=すべて, 1=在庫あり（既定）
      genreId = "",     // あれば指定
    } = req.query;

    const appId = process.env.RAKUTEN_APP_ID;
    if (!appId) return res.status(500).json({ error: "RAKUTEN_APP_ID not set" });
    if (!keyword) return res.status(400).json({ error: "keyword is required" });

    const url = new URL("https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601");
    url.searchParams.set("applicationId", appId);
    url.searchParams.set("format", "json");
    url.searchParams.set("formatVersion", "2"); // フラット配列で受ける
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("hits", String(Math.min(Number(hits) || 12, 30))); // API上限30
    url.searchParams.set("imageFlag", "1");
    url.searchParams.set("sort", sort || "+itemPrice");
    if (minPrice) url.searchParams.set("minPrice", String(minPrice));
    if (maxPrice) url.searchParams.set("maxPrice", String(maxPrice));
    if (field) url.searchParams.set("field", String(field));
    if (orFlag) url.searchParams.set("orFlag", String(orFlag));
    if (NGKeyword) url.searchParams.set("NGKeyword", String(NGKeyword));
    if (page) url.searchParams.set("page", String(page));
    if (availability !== "") url.searchParams.set("availability", String(availability)); // 空でなければ反映
    if (genreId) url.searchParams.set("genreId", String(genreId));

    const resp = await fetch(url.toString());
    if (!resp.ok) throw new Error(`Rakuten API HTTP ${resp.status}`);
    const data = await resp.json();

    // formatVersion=2 → data.items、旧版だと data.Items[].Item
    const rawItems = (Array.isArray(data.items) && data.items.length)
      ? data.items
      : (Array.isArray(data.Items) ? data.Items.map(({ Item }) => Item) : []);

    const items = rawItems.map((x) => ({
      id: x.itemCode,
      name: x.itemName,
      url: x.itemUrl,
      price: x.itemPrice,
      shop: x.shopName,
      image:
        (x.mediumImageUrls?.[0]?.imageUrl?.replace("?_ex=128x128", "")) ||
        (x.smallImageUrls?.[0]?.imageUrl) ||
        null
    }));

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ count: items.length, items });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
