(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ========= モバイルDL互換（iOS等） =========
  const isTouch = 'ontouchend' in document;
  const isIOS = /iP(hone|od|ad)/.test(navigator.platform)
    || (/Mac/.test(navigator.userAgent) && isTouch)
    || (/iOS|iPhone|iPad|CriOS|FxiOS/.test(navigator.userAgent) && isTouch);
  const supportsDownloadAttr = 'download' in document.createElement('a');

  function ensureToastStyle(){
    if ($('#toast-style')) return;
    const style = document.createElement('style'); style.id = 'toast-style';
    style.textContent = `.toast{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:9999;
      background:#0f1729;color:#e2e8f0;border:1px solid #1f2b3f;border-radius:12px;padding:10px 14px;
      box-shadow:0 6px 18px rgba(0,0,0,.25);font:600 13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}`;
    document.head.appendChild(style);
  }
  function toast(msg){
    ensureToastStyle();
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el); setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; }, 1800);
    setTimeout(()=> el.remove(), 2200);
  }

  function openInNewTabFromBlob(blob){
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) toast('新しいタブを開けませんでした。ポップアップを許可してください。');
    setTimeout(()=> URL.revokeObjectURL(url), 20000);
  }
  function openDataUrl(url){
    const w = window.open(url, '_blank');
    if (!w) toast('新しいタブを開けませんでした。ポップアップを許可してください。');
  }

  function downloadBlobSmart(blob, filename){
    if (supportsDownloadAttr && !isIOS){
      const a = document.createElement('a'); const url = URL.createObjectURL(blob);
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 1000);
    } else {
      // iOS 等は新規タブで開いて長押し保存
      openInNewTabFromBlob(blob);
      toast('長押しで「写真を保存」してください（モバイル）');
    }
  }
  function downloadTextSmart(text, filename, mime){
    if (supportsDownloadAttr && !isIOS){
      const blob = new Blob([text], { type: `${mime};charset=utf-8` });
      downloadBlobSmart(blob, filename);
    } else {
      const data = `data:${mime};charset=utf-8,` + encodeURIComponent(text);
      openDataUrl(data);
      toast('長押しで「リンク先を保存」してください（モバイル）');
    }
  }

  async function svgToPngBlob(svgString, px){
    const {canvas, destW, destH} = await drawSvgToCanvas(svgString, px);
    return await new Promise(res => canvas.toBlob(res, 'image/png'));
  }
  async function svgToPngDataURL(svgString, px){
    const {canvas} = await drawSvgToCanvas(svgString, px);
    // iOS向け：Blob化ではなく dataURL で開くほうが安定
    return canvas.toDataURL('image/png');
  }
  async function drawSvgToCanvas(svgString, px){
    const svg64 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    const img = new Image();
    const [w,h] = readViewbox(svgString) || [1024, 512];
    const ratio = w / h; const destW = px; const destH = Math.round(px / ratio);
    const canvas = document.createElement('canvas'); canvas.width = destW; canvas.height = destH;
    const ctx = canvas.getContext('2d');
    await new Promise(res => { img.onload = res; img.src = svg64; });
    ctx.clearRect(0,0,destW,destH); ctx.drawImage(img, 0, 0, destW, destH);
    return {canvas, destW, destH};
  }

  // ========= 文字フィット支援（枠内に収める） =========
  function fitTextTag({x, y, text, weight=900, sizePx, boxW, anchor='start', fill='#fff', opacity=1}){
    const safeW = Math.max(1, boxW - 8); // マージン
    const escText = esc(text);
    return `<text x="${x}" y="${y}" font-weight="${weight}" font-size="${sizePx}"
      fill="${fill}" opacity="${opacity}" textLength="${safeW}" lengthAdjust="spacingAndGlyphs"
      ${anchor ? `text-anchor="${anchor}"` : ''}>${escText}</text>`;
  }

  // ========= デザイン定義 =========
  const designs = buildDesigns();
  designs.forEach((d, idx) => {
    d.no = idx + 1;
  });

  // ========= 一覧UI・検索・タグ =========
  const grid = $("#grid");
  const tagsEl = $("#tags");
  const allTags = Array.from(new Set(designs.flatMap(d => d.tags))).sort();
  const active = new Set();
  allTags.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "tag"; btn.textContent = `#${t}`; btn.dataset.tag = t;
    btn.addEventListener("click", () => {
      if (active.has(t)) active.delete(t); else active.add(t);
      btn.classList.toggle("active"); render();
    });
    tagsEl.appendChild(btn);
  });
  $("#q").addEventListener("input", render);

  function applyPreviewAspect(previewEl){
    if (!previewEl) return;
    const svgEl = previewEl.querySelector('svg');
    if (!svgEl) return;
    const vbAttr = svgEl.getAttribute('viewBox');
    if (vbAttr){
      const parts = vbAttr.trim().split(/\s+/);
      if (parts.length >= 4){
        const w = parseFloat(parts[parts.length - 2]);
        const h = parseFloat(parts[parts.length - 1]);
        if (w > 0 && h > 0){
          previewEl.style.aspectRatio = `${w} / ${h}`;
          return;
        }
      }
    }
    const vb = svgEl.viewBox?.baseVal;
    if (vb?.width && vb?.height){
      previewEl.style.aspectRatio = `${vb.width} / ${vb.height}`;
    }
  }

  function render(){
    grid.innerHTML = "";
    const q = $("#q").value.trim().toLowerCase();
    designs
      .filter(d => (active.size===0 || d.tags.some(t => active.has(t)))
        && (!q || d.title.toLowerCase().includes(q) || d.tags.join(' ').includes(q)))
      .forEach(d => {
        const card = document.createElement("article");
        card.className = "card";
        const numLabel = String(d.no ?? 0).padStart(2, "0");
        const svgSmall = d.svg({w:900, h:Math.round(900*0.6), fields:d.defaultFields});
        card.innerHTML = `
          <div class="preview" aria-label="${escapeHtml(d.title)} のプレビュー">${svgSmall}</div>
          <div class="meta">
            <div class="card__heading">
              <span class="card__index" aria-label="ステッカー番号 ${numLabel}">No.${numLabel}</span>
              <h3>${escapeHtml(d.title)}</h3>
            </div>
            <div class="badges">${d.badge.map(b => `<span class="badge">${escapeHtml(b)}</span>`).join("")}</div>
            <div class="actions">
              <button class="btn" data-act="customize" data-id="${d.id}">カスタマイズ</button>
              <button class="btn" data-act="svg" data-id="${d.id}">SVG</button>
              <button class="btn" data-act="png" data-size="512" data-id="${d.id}">PNG 512px</button>
              <button class="btn" data-act="png" data-size="1024" data-id="${d.id}">PNG 1024px</button>
            </div>
          </div>
        `;
        grid.appendChild(card);
        applyPreviewAspect(card.querySelector('.preview'));
      });
    $$(".actions .btn", grid).forEach(btn => btn.addEventListener("click", onAction));
  }
  render();

  // ========= カスタマイズ・モーダル =========
  const dlg = $("#customize");
  const fieldArea = $("#field-area");
  const modalPreview = $("#modal-preview");
  const customizeTitle = $("#customize-title");
  let currentDesign = null;
  let currentFields = null;

  async function onAction(e){
    const btn = e.currentTarget;
    const id = btn.dataset.id; const act = btn.dataset.act;
    const size = Number(btn.dataset.size||0);
    const d = designs.find(x => x.id === id); if (!d) return;

    if (act === 'customize'){
      currentDesign = d;
      currentFields = {...d.defaultFields};
      openCustomize(d, currentFields);
      return;
    }

    // 通常DL（既定フィールド）
    const svg = d.svg({fields:d.defaultFields});
    if (act === 'svg'){
      downloadTextSmart(svg, `${d.id}.svg`, 'image/svg+xml');
    } else if (act === 'png'){
      if (isIOS || !supportsDownloadAttr){
        const dataUrl = await svgToPngDataURL(svg, size || 1024);
        openDataUrl(dataUrl);
        toast('長押しで「写真を保存」してください（モバイル）');
      } else {
        const blob = await svgToPngBlob(svg, size || 1024);
        downloadBlobSmart(blob, `${d.id}-${size||1024}.png`);
      }
    }
  }

  function openCustomize(d, fields){
    customizeTitle.textContent = `カスタマイズ：${d.title}`;
    fieldArea.innerHTML = "";
    d.editable.forEach(def => {
      const wrap = document.createElement('div'); wrap.className = 'field';
      const id = `f_${def.key}`;
      wrap.innerHTML = `
        <label for="${id}">${escapeHtml(def.label)}</label>
        <input id="${id}" type="text" value="${escapeHtml(fields[def.key] ?? def.default)}" />
        ${def.hint ? `<small>${escapeHtml(def.hint)}</small>` : ''}`;
      fieldArea.appendChild(wrap);
    });
    updateModalPreview();
    if (!dlg.open) dlg.showModal();
  }

  function collectFieldsFromForm(){
    const out = {};
    currentDesign.editable.forEach(def => {
      const el = $(`#f_${def.key}`, fieldArea);
      out[def.key] = (el?.value ?? def.default).slice(0, 80);
    });
    return out;
  }

  function updateModalPreview(){
    currentFields = collectFieldsFromForm();
    const svg = currentDesign.svg({fields:currentFields});
    modalPreview.innerHTML = svg;
    applyPreviewAspect(modalPreview);
  }

  $("#apply").addEventListener("click", updateModalPreview);
  $("#save-svg").addEventListener("click", () => {
    const svg = currentDesign.svg({fields:collectFieldsFromForm()});
    downloadTextSmart(svg, `${currentDesign.id}.svg`, 'image/svg+xml');
  });
  $("#save-png-1024").addEventListener("click", async () => {
    const svg = currentDesign.svg({fields:collectFieldsFromForm()});
    if (isIOS || !supportsDownloadAttr){
      const dataUrl = await svgToPngDataURL(svg, 1024);
      openDataUrl(dataUrl);
      toast('長押しで「写真を保存」してください（モバイル）');
    } else {
      const blob = await svgToPngBlob(svg, 1024);
      downloadBlobSmart(blob, `${currentDesign.id}-1024.png`);
    }
  });

  // ========= デザイン（編集可能フィールド対応） =========
  function buildDesigns(){
    const list = [];

    // 共通ボディ生成ヘルパ
    function rectSponsor({x,y,W,H, text1,text2, t1,t2}){
      const pad = Math.round(W*0.08);
      const w1 = W - pad*2, w2 = W - pad*2;
      const line1 = fitTextTag({x:x+pad, y:y+H*0.48, text:text1, weight:900, sizePx:Math.min(W,H)*0.24, boxW:w1, fill:t1});
      const line2 = fitTextTag({x:x+pad, y:y+H*0.78, text:text2, weight:800, sizePx:Math.min(W,H)*0.18, boxW:w2, fill:t2});
      return `<g font-family="system-ui, sans-serif">${line1}${line2}</g>`;
    }
    function roundBadge({x,y,W,H, text}){
      const cx = x+W/2, cy = y+H/2, r = Math.min(W,H)/2 - 6;
      const gid = `g${hash(text)}`;
      const t = fitTextTag({x:cx, y:cy, text, weight:900, sizePx:r*0.28, boxW:r*1.8, anchor:'middle', fill:'#fff'});
      return `
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3ec4ff"/><stop offset="1" stop-color="#0ea5e980"/></linearGradient></defs>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gid})" stroke="#ffffff" stroke-width="8"/>
        <g font-family="system-ui, sans-serif" fill="#ffffff" text-anchor="middle">
          ${t}
          <text x="${cx}" y="${cy+r*0.52}" font-weight="700" font-size="${r*0.18}" opacity="0.9">2025</text>
        </g>`;
    }
    function slogan({x,y,W,H, fg,text,sub}){
      const t1 = fitTextTag({x:x+W/2, y:y+H*0.54, text, weight:900, sizePx:H*0.34, boxW:W*0.86, anchor:'middle', fill:fg});
      const t2 = fitTextTag({x:x+W/2, y:y+H*0.82, text:sub, weight:700, sizePx:H*0.12, boxW:W*0.70, anchor:'middle', fill:fg, opacity:0.85});
      return `<g font-family="system-ui, sans-serif" text-anchor="middle">${t1}${t2}</g>`;
    }
    function ovalSponsor({x,y,W,H,grad1,grad2,title,sub}){
      const pad = Math.min(W,H)*0.08;
      const cx = x+W/2, cy = y+H/2, rx = W/2 - pad, ry = H/2 - pad;
      const gid = `lg${hash(title)}`;
      const t1 = fitTextTag({x:cx, y:cy - H*0.06, text:title, weight:900, sizePx:H*0.22, boxW:W*0.9, anchor:'middle', fill:'#fff'});
      const t2 = fitTextTag({x:cx, y:cy + H*0.16, text:sub,   weight:700, sizePx:H*0.12, boxW:W*0.8, anchor:'middle', fill:'#fff', opacity:0.92});
      return `
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${grad1}"/><stop offset="1" stop-color="${grad2}"/></linearGradient></defs>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${gid})" stroke="#ffffff" stroke-width="8"/>
        <g font-family="system-ui, sans-serif">${t1}${t2}</g>`;
    }
    function prohibited({x,y,W,H, color, title, sub}){
      const gid = `pat${hash(title)}`;
      const t1 = fitTextTag({x:x+W/2, y:y+H*0.48, text:title, weight:900, sizePx:H*0.22, boxW:W*0.9, anchor:'middle', fill:'#fff'});
      const t2 = fitTextTag({x:x+W/2, y:y+H*0.78, text:sub,   weight:700, sizePx:H*0.12, boxW:W*0.8, anchor:'middle', fill:color, opacity:0.95});
      return `
        <defs><pattern id="${gid}" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(-20)">
          <rect width="40" height="40" fill="#0b1220"/><rect width="20" height="40" fill="#111827"/></pattern></defs>
        <rect x="${x}" y="${y}" width="${W}" height="${H}" rx="${Math.min(W,H)*0.06}" fill="url(#${gid})" stroke="${color}" stroke-width="6"/>
        <g font-family="system-ui, sans-serif" text-anchor="middle">${t1}${t2}</g>`;
    }
    function maker({x,y,W,H,a,b,grad1,grad2,icon}){
      const gid = `grad${hash(a+b)}`;
      const iconEl = makerIcon(icon, x+W*0.18, y+H*0.5, Math.min(W,H)*0.22);
      const tA = fitTextTag({x:x+W*0.42, y:y+H*0.50, text:a, weight:800, sizePx:H*0.22, boxW:W*0.50, fill:'#e5e7eb'});
      const tB = fitTextTag({x:x+W*0.42, y:y+H*0.78, text:b, weight:800, sizePx:H*0.18, boxW:W*0.50, fill:`url(#${gid})`});
      return `
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${grad1}"/><stop offset="1" stop-color="${grad2}"/></linearGradient></defs>
        ${iconEl}
        <g font-family="system-ui, sans-serif">${tA}${tB}</g>`;
    }
    function makerIcon(type, cx, cy, R){
      const stroke = "#ffffff";
      if (type === "hex"){ const pts = polygonPoints(6, cx, cy, R*0.72); return `<polygon points="${pts}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`; }
      if (type === "tri"){ const pts = polygonPoints(3, cx, cy, R*0.82); return `<polygon points="${pts}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`; }
      return `<circle cx="${cx}" cy="${cy}" r="${R*0.55}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`;
    }
    function localRound({x,y,W,H,name}){
      const cx = x+W/2, cy = y+H/2, r = Math.min(W,H)/2 - 8;
      const top = `${name} SURF`, bottom = `LOCAL PRIDE`;
      const gid = `lg${hash(name)}`;
      const t1 = fitTextTag({x:cx, y:cy - r*0.25, text:top,    weight:900, sizePx:r*0.28, boxW:r*1.8, anchor:'middle'});
      const t2 = fitTextTag({x:cx, y:cy + r*0.30, text:bottom, weight:700, sizePx:r*0.18, boxW:r*1.6, anchor:'middle', opacity:0.95});
      return `
        <defs><radialGradient id="${gid}" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stop-color="#59d0ff"/><stop offset="100%" stop-color="#0ea5e9"/></radialGradient></defs>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gid})" stroke="#fff" stroke-width="10"/>
        <g font-family="system-ui, sans-serif" fill="#ffffff">${t1}${t2}</g>`;
    }

    function withFrame({w,h,rx=Math.round(Math.min(w,h)*0.06), inner=8, body, stroke="#ffffff", strokeW=0, bg=null}){
      const id = 'clip'+hash(String(Math.random()));
      const innerX = inner, innerY = inner, innerW = w - inner*2, innerH = h - inner*2;
      return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
  ${bg ? `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}"/>` : ''}
  <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${stroke}" stroke-width="${strokeW}"/>
  <defs><clipPath id="${id}"><rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="${Math.max(0, rx-inner/2)}"/></clipPath></defs>
  <g clip-path="url(#${id})">${body(innerX, innerY, innerW, innerH)}</g>
</svg>`;
    }

    // --------------- 既存＆新規デザイン（editable付き） ---------------
    // 擬似スポンサー（WAVE ++）
    list.push({
      id: "sponsor-waveplus",
      title: "WAVE++ | 擬似スポンサー",
      tags: ["sponsor","wave","logo"],
      badge: ["矩形","白地","太字"],
      editable: [
        {key:"line1", label:"1行目", default:"WAVE"},
        {key:"line2", label:"2行目", default:"++"}
      ],
      defaultFields: {line1:"WAVE", line2:"++"},
      svg: ({w=800,h=534,fields={}}={}) => withFrame({
        w,h, stroke:"#111827", strokeW:12, bg:"#ffffff",
        body: (x,y,W,H)=> rectSponsor({x,y,W,H, text1:fields.line1||"WAVE", text2:fields.line2||"++", t1:"#111827", t2:"#22c55e"})
      })
    });

    // DRY FISH ENERGY
    list.push({
      id: "dry-fish-energy",
      title: "DRY FISH ENERGY | 擬似スポンサー",
      tags: ["sponsor","energy","logo"],
      badge: ["横長","黒地","蛍光"],
      editable: [
        {key:"line1", label:"1行目", default:"DRY FISH"},
        {key:"line2", label:"2行目", default:"ENERGY"}
      ],
      defaultFields: {line1:"DRY FISH", line2:"ENERGY"},
      svg: ({w=880,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#22d3ee", strokeW:12, bg:"#0b1220",
        body: (x,y,W,H)=> rectSponsor({x,y,W,H, text1:fields.line1||"DRY FISH", text2:fields.line2||"ENERGY", t1:"#e2e8f0", t2:"#22d3ee"})
      })
    });

    // 丘サーファー認定
    list.push({
      id: "oka-surfer-cert",
      title: "丘サーファー認定証",
      tags: ["badge","joke","license"],
      badge: ["丸型","認定","白抜き"],
      editable: [{key:"text", label:"中央テキスト", default:"OKA SURFER CERTIFIED"}],
      defaultFields: {text:"OKA SURFER CERTIFIED"},
      svg: ({w=620,h=620,fields={}}={}) => withFrame({
        w,h, stroke:"#ffffff", strokeW:14, bg:"#0ea5e9",
        body: (x,y,W,H)=> roundBadge({x,y,W,H, text:fields.text||"OKA SURFER CERTIFIED"})
      })
    });

    // スローガン
    list.push({
      id: "no-surf-no-life",
      title: "NO SURF NO LIFE（逆張り）",
      tags: ["slogan","joke"],
      badge: ["横長","白黒","大文字"],
      editable: [
        {key:"main", label:"メイン", default:"NO SURF NO LIFE"},
        {key:"sub",  label:"サブ",  default:"*but maybe later"}
      ],
      defaultFields: {main:"NO SURF NO LIFE", sub:"*but maybe later"},
      svg: ({w=900,h=320,fields={}}={}) => withFrame({
        w,h, stroke:"#111827", strokeW:8, bg:"#ffffff",
        body: (x,y,W,H)=> slogan({x,y,W,H, fg:"#111827", text:fields.main||"NO SURF NO LIFE", sub:fields.sub||"*but maybe later"})
      })
    });

    // AIR SURFER（楕円）
    list.push({
      id: "air-surfer",
      title: "AIR SURFER（空想スポンサー）",
      tags: ["sponsor","air","logo"],
      badge: ["楕円","グラデ","アイコン"],
      editable: [
        {key:"title", label:"タイトル", default:"AIR SURFER"},
        {key:"sub",   label:"サブ",     default:"OFFICIAL"}
      ],
      defaultFields: {title:"AIR SURFER", sub:"OFFICIAL"},
      svg: ({w=860,h=480,fields={}}={}) => withFrame({
        w,h, stroke:"#ffffff", strokeW:12, bg:"#0b1220",
        body: (x,y,W,H)=> ovalSponsor({x,y,W,H, grad1:"#22c55e", grad2:"#06b6d4", title:fields.title||"AIR SURFER", sub:fields.sub||"OFFICIAL"})
      })
    });

    // WAVE TAX FREE
    list.push({
      id: "wave-tax-free",
      title: "WAVE TAX FREE（免税っぽい）",
      tags: ["sponsor","tax","joke"],
      badge: ["矩形","赤系","太字"],
      editable: [
        {key:"line1", label:"1行目", default:"WAVE"},
        {key:"line2", label:"2行目", default:"TAX FREE"}
      ],
      defaultFields: {line1:"WAVE", line2:"TAX FREE"},
      svg: ({w=860,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#ef4444", strokeW:12, bg:"#ffe4e6",
        body: (x,y,W,H)=> rectSponsor({x,y,W,H, text1:fields.line1||"WAVE", text2:fields.line2||"TAX FREE", t1:"#ef4444", t2:"#111827"})
      })
    });

    // 禁止ワード系
    [
      { id:"no-shore",       main:"NO SHORE",        sub:"CITY BREAK ONLY", color:"#ef4444" },
      { id:"middle-of-city", main:"MIDDLE OF CITY",  sub:"LANDLOCKED CREW", color:"#f59e0b" },
      { id:"desk-surf-only", main:"DESK SURF ONLY",  sub:"OFFICE WAVES",     color:"#22c55e" }
    ].forEach(p => list.push({
      id: `ban-${p.id}`,
      title: `${p.main}｜禁止ワード風ロゴ`,
      tags: ["ban","joke","logo","slogan"],
      badge: ["斜線","強調","コントラスト"],
      editable: [
        {key:"title", label:"メイン", default:p.main},
        {key:"sub",   label:"サブ",   default:p.sub}
      ],
      defaultFields: {title:p.main, sub:p.sub},
      svg: ({w=880,h=420,fields={}}={}) => withFrame({
        w,h, stroke:p.color, strokeW:12, bg:"#0b1220",
        body: (x,y,W,H)=> prohibited({x,y,W,H, color:p.color, title:fields.title||p.main, sub:fields.sub||p.sub})
      })
    }));

    // メーカーロゴ風
    [
      { id:"deep-blue-labs",  a:"DEEP",  b:"BLUE LABS",  grad1:"#3b82f6", grad2:"#06b6d4", icon:"hex"},
      { id:"foam-core-works", a:"FOAM",  b:"CORE WORKS", grad1:"#22c55e", grad2:"#84cc16", icon:"tri"},
      { id:"salt-tech",       a:"SALT",  b:"TECH",       grad1:"#f59e0b", grad2:"#ef4444", icon:"dot"},
    ].forEach(m => list.push({
      id: `mk-${m.id}`,
      title: `${m.a} ${m.b}｜メーカーロゴ風`,
      tags: ["maker","logo","brand"],
      badge: ["幾何アイコン","グラデ","横長"],
      editable: [
        {key:"a", label:"上段", default:m.a},
        {key:"b", label:"下段", default:m.b}
      ],
      defaultFields: {a:m.a, b:m.b},
      svg: ({w=900,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#ffffff", strokeW:10, bg:"#0b1220",
        body: (x,y,W,H)=> maker({x,y,W,H, a:fields.a||m.a, b:fields.b||m.b, grad1:m.grad1, grad2:m.grad2, icon:m.icon})
      })
    }));

    // ご当地：湘南のみ残す（他は削除）
    ["湘南"]
      .forEach(name => list.push({
        id: `local-${slug(name)}`,
        title: `ご当地版｜${name} SURF`,
        tags: ["local","place","logo"],
        badge: ["丸型","ご当地","白抜き"],
        editable: [{key:"name", label:"地名", default:name}],
        defaultFields: {name},
        svg: ({w=620,h=620,fields={}}={}) => withFrame({
          w,h, stroke:"#ffffff", strokeW:14, bg:"#0ea5e9",
          body: (x,y,W,H)=> localRound({x,y,W,H, name:fields.name||name})
        })
      }));

    // 丘サーファー風イラスト（可変テキストは fitTextTag で収める）
    list.push({
      id:"oka-coffee-board", title:"OKA SURFER｜COFFEE & BOARD",
      tags:["oka","illust","coffee","board"], badge:["イラスト","矩形","やさしい色"],
      editable:[{key:"main",label:"メイン",default:"OKA SURFER"}],
      defaultFields:{main:"OKA SURFER"},
      svg: ({w=900,h=540,fields={}}={}) => withFrame({
        w,h, stroke:"#60a5fa", strokeW:10, bg:"#0f172a",
        body:(x,y,W,H)=> `
          <g stroke="#e2e8f0" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M ${x+W*0.18} ${y+H*0.16} C ${x+W*0.08} ${y+H*0.36}, ${x+W*0.08} ${y+H*0.64}, ${x+W*0.18} ${y+H*0.84}
                     L ${x+W*0.22} ${y+H*0.84}
                     C ${x+W*0.32} ${y+H*0.64}, ${x+W*0.32} ${y+H*0.36}, ${x+W*0.22} ${y+H*0.16} Z" fill="#0f172a"/>
            <line x1="${x+W*0.20}" y1="${y+H*0.18}" x2="${x+W*0.20}" y2="${y+H*0.82}" stroke="#60a5fa" />
            <rect x="${x+W*0.60}" y="${y+H*0.20}" width="${W*0.18}" height="${H*0.20}" rx="${W*0.02}" fill="#111827" />
            <path d="M ${x+W*0.60} ${y+H*0.24} h ${W*0.18}" stroke="#e2e8f0"/>
            <rect x="${x+W*0.78}" y="${y+H*0.24}" width="${W*0.05}" height="${H*0.10}" rx="${W*0.01}" fill="#111827" stroke="#e2e8f0"/>
            <path d="M ${x+W*0.66} ${y+H*0.18} c -10 -14, 10 -14, 0 -28 M ${x+W*0.70} ${y+H*0.18} c -10 -14, 10 -14, 0 -28" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.58, y:y+H*0.75, text:(fields.main||"OKA SURFER"), weight:900, sizePx:H*0.14, boxW:W*0.34})}
          </g>
        `
      })
    });

    list.push({
      id:"desk-surf-dept", title:"DESK SURF DEPT.",
      tags:["oka","desk","illust","logo"], badge:["デスク","キーボード","横長"],
      editable:[{key:"main",label:"メイン",default:"DESK"},{key:"sub",label:"サブ",default:"SURF DEPT."}],
      defaultFields:{main:"DESK", sub:"SURF DEPT."},
      svg: ({w=900,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#22d3ee", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#22d3ee" stroke-width="8" fill="none" stroke-linecap="round">
            <rect x="${x+W*0.10}" y="${y+H*0.20}" width="${W*0.50}" height="${H*0.18}" rx="${W*0.02}" />
            <rect x="${x+W*0.12}" y="${y+H*0.22}" width="${W*0.18}" height="${H*0.14}" rx="${W*0.01}" fill="#0f172a"/>
            <line x1="${x+W*0.10}" y1="${y+H*0.40}" x2="${x+W*0.60}" y2="${y+H*0.40}" />
            <rect x="${x+W*0.28}" y="${y+H*0.34}" width="${W*0.20}" height="${H*0.06}" rx="${W*0.01}" />
            <path d="M ${x+W*0.15} ${y+H*0.28} q ${W*0.04} ${-H*0.06} ${W*0.08} 0 q ${W*0.04} ${H*0.06} ${W*0.08} 0" />
            <path d="M ${x+W*0.66} ${y+H*0.56} c -${W*0.10} ${H*0.08}, -${W*0.10} ${H*0.20}, 0 ${H*0.28}
                     c ${W*0.10} -${H*0.08}, ${W*0.10} -${H*0.20}, 0 -${H*0.28} z" fill="#0f172a" stroke="#22c55e"/>
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.66, y:y+H*0.30, text:(fields.main||"DESK"), weight:900, sizePx:H*0.20, boxW:W*0.32})}
            ${fitTextTag({x:x+W*0.66, y:y+H*0.54, text:(fields.sub||"SURF DEPT."), weight:800, sizePx:H*0.18, boxW:W*0.32, fill:"#22d3ee"})}
          </g>
        `
      })
    });

    list.push({
      id:"flipflop-life", title:"FLIP-FLOP LIFE",
      tags:["oka","illust","flipflop","slogan"], badge:["サンダル","角丸","カジュアル"],
      editable:[{key:"main",label:"メイン",default:"FLIP-FLOP"},{key:"sub",label:"サブ",default:"LIFE"}],
      defaultFields:{main:"FLIP-FLOP", sub:"LIFE"},
      svg: ({w=800,h=480,fields={}}={}) => withFrame({
        w,h, stroke:"#a7f3d0", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#a7f3d0" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="${x+W*0.30}" cy="${y+H*0.50}" rx="${W*0.12}" ry="${H*0.24}" fill="#0f172a"/>
            <ellipse cx="${x+W*0.50}" cy="${y+H*0.54}" rx="${W*0.12}" ry="${H*0.24}" fill="#0f172a"/>
            <path d="M ${x+W*0.30} ${y+H*0.44} q ${W*0.02} ${H*0.08} 0 ${H*0.16} M ${x+W*0.50} ${y+H*0.48} q ${W*0.02} ${H*0.08} 0 ${H*0.16}"/>
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.66, y:y+H*0.46, text:(fields.main||"FLIP-FLOP"), weight:900, sizePx:H*0.18, boxW:W*0.32})}
            ${fitTextTag({x:x+W*0.66, y:y+H*0.70, text:(fields.sub||"LIFE"),      weight:800, sizePx:H*0.16, boxW:W*0.32, fill:"#a7f3d0"})}
          </g>
        `
      })
    });

    list.push({
      id:"van-and-board", title:"PARKING LOT PRO｜VAN+BOARD",
      tags:["oka","illust","van","board","parking"], badge:["バン","ボード","ミニマル"],
      editable:[{key:"main",label:"メイン",default:"PARKING LOT"},{key:"sub",label:"サブ",default:"PRO"}],
      defaultFields:{main:"PARKING LOT", sub:"PRO"},
      svg: ({w=880,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#22c55e", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#22c55e" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="${x+W*0.12}" y="${y+H*0.30}" width="${W*0.52}" height="${H*0.24}" rx="${W*0.02}" fill="#0f172a" />
            <rect x="${x+W*0.16}" y="${y+H*0.34}" width="${W*0.16}" height="${H*0.10}" rx="${W*0.01}" />
            <rect x="${x+W*0.36}" y="${y+H*0.34}" width="${W*0.12}" height="${H*0.10}" rx="${W*0.01}" />
            <circle cx="${x+W*0.22}" cy="${y+H*0.58}" r="${H*0.06}" />
            <circle cx="${x+W*0.50}" cy="${y+H*0.58}" r="${H*0.06}" />
            <path d="M ${x+W*0.10} ${y+H*0.26} q ${W*0.24} ${-H*0.10} ${W*0.48} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.72, y:y+H*0.48, text:(fields.main||"PARKING LOT"), weight:900, sizePx:H*0.18, boxW:W*0.26})}
            ${fitTextTag({x:x+W*0.72, y:y+H*0.72, text:(fields.sub ||"PRO"),         weight:800, sizePx:H*0.16, boxW:W*0.26, fill:"#22c55e"})}
          </g>
        `
      })
    });

    list.push({
      id:"palm-and-wave", title:"PALM & WAVE",
      tags:["oka","illust","palm","wave","island"], badge:["南国","シルエット","ラウンド角"],
      editable:[{key:"main",label:"メイン",default:"PALM &"},{key:"sub",label:"サブ",default:"WAVE"}],
      defaultFields:{main:"PALM &", sub:"WAVE"},
      svg: ({w=880,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#ffffff", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M ${x+W*0.22} ${y+H*0.64} v ${-H*0.28}" />
            <path d="M ${x+W*0.22} ${y+H*0.36} q ${W*0.06} ${-H*0.08} ${W*0.14} ${-H*0.02}" />
            <path d="M ${x+W*0.22} ${y+H*0.36} q -${W*0.06} ${-H*0.08} -${W*0.14} ${-H*0.02}" />
            <path d="M ${x+W*0.36} ${y+H*0.64} q ${W*0.10} ${-H*0.16} ${W*0.22} 0 q ${W*0.06} ${H*0.08} ${W*0.14} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.70, y:y+H*0.50, text:(fields.main||"PALM &"), weight:900, sizePx:H*0.18, boxW:W*0.28})}
            ${fitTextTag({x:x+W*0.70, y:y+H*0.74, text:(fields.sub||"WAVE"),     weight:800, sizePx:H*0.16, boxW:W*0.28, fill:"#60a5fa"})}
          </g>
        `
      })
    });

    list.push({
      id:"wifi-fin", title:"WIFI FIN｜家サーフ",
      tags:["oka","illust","wifi","fin"], badge:["小ネタ","丸角","電波"],
      editable:[{key:"main",label:"メイン",default:"WIFI FIN"}],
      defaultFields:{main:"WIFI FIN"},
      svg: ({w=800,h=480,fields={}}={}) => withFrame({
        w,h, stroke:"#60a5fa", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#60a5fa" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M ${x+W*0.18} ${y+H*0.70} q ${W*0.10} ${-H*0.30} ${W*0.20} 0 v ${H*0.10} h -${W*0.20} z" fill="#0f172a"/>
            <path d="M ${x+W*0.54} ${y+H*0.54} q ${W*0.10} ${-H*0.10} ${W*0.20} 0" />
            <path d="M ${x+W*0.56} ${y+H*0.62} q ${W*0.08} ${-H*0.08} ${W*0.16} 0" />
            <path d="M ${x+W*0.58} ${y+H*0.70} q ${W*0.06} ${-H*0.06} ${W*0.12} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.58, y:y+H*0.38, text:(fields.main||"WIFI FIN"), weight:900, sizePx:H*0.16, boxW:W*0.46, anchor:'middle'})}
          </g>
        `
      })
    });

    list.push({
      id:"lunch-break-surf", title:"LUNCH BREAK SURF",
      tags:["oka","illust","lunch","slogan"], badge:["弁当","ショートタイム","横長"],
      editable:[{key:"main",label:"メイン",default:"LUNCH BREAK"},{key:"sub",label:"サブ",default:"SURF"}],
      defaultFields:{main:"LUNCH BREAK", sub:"SURF"},
      svg: ({w=880,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#f59e0b", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#f59e0b" stroke-width="7" fill="none" stroke-linecap="round">
            <rect x="${x+W*0.18}" y="${y+H*0.22}" width="${W*0.20}" height="${H*0.14}" rx="${W*0.01}" />
            <path d="M ${x+W*0.18} ${y+H*0.22} h ${W*0.20}" />
            <path d="M ${x+W*0.40} ${y+H*0.22} h ${W*0.08}" />
            <circle cx="${x+W*0.60}" cy="${y+H*0.30}" r="${H*0.08}" />
            <path d="M ${x+W*0.60} ${y+H*0.30} l 0 ${H*0.05} M ${x+W*0.60} ${y+H*0.30} l ${W*0.04} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.64, y:y+H*0.62, text:(fields.main||"LUNCH BREAK"), weight:900, sizePx:H*0.20, boxW:W*0.34})}
            ${fitTextTag({x:x+W*0.64, y:y+H*0.82, text:(fields.sub ||"SURF"),        weight:800, sizePx:H*0.16, boxW:W*0.34, fill:"#f59e0b"})}
          </g>
        `
      })
    });

    list.push({
      id:"tide-chart-nerd", title:"TIDE CHART NERD",
      tags:["oka","illust","tide","nerd"], badge:["グラフ","潮汐","丸角"],
      editable:[{key:"main",label:"メイン",default:"TIDE CHART"},{key:"sub",label:"サブ",default:"NERD"}],
      defaultFields:{main:"TIDE CHART", sub:"NERD"},
      svg: ({w=860,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#84cc16", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#84cc16" stroke-width="8" fill="none">
            <path d="M ${x+W*0.10} ${y+H*0.70}
                     C ${x+W*0.22} ${y+H*0.30}, ${x+W*0.38} ${y+H*0.30}, ${x+W*0.50} ${y+H*0.70}
                     S ${x+W*0.78} ${y+H*1.10}, ${x+W*0.90} ${y+H*0.70}" />
            <line x1="${x+W*0.10}" y1="${y+H*0.70}" x2="${x+W*0.90}" y2="${y+H*0.70}" stroke-opacity="0.3"/>
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900" text-anchor="middle">
            ${fitTextTag({x:x+W*0.50, y:y+H*0.35, text:(fields.main||"TIDE CHART"), weight:900, sizePx:H*0.18, boxW:W*0.80, anchor:'middle'})}
            ${fitTextTag({x:x+W*0.50, y:y+H*0.55, text:(fields.sub ||"NERD"),       weight:800, sizePx:H*0.14, boxW:W*0.60, anchor:'middle', fill:"#84cc16"})}
          </g>
        `
      })
    });

    list.push({
      id:"home-break-only", title:"HOME BREAK ONLY",
      tags:["oka","illust","home","slogan"], badge:["家","ローカル","控えめ"],
      editable:[{key:"main",label:"メイン",default:"HOME BREAK"},{key:"sub",label:"サブ",default:"ONLY"}],
      defaultFields:{main:"HOME BREAK", sub:"ONLY"},
      svg: ({w=800,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#e2e8f0", strokeW:8, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#e2e8f0" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M ${x+W*0.20} ${y+H*0.56} l ${W*0.10} ${-H*0.10} l ${W*0.10} ${H*0.10} v ${H*0.14} h -${W*0.20} z" />
            <path d="M ${x+W*0.26} ${y+H*0.60} h ${W*0.08} v ${H*0.10} h -${W*0.08} z" />
            <path d="M ${x+W*0.52} ${y+H*0.70} q ${W*0.08} ${-H*0.10} ${W*0.16} 0 q ${W*0.06} ${H*0.08} ${W*0.12} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.70, y:y+H*0.46, text:(fields.main||"HOME BREAK"), weight:900, sizePx:H*0.16, boxW:W*0.28})}
            ${fitTextTag({x:x+W*0.70, y:y+H*0.70, text:(fields.sub ||"ONLY"),       weight:800, sizePx:H*0.14, boxW:W*0.28, fill:"#60a5fa"})}
          </g>
        `
      })
    });

    list.push({
      id:"after-work-glass", title:"AFTER WORK GLASS",
      tags:["oka","illust","afterwork","glass"], badge:["夕方","グラッシー","横長"],
      editable:[{key:"main",label:"メイン",default:"AFTER WORK"},{key:"sub",label:"サブ",default:"GLASS"}],
      defaultFields:{main:"AFTER WORK", sub:"GLASS"},
      svg: ({w=880,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#22d3ee", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <defs><linearGradient id="gl${hash('after')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
          <g stroke="url(#gl${hash('after')})" stroke-width="8" fill="none" stroke-linecap="round">
            <line x1="${x+W*0.10}" y1="${y+H*0.60}" x2="${x+W*0.90}" y2="${y+H*0.60}"/>
            <path d="M ${x+W*0.20} ${y+H*0.64} q ${W*0.06} ${-H*0.06} ${W*0.12} 0" />
            <path d="M ${x+W*0.50} ${y+H*0.64} q ${W*0.06} ${-H*0.06} ${W*0.12} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900" text-anchor="middle">
            ${fitTextTag({x:x+W*0.50, y:y+H*0.36, text:(fields.main||"AFTER WORK"), weight:900, sizePx:H*0.18, boxW:W*0.80, anchor:'middle'})}
            ${fitTextTag({x:x+W*0.50, y:y+H*0.52, text:(fields.sub ||"GLASS"),      weight:800, sizePx:H*0.16, boxW:W*0.72, anchor:'middle', fill:"#22d3ee"})}
          </g>
        `
      })
    });

    list.push({
      id:"wax-to-work", title:"WAX TO WORK",
      tags:["oka","illust","wax","slogan"], badge:["ジョーク","横長","白抜き"],
      editable:[{key:"main",label:"メイン1",default:"WAX TO"},{key:"sub",label:"メイン2",default:"WORK"}],
      defaultFields:{main:"WAX TO", sub:"WORK"},
      svg: ({w=820,h=300,fields={}}={}) => withFrame({
        w,h, stroke:"#ffffff", strokeW:8, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="${x+W*0.20}" y="${y+H*0.28}" width="${W*0.20}" height="${H*0.12}" rx="${W*0.01}"/>
            <path d="M ${x+W*0.20} ${y+H*0.28} l ${W*0.20} ${H*0.12}"/>
            <path d="M ${x+W*0.20} ${y+H*0.40} l ${W*0.20} ${-H*0.12}"/>
            <rect x="${x+W*0.46}" y="${y+H*0.32}" width="${W*0.08}" height="${H*0.28}" rx="${W*0.01}" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.64, y:y+H*0.48, text:(fields.main||"WAX TO"), weight:900, sizePx:H*0.20, boxW:W*0.34})}
            ${fitTextTag({x:x+W*0.64, y:y+H*0.72, text:(fields.sub ||"WORK"),   weight:900, sizePx:H*0.18, boxW:W*0.34, fill:"#ffffff"})}
          </g>
        `
      })
    });

    list.push({
      id:"remote-surfing-team", title:"REMOTE SURFING TEAM",
      tags:["oka","illust","remote","team"], badge:["リモート","ミニアイコン","角丸"],
      editable:[{key:"main",label:"メイン",default:"REMOTE"},{key:"sub",label:"サブ",default:"SURFING TEAM"}],
      defaultFields:{main:"REMOTE", sub:"SURFING TEAM"},
      svg: ({w=900,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#a78bfa", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#a78bfa" stroke-width="7" fill="none" stroke-linecap="round">
            <rect x="${x+W*0.12}" y="${y+H*0.28}" width="${W*0.24}" height="${H*0.16}" rx="${W*0.01}" />
            <rect x="${x+W*0.42}" y="${y+H*0.24}" width="${W*0.20}" height="${H*0.12}" rx="${W*0.01}" />
            <rect x="${x+W*0.68}" y="${y+H*0.32}" width="${W*0.18}" height="${H*0.14}" rx="${W*0.01}" />
            <path d="M ${x+W*0.15} ${y+H*0.34} q ${W*0.04} ${-H*0.04} ${W*0.08} 0" />
            <path d="M ${x+W*0.45} ${y+H*0.28} q ${W*0.04} ${-H*0.04} ${W*0.08} 0" />
            <path d="M ${x+W*0.70} ${y+H*0.38} q ${W*0.04} ${-H*0.04} ${W*0.08} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900" text-anchor="middle">
            ${fitTextTag({x:x+W*0.50, y:y+H*0.64, text:(fields.main||"REMOTE"), weight:900, sizePx:H*0.18, boxW:W*0.80, anchor:'middle'})}
            ${fitTextTag({x:x+W*0.50, y:y+H*0.84, text:(fields.sub ||"SURFING TEAM"), weight:800, sizePx:H*0.16, boxW:W*0.80, anchor:'middle', fill:"#a78bfa"})}
          </g>
        `
      })
    });

    list.push({
      id:"city-surf-club", title:"CITY SURF CLUB",
      tags:["oka","illust","city","club"], badge:["夜景","クラブ","横長"],
      editable:[{key:"main",label:"メイン",default:"CITY SURF"},{key:"sub",label:"サブ",default:"CLUB"}],
      defaultFields:{main:"CITY SURF", sub:"CLUB"},
      svg: ({w=900,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#38bdf8", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <defs><linearGradient id="sky${hash('city-night')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#0b1220"/></linearGradient></defs>
          <rect x="${x+W*0.10}" y="${y+H*0.18}" width="${W*0.52}" height="${H*0.44}" rx="${W*0.02}" fill="url(#sky${hash('city-night')})" stroke="#38bdf8" stroke-width="6"/>
          <g fill="#38bdf8" opacity="0.85">
            <rect x="${x+W*0.14}" y="${y+H*0.46}" width="${W*0.04}" height="${H*0.12}" rx="${W*0.005}" />
            <rect x="${x+W*0.20}" y="${y+H*0.34}" width="${W*0.05}" height="${H*0.24}" rx="${W*0.005}" />
            <rect x="${x+W*0.28}" y="${y+H*0.28}" width="${W*0.06}" height="${H*0.30}" rx="${W*0.005}" />
            <rect x="${x+W*0.38}" y="${y+H*0.38}" width="${W*0.05}" height="${H*0.20}" rx="${W*0.005}" />
            <rect x="${x+W*0.46}" y="${y+H*0.32}" width="${W*0.05}" height="${H*0.26}" rx="${W*0.005}" />
          </g>
          <g stroke="#38bdf8" stroke-width="6" fill="none" stroke-linecap="round">
            <path d="M ${x+W*0.62} ${y+H*0.62} q ${W*0.18} ${-H*0.28} ${W*0.28} 0" />
            <path d="M ${x+W*0.64} ${y+H*0.52} q ${W*0.08} ${-H*0.12} ${W*0.16} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e0f2fe" font-weight="900">
            ${fitTextTag({x:x+W*0.68, y:y+H*0.36, text:(fields.main||"CITY SURF"), weight:900, sizePx:H*0.18, boxW:W*0.26})}
            ${fitTextTag({x:x+W*0.68, y:y+H*0.62, text:(fields.sub ||"CLUB"),      weight:800, sizePx:H*0.16, boxW:W*0.26, fill:"#38bdf8"})}
          </g>
        `
      })
    });

    list.push({
      id:"midnight-swell", title:"MIDNIGHT SWELL",
      tags:["oka","illust","night","wave"], badge:["三日月","波","グラデ"],
      editable:[{key:"main",label:"メイン",default:"MIDNIGHT"},{key:"sub",label:"サブ",default:"SWELL"}],
      defaultFields:{main:"MIDNIGHT", sub:"SWELL"},
      svg: ({w=820,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#6366f1", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <defs>
            <linearGradient id="moon${hash('swell-moon')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#818cf8"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
            <linearGradient id="wave${hash('swell-wave')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1d4ed8"/><stop offset="1" stop-color="#38bdf8"/></linearGradient>
          </defs>
          <path d="M ${x+W*0.18} ${y+H*0.26} a ${W*0.12} ${H*0.18} 0 1 0 ${W*0.06} ${H*0.28} a ${W*0.09} ${H*0.14} 0 1 1 -${W*0.06} -${H*0.28}" fill="url(#moon${hash('swell-moon')})" />
          <path d="M ${x+W*0.12} ${y+H*0.66} q ${W*0.10} ${-H*0.22} ${W*0.20} 0 t ${W*0.20} 0 t ${W*0.20} 0" stroke="url(#wave${hash('swell-wave')})" stroke-width="10" fill="none" stroke-linecap="round"/>
          <path d="M ${x+W*0.12} ${y+H*0.70} q ${W*0.10} ${-H*0.18} ${W*0.20} 0 t ${W*0.20} 0 t ${W*0.20} 0" stroke="#0ea5e9" stroke-width="6" fill="none" stroke-linecap="round"/>
          <g font-family="system-ui, sans-serif" fill="#e0e7ff" font-weight="900" text-anchor="middle">
            ${fitTextTag({x:x+W*0.60, y:y+H*0.44, text:(fields.main||"MIDNIGHT"), weight:900, sizePx:H*0.20, boxW:W*0.48, anchor:'middle'})}
            ${fitTextTag({x:x+W*0.60, y:y+H*0.66, text:(fields.sub ||"SWELL"),      weight:800, sizePx:H*0.16, boxW:W*0.40, anchor:'middle', fill:"#22d3ee"})}
          </g>
        `
      })
    });

    list.push({
      id:"urban-paddle-pass", title:"URBAN PADDLE PASS",
      tags:["oka","illust","ticket","paddle"], badge:["チケット","バーコード","白地"],
      editable:[{key:"main",label:"メイン",default:"URBAN PADDLE"},{key:"sub",label:"サブ",default:"PASS"}],
      defaultFields:{main:"URBAN PADDLE", sub:"PASS"},
      svg: ({w=840,h=320,fields={}}={}) => withFrame({
        w,h, stroke:"#0f172a", strokeW:10, bg:"#f1f5f9",
        body:(x,y,W,H)=> `
          <rect x="${x+W*0.08}" y="${y+H*0.18}" width="${W*0.36}" height="${H*0.48}" rx="${W*0.02}" fill="#0b1220" stroke="#0f172a" stroke-width="6"/>
          <g stroke="#38bdf8" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M ${x+W*0.16} ${y+H*0.44} q ${W*0.06} ${-H*0.20} ${W*0.12} 0" />
            <path d="M ${x+W*0.18} ${y+H*0.40} h ${W*0.12}" />
          </g>
          <g fill="#0f172a" opacity="0.85">
            ${Array.from({length:9}).map((_,i)=>`<rect x="${x+W*0.48 + i*W*0.036}" y="${y+H*0.20}" width="${W*0.02}" height="${H*0.32}" rx="${W*0.002}"/>`).join("")}
          </g>
          <g font-family="system-ui, sans-serif" fill="#0f172a" font-weight="900">
            ${fitTextTag({x:x+W*0.48, y:y+H*0.64, text:(fields.main||"URBAN PADDLE"), weight:900, sizePx:H*0.18, boxW:W*0.44})}
            ${fitTextTag({x:x+W*0.48, y:y+H*0.84, text:(fields.sub ||"PASS"),         weight:800, sizePx:H*0.16, boxW:W*0.44, fill:"#38bdf8"})}
          </g>
        `
      })
    });

    list.push({
      id:"couch-surf-camp", title:"COUCH SURF CAMP",
      tags:["oka","illust","couch","camp"], badge:["ソファ","ジョーク","丸角"],
      editable:[{key:"main",label:"メイン",default:"COUCH SURF"},{key:"sub",label:"サブ",default:"CAMP"}],
      defaultFields:{main:"COUCH SURF", sub:"CAMP"},
      svg: ({w=860,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#f97316", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#f97316" stroke-width="7" fill="#111827" stroke-linecap="round" stroke-linejoin="round">
            <rect x="${x+W*0.12}" y="${y+H*0.40}" width="${W*0.36}" height="${H*0.14}" rx="${W*0.02}" />
            <rect x="${x+W*0.12}" y="${y+H*0.28}" width="${W*0.36}" height="${H*0.16}" rx="${W*0.02}" />
            <rect x="${x+W*0.48}" y="${y+H*0.30}" width="${W*0.06}" height="${H*0.26}" rx="${W*0.01}" fill="#0b1220" />
            <path d="M ${x+W*0.54} ${y+H*0.32} q ${W*0.04} ${-H*0.12} ${W*0.08} 0 v ${H*0.32} h -${W*0.08} z" fill="#111827" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#fde68a" font-weight="900">
            ${fitTextTag({x:x+W*0.68, y:y+H*0.46, text:(fields.main||"COUCH SURF"), weight:900, sizePx:H*0.18, boxW:W*0.32})}
            ${fitTextTag({x:x+W*0.68, y:y+H*0.70, text:(fields.sub ||"CAMP"),        weight:800, sizePx:H*0.16, boxW:W*0.32, fill:"#f97316"})}
          </g>
        `
      })
    });

    list.push({
      id:"commute-wave-rider", title:"COMMUTE WAVE RIDER",
      tags:["oka","illust","train","commute"], badge:["電車","平日","ジョーク"],
      editable:[{key:"main",label:"メイン",default:"COMMUTE WAVE"},{key:"sub",label:"サブ",default:"RIDER"}],
      defaultFields:{main:"COMMUTE WAVE", sub:"RIDER"},
      svg: ({w=900,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#34d399", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#34d399" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="${x+W*0.14}" y="${y+H*0.30}" width="${W*0.52}" height="${H*0.22}" rx="${W*0.02}" fill="#0b1727" />
            <rect x="${x+W*0.18}" y="${y+H*0.34}" width="${W*0.10}" height="${H*0.12}" rx="${W*0.01}" fill="#0f172a" />
            <rect x="${x+W*0.32}" y="${y+H*0.34}" width="${W*0.10}" height="${H*0.12}" rx="${W*0.01}" fill="#0f172a" />
            <rect x="${x+W*0.46}" y="${y+H*0.34}" width="${W*0.10}" height="${H*0.12}" rx="${W*0.01}" fill="#0f172a" />
            <circle cx="${x+W*0.26}" cy="${y+H*0.60}" r="${H*0.06}" />
            <circle cx="${x+W*0.54}" cy="${y+H*0.60}" r="${H*0.06}" />
            <path d="M ${x+W*0.14} ${y+H*0.64} q ${W*0.14} ${H*0.10} ${W*0.28} 0 q ${W*0.14} ${-H*0.10} ${W*0.28} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#d1fae5" font-weight="900">
            ${fitTextTag({x:x+W*0.72, y:y+H*0.48, text:(fields.main||"COMMUTE WAVE"), weight:900, sizePx:H*0.18, boxW:W*0.30})}
            ${fitTextTag({x:x+W*0.72, y:y+H*0.72, text:(fields.sub ||"RIDER"),        weight:800, sizePx:H*0.16, boxW:W*0.30, fill:"#34d399"})}
          </g>
        `
      })
    });

    // 追加スローガン系（背景グラデーション＋太字）
    const newSloganConfigs = [
      { id:"sunset-seekers",   title:"SUNSET SEEKERS｜黄昏スローガン", main:"SUNSET SEEKERS",   sub:"LAST LIGHT CREW",    stroke:"#fb923c", bg:"#0b1220", fg:"#f97316", accent:"#facc15", tags:["slogan","sunset","crew"],     badge:["夕焼け","スローガン","太字"] },
      { id:"tidal-optimist",   title:"TIDAL OPTIMIST｜ポジティブロゴ", main:"TIDAL OPTIMIST",   sub:"HOPEFUL WAVES",      stroke:"#22c55e", bg:"#052e16", fg:"#86efac", accent:"#bbf7d0", tags:["slogan","positive","logo"], badge:["グラデ","やわらか","横長"] },
      { id:"north-dreaming",   title:"NORTH SHORE DREAMING",          main:"NORTH SHORE",       sub:"DREAMING",            stroke:"#38bdf8", bg:"#0b1220", fg:"#bae6fd", accent:"#38bdf8", tags:["slogan","north","dream"],    badge:["夜明け","太字","シンプル"] },
      { id:"weekend-reef",     title:"WEEKEND REEF",                  main:"WEEKEND REEF",     sub:"SATURDAY CREW",      stroke:"#f59e0b", bg:"#1f2937", fg:"#facc15", accent:"#f97316", tags:["slogan","weekend","reef"], badge:["ストライプ","カジュアル","黄系"] },
      { id:"urban-offshore",   title:"URBAN OFFSHORE",                main:"URBAN OFFSHORE",   sub:"CITY BREEZE",        stroke:"#38bdf8", bg:"#0f172a", fg:"#bae6fd", accent:"#f8fafc", tags:["slogan","city","offshore"], badge:["都会","ブルー","横長"] },
      { id:"dawn-coffee",      title:"DAWN PATROL COFFEE",            main:"DAWN PATROL",      sub:"COFFEE FIRST",       stroke:"#f97316", bg:"#0b1220", fg:"#fed7aa", accent:"#fb923c", tags:["slogan","dawn","coffee"],   badge:["朝焼け","太字","コーヒー"] },
      { id:"foam-happiness",   title:"FOAM HAPPINESS",                main:"FOAM HAPPINESS",   sub:"STAY BUBBLY",        stroke:"#22d3ee", bg:"#0f172a", fg:"#cffafe", accent:"#a5f3fc", tags:["slogan","foam","joy"],      badge:["水色","バブル","横長"] },
      { id:"overcast-rider",   title:"OVERCAST RIDER",                main:"OVERCAST RIDER",   sub:"GRAY DAY FLOW",      stroke:"#94a3b8", bg:"#0f172a", fg:"#e2e8f0", accent:"#94a3b8", tags:["slogan","overcast","flow"], badge:["曇り","ニュートラル","太字"] },
      { id:"hidden-swell",     title:"HIDDEN SWELL",                  main:"HIDDEN SWELL",     sub:"KEEP IT QUIET",      stroke:"#0ea5e9", bg:"#082f49", fg:"#bae6fd", accent:"#38bdf8", tags:["slogan","secret","swell"], badge:["ネイビー","シークレット","横長"] },
      { id:"shoulder-high",    title:"SHOULDER HIGH CLUB",            main:"SHOULDER HIGH",    sub:"CLUB",               stroke:"#22c55e", bg:"#042f2e", fg:"#bbf7d0", accent:"#34d399", tags:["slogan","club","height"],  badge:["クラブ","グリーン","太字"] },
    ];

    newSloganConfigs.forEach(cfg => {
      list.push({
        id: `slogan-${cfg.id}`,
        title: cfg.title,
        tags: cfg.tags,
        badge: cfg.badge,
        editable: [
          {key:"main", label:"メイン", default:cfg.main},
          {key:"sub",  label:"サブ",  default:cfg.sub}
        ],
        defaultFields: {main:cfg.main, sub:cfg.sub},
        svg: ({w=880,h=360,fields={}}={}) => withFrame({
          w,h, stroke:cfg.stroke, strokeW:10, bg:cfg.bg,
          body: (x,y,W,H) => {
            const gid = `grad${hash(cfg.id)}`;
            return `
              <defs>
                <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="${cfg.accent}"/>
                  <stop offset="1" stop-color="${cfg.fg}"/>
                </linearGradient>
              </defs>
              <rect x="${x}" y="${y}" width="${W}" height="${H}" fill="url(#${gid})" opacity="0.16"/>
              <rect x="${x}" y="${y+H*0.72}" width="${W}" height="${H*0.16}" fill="${cfg.stroke}" opacity="0.4"/>
              ${slogan({x,y,W,H, fg:cfg.fg, text:fields.main||cfg.main, sub:fields.sub||cfg.sub})}
            `;
          }
        })
      });
    });

    // 追加ラウンドバッジ系
    const newBadgeConfigs = [
      {id:"weekend-pass",  text:"WEEKEND PASS",   title:"WEEKEND PASS｜丸型バッジ",        bg:"#0b1220"},
      {id:"rainy-surfer",  text:"RAINY SURFER",   title:"RAINY SURFER｜丸型バッジ",        bg:"#1f2937"},
      {id:"tide-watch",    text:"TIDE WATCH",     title:"TIDE WATCH｜丸型バッジ",          bg:"#0f172a"},
      {id:"board-meet",    text:"BOARD MEET",     title:"BOARD MEET｜丸型バッジ",          bg:"#111827"},
      {id:"hot-sand",      text:"HOT SAND",       title:"HOT SAND｜丸型バッジ",            bg:"#7c2d12"},
      {id:"cool-current",  text:"COOL CURRENT",   title:"COOL CURRENT｜丸型バッジ",        bg:"#082f49"},
      {id:"city-swell",    text:"CITY SWELL",     title:"CITY SWELL｜丸型バッジ",          bg:"#0b1120"},
      {id:"eco-foam",      text:"ECO FOAM",       title:"ECO FOAM｜丸型バッジ",            bg:"#022c22"},
      {id:"gentle-break",  text:"GENTLE BREAK",   title:"GENTLE BREAK｜丸型バッジ",        bg:"#312e81"},
      {id:"moonlight-pass",text:"MOONLIGHT",      title:"MOONLIGHT PASS｜丸型バッジ",      bg:"#1e1b4b"},
    ];

    newBadgeConfigs.forEach(cfg => {
      list.push({
        id: `badge-${cfg.id}`,
        title: cfg.title,
        tags: ["badge","round","logo"],
        badge: ["丸型","グラデ","アクセント"],
        editable: [
          {key:"text", label:"中央テキスト", default:cfg.text}
        ],
        defaultFields: {text:cfg.text},
        svg: ({w=560,h=560,fields={}}={}) => withFrame({
          w,h, stroke:"#ffffff", strokeW:14, bg:cfg.bg,
          body: (x,y,W,H) => `
            ${roundBadge({x,y,W,H, text:fields.text || cfg.text})}
          `
        })
      });
    });

    // 追加バナー／ストライプ系
    const newStripeConfigs = [
      {id:"harbor-pass",      title:"HARBOR PASS",         main:"HARBOR PASS",        sub:"GATE 07",         stroke:"#0ea5e9", bg:"#0b1727", text:"#f8fafc", accent:"#1e3a8a", stripe:"#172554"},
      {id:"storm-alert",      title:"STORM ALERT",         main:"STORM ALERT",        sub:"WATCH 24H",       stroke:"#f97316", bg:"#111827", text:"#fee2e2", accent:"#7f1d1d", stripe:"#b91c1c"},
      {id:"calm-channel",     title:"CALM CHANNEL",        main:"CALM CHANNEL",       sub:"SLOW DRIFT",      stroke:"#22c55e", bg:"#052e16", text:"#dcfce7", accent:"#14532d", stripe:"#15803d"},
      {id:"lanes-only",       title:"LANES ONLY",          main:"LANES ONLY",         sub:"SOFT TOP",        stroke:"#38bdf8", bg:"#0b1220", text:"#e0f2fe", accent:"#1d4ed8", stripe:"#3b82f6"},
      {id:"lazy-point",       title:"LAZY POINT",          main:"LAZY POINT",         sub:"REST AREA",       stroke:"#facc15", bg:"#1f2937", text:"#fef3c7", accent:"#92400e", stripe:"#fde68a"},
      {id:"freshfoam-lab",    title:"FRESH FOAM LAB",      main:"FRESH FOAM",         sub:"LAB SERIES",      stroke:"#22d3ee", bg:"#0f172a", text:"#cffafe", accent:"#0891b2", stripe:"#155e75"},
      {id:"night-shift",      title:"NIGHT SHIFT",         main:"NIGHT SHIFT",        sub:"AFTER HOURS",     stroke:"#6366f1", bg:"#1e1b4b", text:"#ede9fe", accent:"#3730a3", stripe:"#4c1d95"},
      {id:"backyard-break",   title:"BACKYARD BREAK",      main:"BACKYARD BREAK",     sub:"NEIGHBOR PASS",   stroke:"#f97316", bg:"#0f172a", text:"#ffedd5", accent:"#9a3412", stripe:"#fb923c"},
      {id:"longboard-lounge", title:"LONGBOARD LOUNGE",    main:"LONGBOARD",          sub:"LOUNGE",          stroke:"#38bdf8", bg:"#082f49", text:"#e0f2fe", accent:"#0ea5e9", stripe:"#075985"},
      {id:"thermal-tide",     title:"THERMAL TIDE",        main:"THERMAL TIDE",       sub:"HEAT CHECK",      stroke:"#ef4444", bg:"#311b26", text:"#fee2e2", accent:"#831843", stripe:"#f472b6"},
    ];

    newStripeConfigs.forEach(cfg => {
      list.push({
        id: `stripe-${cfg.id}`,
        title: `${cfg.title}｜バナーロゴ`,
        tags: ["banner","stripe","logo"],
        badge: ["ストライプ","横長","カスタム"],
        editable: [
          {key:"main", label:"メイン", default:cfg.main},
          {key:"sub",  label:"サブ",  default:cfg.sub}
        ],
        defaultFields: {main:cfg.main, sub:cfg.sub},
        svg: ({w=900,h=360,fields={}}={}) => withFrame({
          w,h, stroke:cfg.stroke, strokeW:10, bg:cfg.bg,
          body: (x,y,W,H) => {
            const gid = `stripe${hash(cfg.id)}`;
            return `
              <defs>
                <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stop-color="${cfg.accent}"/>
                  <stop offset="1" stop-color="${cfg.stripe}"/>
                </linearGradient>
              </defs>
              ${Array.from({length:6}).map((_,i)=>`<rect x="${x+W*0.08 + i*W*0.12}" y="${y+H*0.18}" width="${W*0.06}" height="${H*0.48}" fill="url(#${gid})" opacity="${0.15 + i*0.08}"/>`).join("")}
              <rect x="${x+W*0.08}" y="${y+H*0.24}" width="${W*0.44}" height="${H*0.36}" rx="${W*0.02}" fill="${cfg.accent}" opacity="0.18"/>
              <g font-family="system-ui, sans-serif" fill="${cfg.text}" font-weight="900">
                ${fitTextTag({x:x+W*0.58, y:y+H*0.48, text:(fields.main||cfg.main), weight:900, sizePx:H*0.20, boxW:W*0.60})}
                ${fitTextTag({x:x+W*0.58, y:y+H*0.74, text:(fields.sub||cfg.sub),  weight:800, sizePx:H*0.16, boxW:W*0.52, fill:cfg.stripe})}
              </g>
            `;
          }
        })
      });
    });

    return list;
  }

  // ========= ユーティリティ =========
  function esc(s){ return String(s); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function hash(s){ let h=0; for (let i=0;i<s.length;i++){ h=(h<<5)-h + s.charCodeAt(i); h|=0; } return Math.abs(h); }
  function slug(s){ return String(s).normalize("NFKD").replace(/[^\w\s-]/g,"").trim().replace(/\s+/g,"-").toLowerCase(); }
  function polygonPoints(n, cx, cy, r){ const pts=[]; for(let i=0;i<n;i++){ const a=-Math.PI/2 + i*(2*Math.PI/n); pts.push((cx + r*Math.cos(a)).toFixed(1)+","+(cy + r*Math.sin(a)).toFixed(1)); } return pts.join(" "); }
  function readViewbox(svg){ const m = svg.match(/viewBox="([\d.\s-]+)"/i); if (!m) return null; const parts = m[1].trim().split(/\s+/).map(Number); return parts.length===4 ? [parts[2], parts[3]] : null; }
})();