(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ======== モバイルDL互換レイヤ ==========================
  // iOS Safari等の a[download] / Blob download 非対応に対応
  const isIOS = /iP(hone|od|ad)/.test(navigator.platform) ||
                (/Mac/.test(navigator.userAgent) && "ontouchend" in document) ||
                /iOS|iPhone|iPad|CriOS|FxiOS|Safari/.test(navigator.userAgent) && "ontouchend" in document;
  const supportsDownloadAttr = 'download' in document.createElement('a');

  function ensureToastStyle(){
    if ($('#toast-style')) return;
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `
      .toast{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:9999;
        background:#0f1729;color:#e2e8f0;border:1px solid #1f2b3f;border-radius:12px;padding:10px 14px;
        box-shadow:0 6px 18px rgba(0,0,0,.25);font:600 13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
    `;
    document.head.appendChild(style);
  }
  function toast(msg){
    ensureToastStyle();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; }, 1800);
    setTimeout(()=>{ el.remove(); }, 2200);
  }

  function openInNewTab(blob, filename){
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) toast('新しいタブを開けませんでした。ポップアップを許可してください。');
    setTimeout(()=> URL.revokeObjectURL(url), 20000);
  }

  function downloadBlobSmart(blob, filename){
    if (supportsDownloadAttr && !isIOS){
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 1000);
    } else {
      openInNewTab(blob, filename);
      toast('長押しで「写真を保存」してください（モバイル）');
    }
  }

  function downloadTextSmart(text, filename, mime){
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    downloadBlobSmart(blob, filename);
  }

  async function svgToPngBlob(svgString, px){
    const svg64 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    const img = new Image();
    const [w,h] = readViewbox(svgString) || [1024, 512];
    const ratio = w / h; const destW = px; const destH = Math.round(px / ratio);
    const canvas = document.createElement('canvas'); canvas.width = destW; canvas.height = destH;
    const ctx = canvas.getContext('2d');
    await new Promise(res => { img.onload = res; img.src = svg64; });
    ctx.clearRect(0,0,destW,destH); ctx.drawImage(img, 0, 0, destW, destH);
    return await new Promise(res => canvas.toBlob(res, 'image/png'));
  }

  // ======== デザイン定義（前回版＋丘サーファー追加） ========
  // 省スペースのため、関数は下部。ここでは設計配列のみを列挙
  const designs = buildDesigns();

  // ======== UI描画 =========================================
  const grid = $("#grid");
  const tagsEl = $("#tags");
  const allTags = Array.from(new Set(designs.flatMap(d => d.tags))).sort();
  const active = new Set();

  allTags.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'tag'; btn.textContent = `#${t}`; btn.dataset.tag = t;
    btn.addEventListener('click', () => { if (active.has(t)) active.delete(t); else active.add(t); btn.classList.toggle('active'); render(); });
    tagsEl.appendChild(btn);
  });
  $("#q").addEventListener('input', render);
  render();

  function render(){
    grid.innerHTML = '';
    const q = $("#q").value.trim().toLowerCase();
    designs
      .filter(d => (active.size===0 || d.tags.some(t=>active.has(t))) && (!q || d.title.toLowerCase().includes(q) || d.tags.join(' ').includes(q)))
      .forEach(d => {
        const card = document.createElement('article');
        card.className = 'card';
        const svgSmall = d.svg(900, Math.round(900*0.6));
        card.innerHTML = `
          <div class="preview" aria-label="${escapeHtml(d.title)} のプレビュー">${svgSmall}</div>
          <div class="meta">
            <h3>${escapeHtml(d.title)}</h3>
            <div class="badges">${d.badge.map(b=>`<span class="badge">${escapeHtml(b)}</span>`).join('')}</div>
            <div class="actions">
              <button class="btn" data-act="svg" data-id="${d.id}">SVG</button>
              <button class="btn" data-act="png" data-size="512" data-id="${d.id}">PNG 512px</button>
              <button class="btn" data-act="png" data-size="1024" data-id="${d.id}">PNG 1024px</button>
            </div>
          </div>`;
        grid.appendChild(card);
      });

    $$('.actions .btn', grid).forEach(btn => btn.addEventListener('click', onAction));
  }

  async function onAction(e){
    const btn = e.currentTarget; const id = btn.dataset.id; const act = btn.dataset.act; const size = Number(btn.dataset.size||0);
    const design = designs.find(d=>d.id===id); if (!design) return;
    if (act==='svg'){
      const svg = design.svg();
      downloadTextSmart(svg, `${id}.svg`, 'image/svg+xml');
    } else if (act==='png'){
      const svg = design.svg();
      const blob = await svgToPngBlob(svg, size||1024);
      downloadBlobSmart(blob, `${id}-${size||1024}.png`);
    }
  }

  // ======== デザインビルド（前回回答の内容を集約） ========
  function buildDesigns(){
    const list = [];
    // 既存スポンサー風
    list.push({ id:'sponsor-waveplus', title:'WAVE++ | 擬似スポンサー', tags:['sponsor','wave','logo'], badge:['矩形','白地','太字'],
      svg:(w=800,h=534)=> withFrame({w,h, stroke:'#111827', strokeW:12, bg:'#ffffff', body:(x,y,W,H)=> sponsorRectBody({x,y,W,H, text1:'WAVE', text2:'++', t1:'#111827', t2:'#22c55e'})}) });
    list.push({ id:'dry-fish-energy', title:'DRY FISH ENERGY | 擬似スポンサー', tags:['sponsor','energy','logo'], badge:['横長','黒地','蛍光'],
      svg:(w=880,h=420)=> withFrame({w,h, stroke:'#22d3ee', strokeW:12, bg:'#0b1220', body:(x,y,W,H)=> sponsorRectBody({x,y,W,H, text1:'DRY FISH', text2:'ENERGY', t1:'#e2e8f0', t2:'#22d3ee'})}) });
    list.push({ id:'oka-surfer-cert', title:'丘サーファー認定証', tags:['badge','joke','license'], badge:['丸型','認定','白抜き'],
      svg:(w=620,h=620)=> withFrame({w,h, stroke:'#ffffff', strokeW:14, bg:'#0ea5e9', body:(x,y,W,H)=> roundBadgeBody({x,y,W,H, text:'OKA SURFER CERTIFIED'})}) });
    list.push({ id:'no-surf-no-life', title:'NO SURF NO LIFE（逆張り）', tags:['slogan','joke'], badge:['横長','白黒','大文字'],
      svg:(w=900,h=320)=> withFrame({w,h, stroke:'#111827', strokeW:8, bg:'#ffffff', body:(x,y,W,H)=> sloganBody({x,y,W,H, fg:'#111827', text:'NO SURF NO LIFE', sub:'*but maybe later'})}) });
    list.push({ id:'air-surfer', title:'AIR SURFER（空想スポンサー）', tags:['sponsor','air','logo'], badge:['楕円','グラデ','アイコン'],
      svg:(w=860,h=480)=> withFrame({w,h, stroke:'#ffffff', strokeW:12, bg:'#0b1220', body:(x,y,W,H)=> ovalSponsorBody({x,y,W,H, grad1:'#22c55e', grad2:'#06b6d4', title:'AIR SURFER', sub:'OFFICIAL'})}) });
    list.push({ id:'wave-tax-free', title:'WAVE TAX FREE（免税っぽい）', tags:['sponsor','tax','joke'], badge:['矩形','赤系','太字'],
      svg:(w=860,h=420)=> withFrame({w,h, stroke:'#ef4444', strokeW:12, bg:'#ffe4e6', body:(x,y,W,H)=> sponsorRectBody({x,y,W,H, text1:'WAVE', text2:'TAX FREE', t1:'#ef4444', t2:'#111827'})}) });

    // 禁止ワード風
    [
      { id:'no-shore', main:'NO SHORE', sub:'CITY BREAK ONLY', color:'#ef4444' },
      { id:'middle-of-city', main:'MIDDLE OF CITY', sub:'LANDLOCKED CREW', color:'#f59e0b' },
      { id:'desk-surf-only', main:'DESK SURF ONLY', sub:'OFFICE WAVES', color:'#22c55e' }
    ].forEach(p => list.push({
      id:`ban-${p.id}`, title:`${p.main}｜禁止ワード風ロゴ`, tags:['ban','joke','logo','slogan'], badge:['斜線','強調','コントラスト'],
      svg:(w=880,h=420)=> withFrame({w,h, stroke:p.color, strokeW:12, bg:'#0b1220', body:(x,y,W,H)=> prohibitedBody({x,y,W,H, border:p.color, stripe:p.color, title:p.main, sub:p.sub})})
    }));

    // メーカーロゴ風
    [
      { id:'deep-blue-labs', a:'DEEP',  b:'BLUE LABS',  grad1:'#3b82f6', grad2:'#06b6d4', icon:'hex'},
      { id:'foam-core-works', a:'FOAM',  b:'CORE WORKS', grad1:'#22c55e', grad2:'#84cc16', icon:'tri'},
      { id:'salt-tech',       a:'SALT',  b:'TECH',       grad1:'#f59e0b', grad2:'#ef4444', icon:'dot'}
    ].forEach(m => list.push({
      id:`mk-${m.id}`, title:`${m.a} ${m.b}｜メーカーロゴ風`, tags:['maker','logo','brand'], badge:['幾何アイコン','グラデ','横長'],
      svg:(w=900,h=360)=> withFrame({w,h, stroke:'#ffffff', strokeW:10, bg:'#0b1220', body:(x,y,W,H)=> makerBody({x,y,W,H, a:m.a, b:m.b, grad1:m.grad1, grad2:m.grad2, icon:m.icon})})
    }));

    // ご当地
    ['湘南','鵠沼','辻堂','鎌倉','千葉一宮','九十九里','新島','種子島','宮崎日向','高知生見','福岡糸島','石垣島','小倉ヶ浜','平砂浦']
      .forEach(name => list.push({ id:`local-${slug(name)}`, title:`ご当地版｜${name} SURF`, tags:['local','place','logo'], badge:['丸型','ご当地','白抜き'],
        svg:(w=620,h=620)=> withFrame({w,h, stroke:'#ffffff', strokeW:14, bg:'#0ea5e9', body:(x,y,W,H)=> localBody({x,y,W,H, name})}) }));

    // 丘サーファー風イラスト
    list.push({ id:'oka-coffee-board', title:'OKA SURFER｜COFFEE & BOARD', tags:['oka','illust','coffee','board'], badge:['イラスト','矩形','やさしい色'],
      svg:(w=900,h=540)=> withFrame({w,h, stroke:'#60a5fa', strokeW:10, bg:'#0f172a', body:(x,y,W,H)=> coffeeBoardIllust({x,y,W,H})}) });
    list.push({ id:'desk-surf-dept', title:'DESK SURF DEPT.', tags:['oka','desk','illust','logo'], badge:['デスク','キーボード','横長'],
      svg:(w=900,h=360)=> withFrame({w,h, stroke:'#22d3ee', strokeW:10, bg:'#0b1220', body:(x,y,W,H)=> deskSurfIllust({x,y,W,H})}) });
    list.push({ id:'flipflop-life', title:'FLIP-FLOP LIFE', tags:['oka','illust','flipflop','slogan'], badge:['サンダル','角丸','カジュアル'],
      svg:(w=800,h=480)=> withFrame({w,h, stroke:'#a7f3d0', strokeW:10, bg:'#0b1220', body:(x,y,W,H)=> flipflopIllust({x,y,W,H})}) });
    list.push({ id:'van-and-board', title:'PARKING LOT PRO｜VAN+BOARD', tags:['oka','illust','van','board','parking'], badge:['バン','ボード','ミニマル'],
      svg:(w=880,h=420)=> withFrame({w,h, stroke:'#22c55e', strokeW:10, bg:'#0b1220', body:(x,y,W,H)=> vanIllust({x,y,W,H})}) });
    list.push({ id:'palm-and-wave', title:'PALM & WAVE', tags:['oka','illust','palm','wave','island'], badge:['南国','シルエット','ラウンド角'],
      svg:(w=880,h=420)=> withFrame({w,h, stroke:'#ffffff', strokeW:10, bg:'#0b1220', body:(x,y,W,H)=> palmWaveIllust({x,y,W,H})}) });
    list.push({ id:'wifi-fin', title:'WIFI FIN｜家サーフ', tags:['oka','illust','wifi','fin'], badge:['小ネタ','丸角','電波'],
      svg:(w=800,h=480)=> withFrame({w,h, stroke:'#60a5fa', strokeW:10, bg:'#0b1220', body:(x,y,W,H)=> wifiFinIllust({x,y,W,H})}) });
    list.push({ id:'lunch-break-surf', title:'LUNCH BREAK SURF', tags:['oka','illust','lunch','slogan'], badge:['弁当','ショートタイム','横長'],
      svg:(w=880,h=360)=> withFrame({w,h, stroke:'#f59e0b', strokeW:10, bg:'#0b1220', body:(x,y,W,H)=> lunchBreakIllust({x,y,W,H})}) });
    list.push({ id:'tide-chart-nerd', title:'TIDE CHART NERD', tags:['oka','illust','tide','nerd'], badge:['グラフ','潮汐','丸角'],
      svg:(w=860,h=420)=> withFrame({w,h, stroke:'#84cc16', strokeW:10, bg:'#0b1220', body:(x,y,W,H)=> tideChartIllust({x,y,W,H})}) });
    list.push({ id:'home-break-only', title:'HOME BREAK ONLY', tags:['oka','illust','home','slogan'], badge:['家','ローカル','控えめ'],
      svg:(w=800,h=420)=> withFrame({w,h, stroke:'#e2e8f0', strokeW:8, bg:'#0b1220', body:(x,y,W,H)=> homeBreakIllust({x,y,W,H})}) });
    list.push({ id:'after-work-glass', title:'AFTER WORK GLASS', tags:['oka','illust','afterwork','glass'], badge:['夕方','グラッシー','横長'],
      svg:(w=880,h=360)=> withFrame({w,h, stroke:'#22d3ee', strokeW:10, bg:'#0b1220', body:(x,y,W,H)=> afterWorkIllust({x,y,W,H})}) });
    list.push({ id:'wax-to-work', title:'WAX TO WORK', tags:['oka','illust','wax','slogan'], badge:['ジョーク','横長','白抜き'],
      svg:(w=820,h=300)=> withFrame({w,h, stroke:'#ffffff', strokeW:8, bg:'#0b1220', body:(x,y,W,H)=> waxWorkIllust({x,y,W,H})}) });
    list.push({ id:'remote-surfing-team', title:'REMOTE SURFING TEAM', tags:['oka','illust','remote','team'], badge:['リモート','ミニアイコン','角丸'],
      svg:(w=900,h=360)=> withFrame({w,h, stroke:'#a78bfa', strokeW:10, bg:'#0b1220', body:(x,y,W,H)=> remoteTeamIllust({x,y,W,H})}) });

    return list;
  }

  // ======== SVG本体生成関数（各デザイン部品） ========
  function withFrame({w,h,rx=Math.round(Math.min(w,h)*0.06), inner=8, body, stroke="#ffffff", strokeW=0, bg=null}){
    const id = 'clip'+hash(String(Math.random()));
    const innerX = inner, innerY = inner, innerW = w - inner*2, innerH = h - inner*2;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
  ${bg ? `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}"/>` : ''}
  <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${stroke}" stroke-width="${strokeW}"/>
  <defs>
    <clipPath id="${id}"><rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="${Math.max(0, rx-inner/2)}"/></clipPath>
  </defs>
  <g clip-path="url(#${id})">${body(innerX, innerY, innerW, innerH)}</g>
</svg>`;
  }

  function sponsorRectBody({x,y,W,H, text1,text2, t1,t2}){
    const pad = Math.round(W*0.08), fs1 = Math.min(W,H)*0.24, fs2 = Math.min(W,H)*0.18;
    return `<g font-family="system-ui, sans-serif" font-weight="800">
      <text x="${x+pad}" y="${y+H*0.48}" dominant-baseline="middle" font-size="${fs1}" fill="${t1}">${esc(text1)}</text>
      <text x="${x+pad}" y="${y+H*0.78}" font-size="${fs2}" fill="${t2}">${esc(text2)}</text>
    </g>`;
  }
  function roundBadgeBody({x,y,W,H, text}){
    const cx = x+W/2, cy = y+H/2, r = Math.min(W,H)/2 - 6, fs = r*0.28, fs2 = r*0.18;
    return `<defs><linearGradient id="g${hash(text)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3ec4ff"/><stop offset="1" stop-color="#0ea5e980"/></linearGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g${hash(text)})" stroke="#ffffff" stroke-width="8"/>
      <g font-family="system-ui, sans-serif" fill="#ffffff" text-anchor="middle">
        <text x="${cx}" y="${cy}" font-weight="900" font-size="${fs}" dominant-baseline="central">${esc(text)}</text>
        <text x="${cx}" y="${cy+r*0.52}" font-weight="700" font-size="${fs2}" opacity="0.9">2025</text>
      </g>`;
  }
  function sloganBody({x,y,W,H, fg,text,sub}){
    const fs1 = H*0.34, fs2 = H*0.12;
    return `<g font-family="system-ui, sans-serif" text-anchor="middle">
      <text x="${x+W/2}" y="${y+H*0.54}" font-weight="900" font-size="${fs1}" fill="${fg}" dominant-baseline="middle">${esc(text)}</text>
      <text x="${x+W/2}" y="${y+H*0.82}" font-weight="600" font-size="${fs2}" fill="${fg}" opacity="0.7">${esc(sub)}</text>
    </g>`;
  }
  function ovalSponsorBody({x,y,W,H,grad1,grad2,title,sub}){
    const pad = Math.min(W,H)*0.08, cx = x+W/2, cy = y+H/2, rx = W/2 - pad, ry = H/2 - pad, gid = `lg${hash(title)}`;
    return `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${grad1}"/><stop offset="1" stop-color="${grad2}"/></linearGradient></defs>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${gid})" stroke="#ffffff" stroke-width="8"/>
      <g font-family="system-ui, sans-serif" text-anchor="middle" fill="#ffffff">
        <text x="${cx}" y="${cy - H*0.06}" font-weight="900" font-size="${H*0.22}">${esc(title)}</text>
        <text x="${cx}" y="${cy + H*0.16}" font-weight="700" font-size="${H*0.12}" opacity="0.92">${esc(sub)}</text>
      </g>`;
  }
  function prohibitedBody({x,y,W,H, border,stripe,title,sub}){
    const gid = `pat${hash(title)}`;
    return `<defs><pattern id="${gid}" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(-20)"><rect width="40" height="40" fill="#0b1220"/><rect width="20" height="40" fill="#111827"/></pattern></defs>
      <rect x="${x}" y="${y}" width="${W}" height="${H}" rx="${Math.min(W,H)*0.06}" fill="url(#${gid})" stroke="${border}" stroke-width="6"/>
      <g font-family="system-ui, sans-serif" text-anchor="middle">
        <text x="${x+W/2}" y="${y+H*0.48}" font-weight="900" font-size="${H*0.22}" fill="#fff" letter-spacing="2">${esc(title)}</text>
        <text x="${x+W/2}" y="${y+H*0.78}" font-weight="700" font-size="${H*0.12}" fill="${border}" opacity="0.95">${esc(sub)}</text>
      </g>`;
  }
  function makerBody({x,y,W,H,a,b,grad1,grad2,icon}){
    const gid = `grad${hash(a+b)}`; const iconEl = makerIcon(icon, x+W*0.18, y+H*0.5, Math.min(W,H)*0.22);
    return `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${grad1}"/><stop offset="1" stop-color="${grad2}"/></linearGradient></defs>
      ${iconEl}
      <g font-family="system-ui, sans-serif" fill="#e5e7eb" font-weight="800">
        <text x="${x+W*0.42}" y="${y+H*0.50}" font-size="${H*0.22}">${esc(a)}</text>
        <text x="${x+W*0.42}" y="${y+H*0.78}" font-size="${H*0.18}" fill="url(#${gid})">${esc(b)}</text>
      </g>`;
  }
  function makerIcon(type, cx, cy, R){
    const stroke = '#ffffff';
    if (type==='hex'){ const pts = polygonPoints(6,cx,cy,R*0.72); return `<polygon points="${pts}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`; }
    if (type==='tri'){ const pts = polygonPoints(3,cx,cy,R*0.82); return `<polygon points="${pts}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`; }
    return `<circle cx="${cx}" cy="${cy}" r="${R*0.55}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`;
  }
  function localBody({x,y,W,H,name}){
    const cx=x+W/2, cy=y+H/2, r=Math.min(W,H)/2-8, top=`${name} SURF`, bottom='LOCAL PRIDE', gid=`lg${hash(name)}`;
    return `<defs><radialGradient id="${gid}" cx="50%" cy="38%" r="70%"><stop offset="0%" stop-color="#59d0ff"/><stop offset="100%" stop-color="#0ea5e9"/></radialGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gid})" stroke="#fff" stroke-width="10"/>
      <g font-family="system-ui, sans-serif" text-anchor="middle" fill="#ffffff">
        <text x="${cx}" y="${cy - r*0.25}" font-weight="900" font-size="${r*0.28}">${esc(top)}</text>
        <text x="${cx}" y="${cy + r*0.30}" font-weight="700" font-size="${r*0.18}" opacity="0.95">${esc(bottom)}</text>
      </g>`;
  }
  function coffeeBoardIllust({x,y,W,H}){
    return `<g stroke="#e2e8f0" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M ${x+W*0.18} ${y+H*0.16} C ${x+W*0.08} ${y+H*0.36}, ${x+W*0.08} ${y+H*0.64}, ${x+W*0.18} ${y+H*0.84}
                 L ${x+W*0.22} ${y+H*0.84}
                 C ${x+W*0.32} ${y+H*0.64}, ${x+W*0.32} ${y+H*0.36}, ${x+W*0.22} ${y+H*0.16} Z" fill="#0f172a"/>
        <line x1="${x+W*0.20}" y1="${y+H*0.18}" x2="${x+W*0.20}" y2="${y+H*0.82}" stroke="#60a5fa" />
        <rect x="${x+W*0.60}" y="${y+H*0.20}" width="${W*0.18}" height="${H*0.20}" rx="${W*0.02}" fill="#111827" />
        <path d="M ${x+W*0.60} ${y+H*0.24} h ${W*0.18}" stroke="#e2e8f0"/>
        <rect x="${x+W*0.78}" y="${y+H*0.24}" width="${W*0.05}" height="${H*0.10}" rx="${W*0.01}" fill="#111827" stroke="#e2e8f0"/>
        <path d="M ${x+W*0.66} ${y+H*0.18} c -10 -14, 10 -14, 0 -28 M ${x+W*0.70} ${y+H*0.18} c -10 -14, 10 -14, 0 -28" />
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900">
        <text x="${x+W*0.58}" y="${y+H*0.75}" font-size="${H*0.14}">OKA SURFER</text>
      </g>`;
  }
  function deskSurfIllust({x,y,W,H}){
    return `<g stroke="#22d3ee" stroke-width="8" fill="none" stroke-linecap="round">
        <rect x="${x+W*0.10}" y="${y+H*0.20}" width="${W*0.50}" height="${H*0.18}" rx="${W*0.02}" />
        <rect x="${x+W*0.12}" y="${y+H*0.22}" width="${W*0.18}" height="${H*0.14}" rx="${W*0.01}" fill="#0f172a"/>
        <line x1="${x+W*0.10}" y1="${y+H*0.40}" x2="${x+W*0.60}" y2="${y+H*0.40}" />
        <rect x="${x+W*0.28}" y="${y+H*0.34}" width="${W*0.20}" height="${H*0.06}" rx="${W*0.01}" />
        <path d="M ${x+W*0.15} ${y+H*0.28} q ${W*0.04} ${-H*0.06} ${W*0.08} 0 q ${W*0.04} ${H*0.06} ${W*0.08} 0" />
        <path d="M ${x+W*0.66} ${y+H*0.56} c -${W*0.10} ${H*0.08}, -${W*0.10} ${H*0.20}, 0 ${H*0.28}
                 c ${W*0.10} -${H*0.08}, ${W*0.10} -${H*0.20}, 0 -${H*0.28} z" fill="#0f172a" stroke="#22c55e"/>
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900">
        <text x="${x+W*0.66}" y="${y+H*0.30}" font-size="${H*0.20}">DESK</text>
        <text x="${x+W*0.66}" y="${y+H*0.54}" font-size="${H*0.18}" fill="#22d3ee">SURF DEPT.</text>
      </g>`;
  }
  function flipflopIllust({x,y,W,H}){
    return `<g stroke="#a7f3d0" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="${x+W*0.30}" cy="${y+H*0.50}" rx="${W*0.12}" ry="${H*0.24}" fill="#0f172a"/>
        <ellipse cx="${x+W*0.50}" cy="${y+H*0.54}" rx="${W*0.12}" ry="${H*0.24}" fill="#0f172a"/>
        <path d="M ${x+W*0.30} ${y+H*0.44} q ${W*0.02} ${H*0.08} 0 ${H*0.16} M ${x+W*0.50} ${y+H*0.48} q ${W*0.02} ${H*0.08} 0 ${H*0.16}"/>
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900">
        <text x="${x+W*0.66}" y="${y+H*0.46}" font-size="${H*0.18}">FLIP-FLOP</text>
        <text x="${x+W*0.66}" y="${y+H*0.70}" font-size="${H*0.16}" fill="#a7f3d0">LIFE</text>
      </g>`;
  }
  function vanIllust({x,y,W,H}){
    return `<g stroke="#22c55e" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <rect x="${x+W*0.12}" y="${y+H*0.30}" width="${W*0.52}" height="${H*0.24}" rx="${W*0.02}" fill="#0f172a" />
        <rect x="${x+W*0.16}" y="${y+H*0.34}" width="${W*0.16}" height="${H*0.10}" rx="${W*0.01}" />
        <rect x="${x+W*0.36}" y="${y+H*0.34}" width="${W*0.12}" height="${H*0.10}" rx="${W*0.01}" />
        <circle cx="${x+W*0.22}" cy="${y+H*0.58}" r="${H*0.06}" />
        <circle cx="${x+W*0.50}" cy="${y+H*0.58}" r="${H*0.06}" />
        <path d="M ${x+W*0.10} ${y+H*0.26} q ${W*0.24} ${-H*0.10} ${W*0.48} 0" />
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900">
        <text x="${x+W*0.72}" y="${y+H*0.48}" font-size="${H*0.18}">PARKING LOT</text>
        <text x="${x+W*0.72}" y="${y+H*0.72}" font-size="${H*0.16}" fill="#22c55e">PRO</text>
      </g>`;
  }
  function palmWaveIllust({x,y,W,H}){
    return `<g stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M ${x+W*0.22} ${y+H*0.64} v ${-H*0.28}" />
        <path d="M ${x+W*0.22} ${y+H*0.36} q ${W*0.06} ${-H*0.08} ${W*0.14} ${-H*0.02}" />
        <path d="M ${x+W*0.22} ${y+H*0.36} q -${W*0.06} ${-H*0.08} -${W*0.14} ${-H*0.02}" />
        <path d="M ${x+W*0.36} ${y+H*0.64} q ${W*0.10} ${-H*0.16} ${W*0.22} 0 q ${W*0.06} ${H*0.08} ${W*0.14} 0" />
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900">
        <text x="${x+W*0.70}" y="${y+H*0.50}" font-size="${H*0.18}">PALM &</text>
        <text x="${x+W*0.70}" y="${y+H*0.74}" font-size="${H*0.16}" fill="#60a5fa">WAVE</text>
      </g>`;
  }
  function wifiFinIllust({x,y,W,H}){
    return `<g stroke="#60a5fa" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M ${x+W*0.18} ${y+H*0.70} q ${W*0.10} ${-H*0.30} ${W*0.20} 0 v ${H*0.10} h -${W*0.20} z" fill="#0f172a"/>
        <path d="M ${x+W*0.54} ${y+H*0.54} q ${W*0.10} ${-H*0.10} ${W*0.20} 0" />
        <path d="M ${x+W*0.56} ${y+H*0.62} q ${W*0.08} ${-H*0.08} ${W*0.16} 0" />
        <path d="M ${x+W*0.58} ${y+H*0.70} q ${W*0.06} ${-H*0.06} ${W*0.12} 0" />
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900">
        <text x="${x+W*0.58}" y="${y+H*0.38}" font-size="${H*0.16}" text-anchor="middle">WIFI FIN</text>
      </g>`;
  }
  function lunchBreakIllust({x,y,W,H}){
    return `<g stroke="#f59e0b" stroke-width="7" fill="none" stroke-linecap="round">
        <rect x="${x+W*0.18}" y="${y+H*0.22}" width="${W*0.20}" height="${H*0.14}" rx="${W*0.01}" />
        <path d="M ${x+W*0.18} ${y+H*0.22} h ${W*0.20}" />
        <path d="M ${x+W*0.40} ${y+H*0.22} h ${W*0.08}" />
        <circle cx="${x+W*0.60}" cy="${y+H*0.30}" r="${H*0.08}" />
        <path d="M ${x+W*0.60} ${y+H*0.30} l 0 ${H*0.05} M ${x+W*0.60} ${y+H*0.30} l ${W*0.04} 0" />
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900">
        <text x="${x+W*0.64}" y="${y+H*0.62}" font-size="${H*0.20}">LUNCH BREAK</text>
        <text x="${x+W*0.64}" y="${y+H*0.82}" font-size="${H*0.16}" fill="#f59e0b">SURF</text>
      </g>`;
  }
  function tideChartIllust({x,y,W,H}){
    return `<g stroke="#84cc16" stroke-width="8" fill="none">
        <path d="M ${x+W*0.10} ${y+H*0.70}
                 C ${x+W*0.22} ${y+H*0.30}, ${x+W*0.38} ${y+H*0.30}, ${x+W*0.50} ${y+H*0.70}
                 S ${x+W*0.78} ${y+H*1.10}, ${x+W*0.90} ${y+H*0.70}" />
        <line x1="${x+W*0.10}" y1="${y+H*0.70}" x2="${x+W*0.90}" y2="${y+H*0.70}" stroke-opacity="0.3"/>
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle">
        <text x="${x+W*0.50}" y="${y+H*0.35}" font-size="${H*0.18}">TIDE CHART</text>
        <text x="${x+W*0.50}" y="${y+H*0.55}" font-size="${H*0.14}" fill="#84cc16">NERD</text>
      </g>`;
  }
  function homeBreakIllust({x,y,W,H}){
    return `<g stroke="#e2e8f0" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M ${x+W*0.20} ${y+H*0.56} l ${W*0.10} ${-H*0.10} l ${W*0.10} ${H*0.10} v ${H*0.14} h -${W*0.20} z" />
        <path d="M ${x+W*0.26} ${y+H*0.60} h ${W*0.08} v ${H*0.10} h -${W*0.08} z" />
        <path d="M ${x+W*0.52} ${y+H*0.70} q ${W*0.08} ${-H*0.10} ${W*0.16} 0 q ${W*0.06} ${H*0.08} ${W*0.12} 0" />
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900">
        <text x="${x+W*0.70}" y="${y+H*0.46}" font-size="${H*0.16}">HOME BREAK</text>
        <text x="${x+W*0.70}" y="${y+H*0.70}" font-size="${H*0.14}" fill="#60a5fa">ONLY</text>
      </g>`;
  }
  function afterWorkIllust({x,y,W,H}){
    const gid = `gl${hash('after')}`;
    return `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
      <g stroke="url(#${gid})" stroke-width="8" fill="none" stroke-linecap="round">
        <line x1="${x+W*0.10}" y1="${y+H*0.60}" x2="${x+W*0.90}" y2="${y+H*0.60}"/>
        <path d="M ${x+W*0.20} ${y+H*0.64} q ${W*0.06} ${-H*0.06} ${W*0.12} 0" />
        <path d="M ${x+W*0.50} ${y+H*0.64} q ${W*0.06} ${-H*0.06} ${W*0.12} 0" />
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle">
        <text x="${x+W*0.50}" y="${y+H*0.36}" font-size="${H*0.18}">AFTER WORK</text>
        <text x="${x+W*0.50}" y="${y+H*0.52}" font-size="${H*0.16}" fill="#22d3ee">GLASS</text>
      </g>`;
  }
  function waxWorkIllust({x,y,W,H}){
    return `<g stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <rect x="${x+W*0.20}" y="${y+H*0.28}" width="${W*0.20}" height="${H*0.12}" rx="${W*0.01}"/>
        <path d="M ${x+W*0.20} ${y+H*0.28} l ${W*0.20} ${H*0.12}"/>
        <path d="M ${x+W*0.20} ${y+H*0.40} l ${W*0.20} ${-H*0.12}"/>
        <rect x="${x+W*0.46}" y="${y+H*0.32}" width="${W*0.08}" height="${H*0.28}" rx="${W*0.01}" />
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900">
        <text x="${x+W*0.64}" y="${y+H*0.48}" font-size="${H*0.20}">WAX TO</text>
        <text x="${x+W*0.64}" y="${y+H*0.72}" font-size="${H*0.18}" fill="#ffffff">WORK</text>
      </g>`;
  }
  function remoteTeamIllust({x,y,W,H}){
    return `<g stroke="#a78bfa" stroke-width="7" fill="none" stroke-linecap="round">
        <rect x="${x+W*0.12}" y="${y+H*0.28}" width="${W*0.24}" height="${H*0.16}" rx="${W*0.01}" />
        <rect x="${x+W*0.42}" y="${y+H*0.24}" width="${W*0.20}" height="${H*0.12}" rx="${W*0.01}" />
        <rect x="${x+W*0.68}" y="${y+H*0.32}" width="${W*0.18}" height="${H*0.14}" rx="${W*0.01}" />
        <path d="M ${x+W*0.15} ${y+H*0.34} q ${W*0.04} ${-H*0.04} ${W*0.08} 0" />
        <path d="M ${x+W*0.45} ${y+H*0.28} q ${W*0.04} ${-H*0.04} ${W*0.08} 0" />
        <path d="M ${x+W*0.70} ${y+H*0.38} q ${W*0.04} ${-H*0.04} ${W*0.08} 0" />
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle">
        <text x="${x+W*0.50}" y="${y+H*0.64}" font-size="${H*0.18}">REMOTE</text>
        <text x="${x+W*0.50}" y="${y+H*0.84}" font-size="${H*0.16}" fill="#a78bfa">SURFING TEAM</text>
      </g>`;
  }

  // ======== 汎用ユーティリティ =============================
  function esc(s){ return String(s); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function hash(s){ let h=0; for (let i=0;i<s.length;i++){ h=(h<<5)-h + s.charCodeAt(i); h|=0; } return Math.abs(h); }
  function slug(s){ return String(s).normalize('NFKD').replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-').toLowerCase(); }
  function polygonPoints(n,cx,cy,r){ const pts=[]; for(let i=0;i<n;i++){ const a=-Math.PI/2 + i*(2*Math.PI/n); pts.push((cx+r*Math.cos(a)).toFixed(1)+","+(cy+r*Math.sin(a)).toFixed(1)); } return pts.join(' '); }
  function readViewbox(svg){ const m = svg.match(/viewBox="([\d.\s-]+)"/i); if(!m) return null; const p=m[1].trim().split(/\s+/).map(Number); return p.length===4?[p[2],p[3]]:null; }
})();
