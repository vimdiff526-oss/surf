// api/rakuten.js
export default async function handler(req, res) {
  try {
    const { keyword = "", hits = "12", minPrice = "", maxPrice = "" } = req.query;
    const appId = process.env.RAKUTEN_APP_ID;
    if (!appId) return res.status(500).json({ error: "RAKUTEN_APP_ID not set" });
    if (!keyword) return res.status(400).json({ error: "keyword is required" });

    const url = new URL("https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706");
    url.searchParams.set("applicationId", appId);
    url.searchParams.set("format", "json");
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("hits", hits);
    url.searchParams.set("imageFlag", "1");
    url.searchParams.set("availability", "1");
    url.searchParams.set("sort", "+itemPrice");
    if (minPrice) url.searchParams.set("minPrice", String(minPrice));
    if (maxPrice) url.searchParams.set("maxPrice", String(maxPrice));

    const r = await fetch(url.toString());
    if (!r.ok) throw new Error(`Rakuten API HTTP ${r.status}`);
    const data = await r.json();

    const items = (data.Items || []).map(({ Item: x }) => ({
      id: x.itemCode,
      name: x.itemName,
      url: x.itemUrl,
      price: x.itemPrice,
      shop: x.shopName,
      image:
        x.mediumImageUrls?.[0]?.imageUrl?.replace("?_ex=128x128", "") ||
        x.smallImageUrls?.[0]?.imageUrl ||
        null
    }));

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ count: items.length, items });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
