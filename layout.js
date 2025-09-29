export const metadata = {
  title: "Surf Nav | サーフボード診断SPA",
  description: "体格やスタイルから、あなたに合うサーフボードを瞬時に診断。アフェリエイト導線にも対応。"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        {/* ▼ 広告/アナリティクス（後で置き換え） */}
        {/* <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>
        <script dangerouslySetInnerHTML={{__html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date()); gtag('config', 'G-XXXX');
        `}} /> */}
        {/* <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX" crossOrigin="anonymous"></script> */}
      </head>
      <body>
        <div className="container">
          <header className="header">
            <div className="brand">🌊 <span className="brand">Surf Nav</span></div>
            <nav className="small muted">海・サーフィン診断 / 記事 / ギア</nav>
          </header>
          {children}
          <footer className="footer">
            © {new Date().getFullYear()} Surf Nav — 海がもっと近くなる。
          </footer>
        </div>
      </body>
    </html>
  );
}
