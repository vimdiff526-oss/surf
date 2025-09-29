"use client";

export default function ArticlesPage() {
  const articles = [
    {
      title: "初心者におすすめのサーフィン練習法",
      desc: "最初の1年で上達するために必要な基礎練習を解説。",
      img: "https://www.surfnews.jp/wp-content/uploads/2024/04/beginner.jpg", // 任意の画像
      url: "https://www.surfnews.jp/articles/12345", // 実際の記事URLに差し替え
    },
    {
      title: "最新サーフボードレビューまとめ",
      desc: "人気ブランドJS・Al Merrick・Lostの最新モデルを紹介。",
      img: "https://www.surfnews.jp/wp-content/uploads/2024/03/boardreview.jpg",
      url: "https://www.surfnews.jp/articles/67890",
    },
    {
      title: "サーフィンと健康効果の科学",
      desc: "パドリング運動が体幹と心肺機能に与える影響。",
      img: "https://www.surfnews.jp/wp-content/uploads/2024/01/health.jpg",
      url: "https://www.surfnews.jp/articles/24680",
    },
    {
      title: "海外サーフトリップ完全ガイド",
      desc: "バリ島・ハワイ・オーストラリアでのサーフ体験を徹底解説。",
      img: "https://www.surfnews.jp/wp-content/uploads/2024/02/trip.jpg",
      url: "https://www.surfnews.jp/articles/13579",
    },
  ];

  return (
    <main className="grid" style={{ gap: 20 }}>
      <section className="card">
        <h1 className="h1">関連記事まとめ</h1>
        <p className="muted">
          サーフィンの最新記事や練習法をまとめました。診断後に読んで理解を深めましょう。
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          {articles.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card"
              style={{ textDecoration: "none" }}
            >
              <img
                src={a.img}
                alt={a.title}
                style={{
                  width: "100%",
                  height: 140,
                  objectFit: "cover",
                  borderRadius: "12px",
                  marginBottom: 10,
                }}
              />
              <div className="h3">{a.title}</div>
              <p className="small muted">{a.desc}</p>
              <div className="divider" />
              <div className="badge">記事を読む</div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
