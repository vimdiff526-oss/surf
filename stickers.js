(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // --------------------------
  // 追加カテゴリの説明
  // - 禁止ワード風ロゴ：NO SHORE / MIDDLE OF CITY / DESK SURF ONLY など
  // - メーカーロゴ風：幾何学アイコン + 2語テキスト
  // - ご当地版：地名を差し替えて量産
  // --------------------------

  // --------------------------
  // ステッカー定義（SVGを動的生成）
  // --------------------------
  const baseDesigns = [
    // 既存（スポンサー/認定/スローガン）
    {
      id: "sponsor-waveplus",
      title: "WAVE++ | 擬似スポンサー",
      tags: ["sponsor", "wave", "logo"],
      badge: ["矩形", "白地", "太字"],
      svg: (w=800, h=534) => sponsorRect({
        w,h, bg:"#ffffff", border:"#111827", text1:"WAVE", text2:"++",
        t1Color:"#111827", t2Color:"#22c55e"
      })
    },
    {
      id: "dry-fish-energy",
      title: "DRY FISH ENERGY | 擬似スポンサー",
      tags: ["sponsor", "energy", "logo"],
      badge: ["横長", "黒地", "蛍光"],
      svg: (w=800, h=400) => sponsorRect({
        w,h, bg:"#0b1220", border:"#22d3ee", text1:"DRY FISH", text2:"ENERGY",
        t1Color:"#e2e8f0", t2Color:"#22d3ee"
      })
    },
    {
      id: "oka-surfer-cert",
      title: "丘サーファー認定証",
      tags: ["badge", "joke", "license"],
      badge: ["丸型", "認定", "白抜き"],
      svg: (w=600, h=600) => roundBadge({
        w,h, base:"#0ea5e9", ring:"#ffffff", text:"OKA SURFER CERTIFIED"
      })
    },
    {
      id: "no-surf-no-life",
      title: "NO SURF NO LIFE（逆張り）",
      tags: ["slogan", "joke"],
      badge: ["横長", "白黒", "大文字"],
      svg: (w=900, h=300) => sloganRect({
        w,h, bg:"#ffffff", fg:"#111827", text:"NO SURF NO LIFE",
        sub:"*but maybe later"
      })
    },
    {
      id: "air-surfer",
      title: "AIR SURFER（空想スポンサー）",
      tags: ["sponsor", "air", "logo"],
      badge: ["楕円", "グラデ", "アイコン"],
      svg: (w=820, h=480) => ovalSponsor({
        w,h, grad1:"#22c55e", grad2:"#06b6d4", title:"AIR SURFER", sub:"OFFICIAL"
      })
    },
    {
      id: "wave-tax-free",
      title: "WAVE TAX FREE（免税っぽい）",
      tags: ["sponsor", "tax", "joke"],
      badge: ["矩形", "赤系", "太字"],
      svg: (w=820, h=420) => sponsorRect({
        w,h, bg:"#ffe4e6", border:"#ef4444", text1:"WAVE", text2:"TAX FREE",
        t1Color:"#ef4444", t2Color:"#111827"
      })
    },
  ];

  // 禁止ワード風ロゴ（3種）
  const prohibited = [
    { id: "no-shore",      main: "NO SHORE",      sub: "CITY BREAK ONLY", color: "#ef4444" },
    { id: "middle-of-city",main: "MIDDLE OF CITY",sub: "LANDLOCKED CREW", color: "#f59e0b" },
    { id: "desk-surf-only",main: "DESK SURF ONLY",sub: "OFFICE WAVES",     color: "#22c55e" },
  ].map((p) => ({
    id: `ban-${p.id}`,
    title: `${p.main}｜禁止ワード風ロゴ`,
    tags: ["ban","joke","logo","slogan"],
    badge: ["斜線","強調","コントラスト"],
    svg: (w=860, h=420) => prohibitedRect({
      w,h,
      bg:"#0b1220", border:p.color, stripe:p.color,
      title:p.main, sub:p.sub
    })
  }));

  // メーカーロゴ風（幾何アイコン＋2語）
  const makers = [
    { id:"deep-blue-labs",  a:"DEEP",  b:"BLUE LABS",  grad1:"#3b82f6", grad2:"#06b6d4", icon:"hex"},
    { id:"foam-core-works", a:"FOAM",  b:"CORE WORKS", grad1:"#22c55e", grad2:"#84cc16", icon:"tri"},
    { id:"salt-tech",       a:"SALT",  b:"TECH",       grad1:"#f59e0b", grad2:"#ef4444", icon:"dot"},
  ].map(m => ({
    id: `mk-${m.id}`,
    title: `${m.a} ${m.b}｜メーカーロゴ風`,
    tags: ["maker","logo","brand"],
    badge: ["幾何アイコン","グラデ","横長"],
    svg: (w=900, h=360) => makerLogo({
      w,h, a:m.a, b:m.b, grad1:m.grad1, grad2:m.grad2, icon:m.icon
    })
  }));

  // ご当地版（地名差し替え大量生産）
  const localNames = [
    "湘南","鵠沼","辻堂","鎌倉","千葉一宮","九十九里","新島","種子島",
    "宮崎日向","高知生見","福岡糸島","石垣島","小倉ヶ浜","平砂浦"
  ];
  const locals = localNames.map(name => ({
    id: `local-${slug(name)}`,
    title: `ご当地版｜${name} SURF`,
    tags: ["local","place","logo"],
    badge: ["丸型","ご当地","白抜き"],
    svg: (w=620, h=620) => localBadge({
      w,h, name, base:"#0ea5e9"
    })
  }));

  const designs = [
    ...baseDesigns,
    ...prohibited,
    ...makers,
    ...locals
  ];

  // --------------------------
  // SVGビルダー
  // --------------------------
  function sponsorRect({w,h,bg,border,text1,text2,t1Color,t2Color}) {
    const rx = Math.round(Math.min(w,h) * 0.06);
    const pad = Math.round(w * 0.06);
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="s${hash(text1+text2)}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.2"/>
    </filter>
  </defs>
  <rect x="6" y="6" width="${w-12}" height="${h-12}" rx="${rx}" fill="${bg}" stroke="${border}" stroke-width="12" filter="url(#s${hash(text1+text2)})"/>
  <g font-family="system-ui, sans-serif" font-weight="800">
    <text x="${pad}" y="${h/2}" dominant-baseline="middle" font-size="${Math.min(w,h)*0.24}" fill="${t1Color}">${esc(text1)}</text>
    <text x="${pad}" y="${h*0.72}" font-size="${Math.min(w,h)*0.18}" fill="${t2Color}">${esc(text2)}</text>
  </g>
</svg>`;
  }

  function roundBadge({w,h,base,ring="#ffffff",text}) {
    const r = Math.min(w,h)/2 - 12;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g${hash(text)}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${base}"/>
      <stop offset="1" stop-color="#0ea5e980"/>
    </linearGradient>
  </defs>
  <circle cx="${w/2}" cy="${h/2}" r="${r}" fill="url(#g${hash(text)})" stroke="${ring}" stroke-width="18"/>
  <g font-family="system-ui, sans-serif" font-weight="900" fill="#ffffff" text-anchor="middle">
    <text x="${w/2}" y="${h/2}" font-size="${r*0.28}" dominant-baseline="central">${esc(text)}</text>
  </g>
</svg>`;
  }

  function sloganRect({w,h,bg,fg,text,sub}) {
    const rx = Math.round(Math.min(w,h) * 0.08);
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="${bg}" stroke="${fg}" stroke-width="8"/>
  <g font-family="system-ui, sans-serif" text-anchor="middle">
    <text x="${w/2}" y="${h*0.54}" font-weight="900" font-size="${h*0.36}" fill="${fg}" dominant-baseline="middle">${esc(text)}</text>
    <text x="${w/2}" y="${h*0.80}" font-weight="600" font-size="${h*0.12}" fill="${fg}" opacity="0.6">${esc(sub)}</text>
  </g>
</svg>`;
  }

  function ovalSponsor({w,h,grad1,grad2,title,sub}) {
    const pad = Math.min(w,h)*0.08;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="lg${hash(title)}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${grad1}"/>
      <stop offset="1" stop-color="${grad2}"/>
    </linearGradient>
  </defs>
  <ellipse cx="${w/2}" cy="${h/2}" rx="${w/2 - pad}" ry="${h/2 - pad}" fill="url(#lg${hash(title)})" stroke="#ffffff" stroke-width="12"/>
  <g font-family="system-ui, sans-serif" text-anchor="middle" fill="#ffffff">
    <text x="${w/2}" y="${h/2 - h*0.04}" font-weight="900" font-size="${h*0.22}">${esc(title)}</text>
    <text x="${w/2}" y="${h/2 + h*0.16}" font-weight="700" font-size="${h*0.12}" opacity="0.9">${esc(sub)}</text>
  </g>
</svg>`;
  }

  // 禁止ワード風：斜線ストライプ＋強コントラスト
  function prohibitedRect({w,h,bg,border,stripe,title,sub}) {
    const rx = Math.round(Math.min(w,h) * 0.06);
    const gid = `pat${hash(title)}`;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <defs>
    <pattern id="${gid}" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(-20)">
      <rect width="40" height="40" fill="${bg}"/>
      <rect width="20" height="40" fill="${shade(bg, 0.15)}"/>
    </pattern>
  </defs>
  <rect x="6" y="6" width="${w-12}" height="${h-12}" rx="${rx}" fill="url(#${gid})" stroke="${border}" stroke-width="12"/>
  <g font-family="system-ui, sans-serif" text-anchor="middle">
    <text x="${w/2}" y="${h*0.48}" font-weight="900" font-size="${h*0.22}" fill="#fff" letter-spacing="2">${esc(title)}</text>
    <text x="${w/2}" y="${h*0.76}" font-weight="700" font-size="${h*0.12}" fill="${border}" opacity="0.95">${esc(sub)}</text>
  </g>
</svg>`;
  }

  // メーカーロゴ風：幾何学アイコン＋2語
  function makerLogo({w,h,a,b,grad1,grad2,icon}) {
    const gid = `grad${hash(a+b)}`;
    const iconEl = makerIcon(icon, w, h);
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${grad1}"/>
      <stop offset="1" stop-color="${grad2}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${w}" height="${h}" rx="${Math.min(w,h)*0.06}" fill="#0b1220" stroke="url(#${gid})" stroke-width="10"/>
  ${iconEl}
  <g font-family="system-ui, sans-serif" fill="#e5e7eb" font-weight="800">
    <text x="${w*0.36}" y="${h*0.50}" font-size="${h*0.22}">${esc(a)}</text>
    <text x="${w*0.36}" y="${h*0.78}" font-size="${h*0.18}" fill="url(#${gid})">${esc(b)}</text>
  </g>
</svg>`;
  }

  function makerIcon(type, w, h) {
    const cx = w*0.16, cy = h*0.5, R = Math.min(w,h)*0.22;
    const stroke = "#ffffff";
    if (type === "hex") {
      const pts = polygonPoints(6, cx, cy, R*0.72);
      return `<polygon points="${pts}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`;
    }
    if (type === "tri") {
      const pts = polygonPoints(3, cx, cy, R*0.82);
      return `<polygon points="${pts}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`;
    }
    // dot
    return `<circle cx="${cx}" cy="${cy}" r="${R*0.55}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`;
  }

  // ご当地版：丸バッジの上弦/下弦に表示
  function localBadge({w,h,name,base}) {
    const r = Math.min(w,h)/2 - 10;
    const top = `${name} SURF`;
    const bottom = `LOCAL PRIDE`;
    const gid = `lg${hash(name)}`;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="${gid}" cx="50%" cy="38%" r="70%">
      <stop offset="0%" stop-color="${lighten(base,0.25)}"/>
      <stop offset="100%" stop-color="${base}"/>
    </radialGradient>
  </defs>
  <circle cx="${w/2}" cy="${h/2}" r="${r}" fill="url(#${gid})" stroke="#fff" stroke-width="14"/>
  <g font-family="system-ui, sans-serif" text-anchor="middle" fill="#ffffff">
    <text x="${w/2}" y="${h/2 - r*0.25}" font-weight="900" font-size="${r*0.28}">${esc(top)}</text>
    <text x="${w/2}" y="${h/2 + r*0.30}" font-weight="700" font-size="${r*0.18}" opacity="0.95">${esc(bottom)}</text>
  </g>
</svg>`;
  }

  // --------------------------
  // 描画＆UI
  // --------------------------
  const grid = $("#grid");
  const tagsEl = $("#tags");
  const allTags = Array.from(new Set(designs.flatMap(d => d.tags))).sort();

  const active = new Set();
  allTags.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "tag";
    btn.textContent = `#${t}`;
    btn.dataset.tag = t;
    btn.addEventListener("click", () => {
      if (active.has(t)) active.delete(t); else active.add(t);
      btn.classList.toggle("active");
      render();
    });
    tagsEl.appendChild(btn);
  });

  $("#q").addEventListener("input", render);

  render();

  function render() {
    grid.innerHTML = "";
    const q = $("#q").value.trim().toLowerCase();

    designs
      .filter(d => {
        const tagOk = active.size === 0 || d.tags.some(t => active.has(t));
        const qOk = !q || (d.title.toLowerCase().includes(q) || d.tags.join(" ").includes(q));
        return tagOk && qOk;
      })
      .forEach(d => {
        const card = document.createElement("article");
        card.className = "card";
        const svgSmall = d.svg(800, Math.round(800*0.6));
        card.innerHTML = `
          <div class="preview" aria-label="${escapeHtml(d.title)} のプレビュー">${svgSmall}</div>
          <div class="meta">
            <h3>${escapeHtml(d.title)}</h3>
            <div class="badges">
              ${d.badge.map(b => `<span class="badge">${escapeHtml(b)}</span>`).join("")}
            </div>
            <div class="actions">
              <button class="btn" data-action="svg" data-id="${d.id}">SVG</button>
              <button class="btn" data-action="png512" data-id="${d.id}">PNG 512px</button>
              <button class="btn" data-action="png1024" data-id="${d.id}">PNG 1024px</button>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });

    $$(".actions .btn", grid).forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const design = designs.find(d => d.id === id);
        if (!design) return;

        if (action === "svg") {
          const svg = design.svg();
          downloadText(svg, `${id}.svg`, "image/svg+xml");
        } else if (action === "png512") {
          const svg = design.svg(); await svgToPngDownload(svg, 512, `${id}-512.png`);
        } else if (action === "png1024") {
          const svg = design.svg(); await svgToPngDownload(svg, 1024, `${id}-1024.png`);
        }
      });
    });
  }

  // --------------------------
  // ユーティリティ
  // --------------------------
  function downloadText(text, filename, mime) {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a);
    a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  async function svgToPngDownload(svgString, px, filename) {
    const svg64 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
    const img = new Image();
    const [w,h] = readViewbox(svgString) || [1024, 512];
    const canvas = document.createElement("canvas");
    const ratio = w / h;
    const destW = px;
    const destH = Math.round(px / ratio);
    canvas.width = destW; canvas.height = destH;
    const ctx = canvas.getContext("2d");
    await new Promise(res => { img.onload = res; img.src = svg64; });
    ctx.clearRect(0,0,destW,destH);
    ctx.drawImage(img, 0, 0, destW, destH);
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; document.body.appendChild(a);
      a.click(); a.remove(); URL.revokeObjectURL(url);
    }, "image/png");
  }

  function readViewbox(svg) {
    const m = svg.match(/viewBox="([\d.\s-]+)"/i);
    if (!m) return null;
    const parts = m[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4) return [parts[2], parts[3]];
    return null;
  }

  function polygonPoints(n, cx, cy, r) {
    const pts = [];
    for (let i=0; i<n; i++) {
      const a = -Math.PI/2 + i * (2*Math.PI/n);
      pts.push((cx + r*Math.cos(a)).toFixed(1) + "," + (cy + r*Math.sin(a)).toFixed(1));
    }
    return pts.join(" ");
  }

  function esc(s){ return String(s); }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function hash(s){
    let h = 0; for (let i=0;i<s.length;i++){ h = (h<<5)-h + s.charCodeAt(i); h|=0; }
    return Math.abs(h);
  }
  function slug(s){
    return String(s).normalize("NFKD").replace(/[^\w\s-]/g,"").trim().replace(/\s+/g,"-").toLowerCase();
  }
  function shade(hex, amt=0.2){
    // hex: #0b1220 → 暗め/明るめ
    const c = hex.replace("#","");
    const n = parseInt(c,16);
    let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    r=Math.max(0,Math.min(255,Math.round(r*(1-amt))));
    g=Math.max(0,Math.min(255,Math.round(g*(1-amt))));
    b=Math.max(0,Math.min(255,Math.round(b*(1-amt))));
    return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }
  function lighten(hex, amt=0.2){
    const c = hex.replace("#","");
    const n = parseInt(c,16);
    let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    r=Math.max(0,Math.min(255,Math.round(r+(255-r)*amt)));
    g=Math.max(0,Math.min(255,Math.round(g+(255-g)*amt)));
    b=Math.max(0,Math.min(255,Math.round(b+(255-b)*amt)));
    return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }
})();
