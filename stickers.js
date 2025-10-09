/* stickers.js — humor-boosted edition (+10 new designs)
   - 強化点:
     * 文言を全面見直し（パンチライン/自虐/逆張り）
     * タグ検索・カスタマイズ・SVG/PNG保存の仕様は従来通り
     * 既存CSS/HTMLと互換（stickers.css / stickers.html）
*/

(() => {
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ======== モバイルDL互換（iOS等） ========
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

  // ======== SVG→PNG ========
  async function svgToPngBlob(svgString, px){
    const {canvas} = await drawSvgToCanvas(svgString, px);
    return await new Promise(res => canvas.toBlob(res, 'image/png'));
  }
  async function svgToPngDataURL(svgString, px){
    const {canvas} = await drawSvgToCanvas(svgString, px);
    return canvas.toDataURL('image/png');
  }
  function readViewbox(svgString){
    const m = svgString.match(/viewBox\s*=\s*"([^"]+)"/i);
    if (!m) return null;
    const p = m[1].trim().split(/\s+/).map(Number);
    return p.length>=4 ? [p[2], p[3]] : null;
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

  // ======== テキスト安全化＆ユーティリティ ========
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
  function escapeHtml(s){ return esc(s); }
  function hash(s){ let h=0; for (let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; } return Math.abs(h); }
  function slug(s){ return String(s).toLowerCase().replace(/[^\w]+/g,'-').replace(/(^-|-$)/g,''); }
  function polygonPoints(n, cx, cy, r){
    const pts=[]; for(let i=0;i<n;i++){ const ang=-Math.PI/2 + i*2*Math.PI/n; pts.push([cx+r*Math.cos(ang), cy+r*Math.sin(ang)].join(',')); }
    return pts.join(' ');
  }
  function readViewBoxWH(svg){ const m = svg.match(/viewBox="[^"]*?(\d+\.?\d*)\s+(\d+\.?\d*)"\s*/); return m? [parseFloat(m[1]), parseFloat(m[2])] : null; }

  // 枠内フィット（詰め字）
  function fitTextTag({x, y, text, weight=900, sizePx, boxW, anchor='start', fill='#fff', opacity=1}){
    const safeW = Math.max(1, boxW - 8);
    const escText = esc(text);
    return `<text x="${x}" y="${y}" font-weight="${weight}" font-size="${sizePx}"
      fill="${fill}" opacity="${opacity}" textLength="${safeW}" lengthAdjust="spacingAndGlyphs"
      ${anchor ? `text-anchor="${anchor}"` : ''}>${escText}</text>`;
  }

  // ======== UI（一覧・タグ・検索） ========
  const grid   = $("#grid");
  const tagsEl = $("#tags");

  function applyPreviewAspect(previewEl){
    if (!previewEl) return;
    const svgEl = previewEl.querySelector('svg'); if (!svgEl) return;
    const vbAttr = svgEl.getAttribute('viewBox');
    if (vbAttr){
      const parts = vbAttr.trim().split(/\s+/);
      if (parts.length >= 4){
        const w = parseFloat(parts[parts.length - 2]);
        const h = parseFloat(parts[parts.length - 1]);
        if (w > 0 && h > 0){ previewEl.style.aspectRatio = `${w} / ${h}`; return; }
      }
    }
    const vb = svgEl.viewBox?.baseVal; if (vb?.width && vb?.height){ previewEl.style.aspectRatio = `${vb.width} / ${vb.height}`; }
  }

  function render(){
    grid.innerHTML = "";
    const q = $("#q")?.value?.trim().toLowerCase() || "";
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

  const active = new Set();
  function initTags(){
    tagsEl.innerHTML = "";
    const allTags = Array.from(new Set(designs.flatMap(d => d.tags))).sort();
    allTags.forEach(t => {
      const btn = document.createElement("button");
      btn.className = "tag"; btn.textContent = `#${t}`; btn.dataset.tag = t;
      btn.addEventListener("click", () => {
        if (active.has(t)) active.delete(t); else active.add(t);
        btn.classList.toggle("active"); render();
      });
      tagsEl.appendChild(btn);
    });
  }

  async function onAction(e){
    const btn = e.currentTarget;
    const id = btn.dataset.id; const act = btn.dataset.act;
    const size = Number(btn.dataset.size||0);
    const d = designs.find(x => x.id === id); if (!d) return;

    if (act === 'customize'){ currentDesign = d; currentFields = {...d.defaultFields}; openCustomize(d, currentFields); return; }

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

  // ======== カスタマイズ ========
  const dlg = $("#customize");
  const fieldArea = $("#field-area");
  const modalPreview = $("#modal-preview");
  const customizeTitle = $("#customize-title");
  let currentDesign = null;
  let currentFields = null;

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
    const pv = $("#modal-preview .preview"); if (pv) applyPreviewAspect(pv); else applyPreviewAspect(modalPreview);
  }
  $("#apply")?.addEventListener("click", updateModalPreview);
  $("#save-svg")?.addEventListener("click", () => {
    const svg = currentDesign.svg({fields:collectFieldsFromForm()});
    downloadTextSmart(svg, `${currentDesign.id}.svg`, 'image/svg+xml');
  });
  $("#save-png-1024")?.addEventListener("click", async () => {
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

  // ======== 図形パーツ ========
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
    const gid = `lg${hash(name)}`;
    const top = `${name} SURF`, bottom = `LOCAL PRIDE`;
    const t1 = fitTextTag({x:cx, y:cy - r*0.25, text:top,    weight:900, sizePx:r*0.28, boxW:r*1.8, anchor:'middle'});
    const t2 = fitTextTag({x:cx, y:cy + r*0.30, text:bottom, weight:700, sizePx:r*0.18, boxW:r*1.6, anchor:'middle', opacity:0.95});
    return `
      <defs><radialGradient id="${gid}" cx="50%" cy="38%" r="70%">
        <stop offset="0%" stop-color="#59d0ff"/><stop offset="100%" stop-color="#0ea5e9"/></radialGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gid})" stroke="#fff" stroke-width="10"/>
      <g font-family="system-ui, sans-serif" fill="#ffffff">${t1}${t2}</g>`;
  }

  // ======== デザイン定義（ジョーク増量版） ========
  const designs = buildDesigns();
  designs.forEach((d, idx) => { d.no = idx + 1; });

  function buildDesigns(){
    const list = [];

    // 既存デザイン（――ここから既存） ---------------------------------
    list.push({
      id: "sponsor-waveplus",
      title: "WAVE++ | 近日入荷（波）",
      tags: ["sponsor","wave","logo","joke"],
      badge: ["矩形","白地","自虐"],
      editable: [
        {key:"line1", label:"1行目", default:"WAVE"},
        {key:"line2", label:"2行目", default:"COMING SOON"}
      ],
      defaultFields: {line1:"WAVE", line2:"COMING SOON"},
      svg: ({w=800,h=534,fields={}}={}) => withFrame({
        w,h, stroke:"#111827", strokeW:12, bg:"#ffffff",
        body: (x,y,W,H)=> rectSponsor({x,y,W,H, text1:fields.line1||"WAVE", text2:fields.line2||"COMING SOON", t1:"#111827", t2:"#22c55e"})
      })
    });

    list.push({
      id: "dry-fish-energy",
      title: "DRY FISH ENERGY | 干物でも動く",
      tags: ["sponsor","energy","logo","joke"],
      badge: ["横長","黒地","蛍光"],
      editable: [
        {key:"line1", label:"1行目", default:"DRY FISH"},
        {key:"line2", label:"2行目", default:"ENERGY (0 kcal)"}
      ],
      defaultFields: {line1:"DRY FISH", line2:"ENERGY (0 kcal)"},
      svg: ({w=880,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#22d3ee", strokeW:12, bg:"#0b1220",
        body: (x,y,W,H)=> rectSponsor({x,y,W,H, text1:fields.line1, text2:fields.line2, t1:"#e2e8f0", t2:"#22d3ee"})
      })
    });

    list.push({
      id: "oka-surfer-cert",
      title: "丘サーファー認定証｜公式（自称）",
      tags: ["badge","joke","license"],
      badge: ["丸型","認定","白抜き"],
      editable: [{key:"text", label:"中央テキスト", default:"OFFICIALLY* OKA SURFER"}],
      defaultFields: {text:"OFFICIALLY* OKA SURFER"},
      svg: ({w=620,h=620,fields={}}={}) => withFrame({
        w,h, stroke:"#ffffff", strokeW:14, bg:"#0ea5e9",
        body: (x,y,W,H)=> roundBadge({x,y,W,H, text:fields.text})
      })
    });

    list.push({
      id: "no-surf-no-life",
      title: "NO SURF NO LIFE｜※今日は会議",
      tags: ["slogan","joke"],
      badge: ["横長","白黒","大文字"],
      editable: [
        {key:"main", label:"メイン", default:"NO SURF NO LIFE"},
        {key:"sub",  label:"サブ",  default:"but I have a meeting"}
      ],
      defaultFields: {main:"NO SURF NO LIFE", sub:"but I have a meeting"},
      svg: ({w=900,h=320,fields={}}={}) => withFrame({
        w,h, stroke:"#111827", strokeW:8, bg:"#ffffff",
        body: (x,y,W,H)=> slogan({x,y,W,H, fg:"#111827", text:fields.main, sub:fields.sub})
      })
    });

    list.push({
      id: "air-surfer",
      title: "AIR SURFER｜飛ぶのは妄想だけ",
      tags: ["sponsor","air","logo","joke"],
      badge: ["楕円","グラデ","アイコン"],
      editable: [
        {key:"title", label:"タイトル", default:"AIR SURFER"},
        {key:"sub",   label:"サブ",     default:"IMAGINARY TEAM"}
      ],
      defaultFields: {title:"AIR SURFER", sub:"IMAGINARY TEAM"},
      svg: ({w=860,h=480,fields={}}={}) => withFrame({
        w,h, stroke:"#ffffff", strokeW:12, bg:"#0b1220",
        body: (x,y,W,H)=> ovalSponsor({x,y,W,H, grad1:"#22c55e", grad2:"#06b6d4", title:fields.title, sub:fields.sub})
      })
    });

    list.push({
      id: "wave-tax-free",
      title: "WAVE TAX FREE｜乗れない税 0%",
      tags: ["sponsor","tax","joke"],
      badge: ["矩形","赤系","太字"],
      editable: [
        {key:"line1", label:"1行目", default:"WAVE"},
        {key:"line2", label:"2行目", default:"TAX FREE (for me)"}
      ],
      defaultFields: {line1:"WAVE", line2:"TAX FREE (for me)"},
      svg: ({w=860,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#ef4444", strokeW:12, bg:"#ffe4e6",
        body: (x,y,W,H)=> rectSponsor({x,y,W,H, text1:fields.line1, text2:fields.line2, t1:"#ef4444", t2:"#111827"})
      })
    });

    [
      { id:"no-shore",       main:"NO SHORE",        sub:"CITY BREAK ONLY (…today)", color:"#ef4444" },
      { id:"middle-of-city", main:"MIDDLE OF CITY",  sub:"LANDLOCKED CREW – proudly", color:"#f59e0b" },
      { id:"desk-surf-only", main:"DESK SURF ONLY",  sub:"OFFICE WAVES • 9–18",        color:"#22c55e" }
    ].forEach(p => list.push({
      id: `ban-${p.id}`,
      title: `${p.main}｜禁止ワード風ロゴ（正論）`,
      tags: ["ban","joke","logo","slogan"],
      badge: ["斜線","強調","コントラスト"],
      editable: [
        {key:"title", label:"メイン", default:p.main},
        {key:"sub",   label:"サブ",   default:p.sub}
      ],
      defaultFields: {title:p.main, sub:p.sub},
      svg: ({w=880,h=420,fields={}}={}) => withFrame({
        w,h, stroke:p.color, strokeW:12, bg:"#0b1220",
        body: (x,y,W,H)=> prohibited({x,y,W,H, color:p.color, title:fields.title, sub:fields.sub})
      })
    }));

    [
      { id:"deep-blue-labs",  a:"DEEP",  b:"BLUE LABS — beta waves",  grad1:"#3b82f6", grad2:"#06b6d4", icon:"hex"},
      { id:"foam-core-works", a:"FOAM",  b:"CORE WORKS — R&D dept.",   grad1:"#22c55e", grad2:"#84cc16", icon:"tri"},
      { id:"salt-tech",       a:"SALT",  b:"TECH — Grade NaCl+",       grad1:"#f59e0b", grad2:"#ef4444", icon:"dot"},
    ].forEach(m => list.push({
      id: `mk-${m.id}`,
      title: `${m.a} ${m.b}｜メーカーロゴ風（なんちゃって）`,
      tags: ["maker","logo","brand","joke"],
      badge: ["幾何アイコン","グラデ","横長"],
      editable: [
        {key:"a", label:"上段", default:m.a},
        {key:"b", label:"下段", default:m.b}
      ],
      defaultFields: {a:m.a, b:m.b},
      svg: ({w=900,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#ffffff", strokeW:10, bg:"#0b1220",
        body: (x,y,W,H)=> maker({x,y,W,H, a:fields.a, b:fields.b, grad1:m.grad1, grad2:m.grad2, icon:m.icon})
      })
    }));

    ["湘南"].forEach(name => list.push({
      id: `local-${slug(name)}`,
      title: `ご当地版｜${name} SURF — traffic jam edition`,
      tags: ["local","place","logo","joke"],
      badge: ["丸型","ご当地","白抜き"],
      editable: [{key:"name", label:"地名", default:name}],
      defaultFields: {name},
      svg: ({w=620,h=620,fields={}}={}) => withFrame({
        w,h, stroke:"#ffffff", strokeW:14, bg:"#0ea5e9",
        body: (x,y,W,H)=> localRound({x,y,W,H, name:fields.name})
      })
    }));

    list.push({
      id:"oka-coffee-board",
      title:"OKA SURFER｜COFFEE & BOARD（乗る前に2杯）",
      tags:["oka","illust","coffee","board","joke"],
      badge:["イラスト","矩形","やさしい色"],
      editable:[{key:"main",label:"メイン",default:"OKA SURFER (caffeinated)"}],
      defaultFields:{main:"OKA SURFER (caffeinated)"},
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
            ${fitTextTag({x:x+W*0.58, y:y+H*0.75, text:(fields.main), weight:900, sizePx:H*0.14, boxW:W*0.34})}
          </g>
        `
      })
    });

    list.push({
      id:"desk-surf-dept",
      title:"DESK SURF DEPT.｜在宅ポイントブレイク",
      tags:["oka","desk","illust","logo","joke"],
      badge:["デスク","キーボード","横長"],
      editable:[{key:"main",label:"メイン",default:"DESK SURF"},{key:"sub",label:"サブ",default:"DEPARTMENT (HR-approved)"}],
      defaultFields:{main:"DESK SURF", sub:"DEPARTMENT (HR-approved)"},
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
            ${fitTextTag({x:x+W*0.66, y:y+H*0.30, text:(fields.main), weight:900, sizePx:H*0.20, boxW:W*0.32})}
            ${fitTextTag({x:x+W*0.66, y:y+H*0.54, text:(fields.sub),  weight:800, sizePx:H*0.18, boxW:W*0.32, fill:"#22d3ee"})}
          </g>
        `
      })
    });

    list.push({
      id:"flipflop-life",
      title:"FLIP-FLOP LIFE｜正装はビーサン",
      tags:["oka","illust","flipflop","slogan","joke"],
      badge:["サンダル","角丸","カジュアル"],
      editable:[{key:"main",label:"メイン",default:"FLIP-FLOP"},{key:"sub",label:"サブ",default:"IS FORMAL"}],
      defaultFields:{main:"FLIP-FLOP", sub:"IS FORMAL"},
      svg: ({w=800,h=480,fields={}}={}) => withFrame({
        w,h, stroke:"#a7f3d0", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#a7f3d0" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="${x+W*0.30}" cy="${y+H*0.50}" rx="${W*0.12}" ry="${H*0.24}" fill="#0f172a"/>
            <ellipse cx="${x+W*0.50}" cy="${y+H*0.54}" rx="${W*0.12}" ry="${H*0.24}" fill="#0f172a"/>
            <path d="M ${x+W*0.30} ${y+H*0.44} q ${W*0.02} ${H*0.08} 0 ${H*0.16} M ${x+W*0.50} ${y+H*0.48} q ${W*0.02} ${H*0.08} 0 ${H*0.16}"/>
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.66, y:y+H*0.46, text:(fields.main), weight:900, sizePx:H*0.18, boxW:W*0.32})}
            ${fitTextTag({x:x+W*0.66, y:y+H*0.70, text:(fields.sub),  weight:800, sizePx:H*0.16, boxW:W*0.32, fill:"#a7f3d0"})}
          </g>
        `
      })
    });

    list.push({
      id:"van-and-board",
      title:"PARKING LOT PRO｜波待ちは駐車場から",
      tags:["oka","illust","van","board","parking","joke"],
      badge:["バン","ボード","ミニマル"],
      editable:[{key:"main",label:"メイン",default:"PARKING LOT"},{key:"sub",label:"サブ",default:"PRO LEVEL • idle"}],
      defaultFields:{main:"PARKING LOT", sub:"PRO LEVEL • idle"},
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
            ${fitTextTag({x:x+W*0.72, y:y+H*0.48, text:(fields.main), weight:900, sizePx:H*0.18, boxW:W*0.26})}
            ${fitTextTag({x:x+W*0.72, y:y+H*0.72, text:(fields.sub),  weight:800, sizePx:H*0.16, boxW:W*0.26, fill:"#22c55e"})}
          </g>
        `
      })
    });

    list.push({
      id:"palm-and-wave",
      title:"PALM & WAVE｜脳内アイランド",
      tags:["oka","illust","palm","wave","island","joke"],
      badge:["南国","シルエット","ラウンド角"],
      editable:[{key:"main",label:"メイン",default:"PALM &"},{key:"sub",label:"サブ",default:"WAVE (mental)"}],
      defaultFields:{main:"PALM &", sub:"WAVE (mental)"},
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
            ${fitTextTag({x:x+W*0.70, y:y+H*0.50, text:(fields.main), weight:900, sizePx:H*0.18, boxW:W*0.28})}
            ${fitTextTag({x:x+W*0.70, y:y+H*0.74, text:(fields.sub),  weight:800, sizePx:H*0.16, boxW:W*0.28, fill:"#60a5fa"})}
          </g>
        `
      })
    });

    list.push({
      id:"wifi-fin",
      title:"WIFI FIN｜家サーフ上級者",
      tags:["oka","illust","wifi","fin","joke"],
      badge:["小ネタ","丸角","電波"],
      editable:[{key:"main",label:"メイン",default:"WIFI FIN — full bars"}],
      defaultFields:{main:"WIFI FIN — full bars"},
      svg: ({w=800,h=480,fields={}}={}) => withFrame({
        w,h, stroke:"#60a5fa", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#60a5fa" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M ${x+W*0.18} ${y+H*0.70} q ${W*0.10} ${-H*0.30} ${W*0.20} 0 v ${H*0.10} h -${W*0.20} z" fill="#0f172a"/>
            <path d="M ${x+W*0.54} ${y+H*0.54} q ${W*0.10} ${-H*0.10} ${W*0.20} 0" />
            <path d="M ${x+W*0.56} ${y+H*0.62} q ${W*0.08} ${-H*0.08} ${W*0.16} 0" />
            <path d="M ${x+W*0.58} ${y+H*0.70} q ${W*0.06} ${-H*0.06} ${W*0.12} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900" text-anchor="middle">
            ${fitTextTag({x:x+W*0.58, y:y+H*0.38, text:(fields.main), weight:900, sizePx:H*0.16, boxW:W*0.46, anchor:'middle'})}
          </g>
        `
      })
    });

    list.push({
      id:"lunch-break-surf",
      title:"LUNCH BREAK SURF｜休憩は海行くフリ",
      tags:["oka","illust","lunch","slogan","joke"],
      badge:["弁当","ショートタイム","横長"],
      editable:[{key:"main",label:"メイン",default:"LUNCH BREAK"},{key:"sub",label:"サブ",default:"SURF (mentally)"}],
      defaultFields:{main:"LUNCH BREAK", sub:"SURF (mentally)"},
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
            ${fitTextTag({x:x+W*0.64, y:y+H*0.62, text:(fields.main), weight:900, sizePx:H*0.20, boxW:W*0.34})}
            ${fitTextTag({x:x+W*0.64, y:y+H*0.82, text:(fields.sub),  weight:800, sizePx:H*0.16, boxW:W*0.34, fill:"#f59e0b"})}
          </g>
        `
      })
    });

    list.push({
      id:"tide-chart-nerd",
      title:"TIDE CHART NERD｜潮より会議に詳しい",
      tags:["oka","illust","tide","nerd","joke"],
      badge:["グラフ","潮汐","丸角"],
      editable:[{key:"main",label:"メイン",default:"TIDE CHART"},{key:"sub",label:"サブ",default:"NERD (excel)"}],
      defaultFields:{main:"TIDE CHART", sub:"NERD (excel)"},
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
            ${fitTextTag({x:x+W*0.50, y:y+H*0.35, text:(fields.main), weight:900, sizePx:H*0.18, boxW:W*0.80, anchor:'middle'})}
            ${fitTextTag({x:x+W*0.50, y:y+H*0.55, text:(fields.sub),  weight:800, sizePx:H*0.14, boxW:W*0.60, anchor:'middle', fill:"#84cc16"})}
          </g>
        `
      })
    });

    list.push({
      id:"home-break-only",
      title:"HOME BREAK ONLY｜家から出ない主義",
      tags:["oka","illust","home","slogan","joke"],
      badge:["家","ローカル","控えめ"],
      editable:[{key:"main",label:"メイン",default:"HOME BREAK"},{key:"sub",label:"サブ",default:"ONLY (door-to-fridge)"}],
      defaultFields:{main:"HOME BREAK", sub:"ONLY (door-to-fridge)"},
      svg: ({w=800,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#e2e8f0", strokeW:8, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#e2e8f0" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M ${x+W*0.20} ${y+H*0.56} l ${W*0.10} ${-H*0.10} l ${W*0.10} ${H*0.10} v ${H*0.14} h -${W*0.20} z" />
            <path d="M ${x+W*0.26} ${y+H*0.60} h ${W*0.08} v ${H*0.10} h -${W*0.08} z" />
            <path d="M ${x+W*0.52} ${y+H*0.70} q ${W*0.08} ${-H*0.10} ${W*0.16} 0 q ${W*0.06} ${H*0.08} ${W*0.12} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.70, y:y+H*0.46, text:(fields.main), weight:900, sizePx:H*0.16, boxW:W*0.28})}
            ${fitTextTag({x:x+W*0.70, y:y+H*0.70, text:(fields.sub),  weight:800, sizePx:H*0.14, boxW:W*0.28, fill:"#60a5fa"})}
          </g>
        `
      })
    });

    // 既存デザイン（――ここまで既存） ---------------------------------

    // ======== 新規10デザイン追加 ========

    // 1) DAD BOD SURF TEAM（家族ネタ）
    list.push({
      id: "dad-bod-surf-team",
      title: "DAD BOD SURF TEAM｜公式キャプテン制",
      tags: ["family","joke","sponsor","logo"],
      badge: ["楕円","家族","自虐"],
      editable: [
        {key:"title", label:"タイトル", default:"DAD BOD"},
        {key:"sub",   label:"サブ",     default:"SURF TEAM — captain"}
      ],
      defaultFields: {title:"DAD BOD", sub:"SURF TEAM — captain"},
      svg: ({w=860,h=480,fields={}}={}) => withFrame({
        w,h, stroke:"#ffffff", strokeW:10, bg:"#0b1220",
        body: (x,y,W,H)=> ovalSponsor({x,y,W,H,grad1:"#fb7185",grad2:"#f59e0b",title:fields.title,sub:fields.sub})
      })
    });

    // 2) EARLY? NO.（辛口・脱力）
    list.push({
      id: "early-no",
      title: "EARLY? NO.｜潮が落ち着いたら出ます",
      tags: ["slogan","joke","lazy"],
      badge: ["白黒","極太","横長"],
      editable: [
        {key:"main", label:"メイン", default:"EARLY? NO."},
        {key:"sub",  label:"サブ",  default:"arrive after tide"}
      ],
      defaultFields: {main:"EARLY? NO.", sub:"arrive after tide"},
      svg: ({w=900,h=300,fields={}}={}) => withFrame({
        w,h, stroke:"#0f172a", strokeW:8, bg:"#ffffff",
        body: (x,y,W,H)=> slogan({x,y,W,H,fg:"#0f172a",text:fields.main,sub:fields.sub})
      })
    });

    // 3) GROM TAXI（家族送迎）
    list.push({
      id: "grom-taxi",
      title: "GROM TAXI｜週末は運転手",
      tags: ["family","illust","joke","van"],
      badge: ["バン","家族","横長"],
      editable: [
        {key:"main", label:"メイン", default:"GROM TAXI"},
        {key:"sub",  label:"サブ",  default:"weekend driver"}
      ],
      defaultFields: {main:"GROM TAXI", sub:"weekend driver"},
      svg: ({w=900,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#22c55e", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#22c55e" stroke-width="8" fill="none" stroke-linecap="round">
            <rect x="${x+W*0.12}" y="${y+H*0.28}" width="${W*0.52}" height="${H*0.24}" rx="${W*0.02}" />
            <circle cx="${x+W*0.24}" cy="${y+H*0.56}" r="${H*0.06}" />
            <circle cx="${x+W*0.54}" cy="${y+H*0.56}" r="${H*0.06}" />
            <line x1="${x+W*0.40}" y1="${y+H*0.28}" x2="${x+W*0.40}" y2="${y+H*0.52}"/>
            <path d="M ${x+W*0.68} ${y+H*0.22} q ${W*0.06} ${-H*0.10} ${W*0.14} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e2e8f0" font-weight="900">
            ${fitTextTag({x:x+W*0.70, y:y+H*0.46, text:(fields.main), weight:900, sizePx:H*0.20, boxW:W*0.26})}
            ${fitTextTag({x:x+W*0.70, y:y+H*0.72, text:(fields.sub),  weight:800, sizePx:H*0.16, boxW:W*0.26, fill:"#22c55e"})}
          </g>
        `
      })
    });

    // 4) RAIN CHECK PRO（辛口）
    list.push({
      id: "rain-check-pro",
      title: "RAIN CHECK PRO｜天候言い訳協会",
      tags: ["ban","joke","lazy"],
      badge: ["斜線","強調","モノクロ"],
      editable: [
        {key:"title", label:"メイン", default:"RAIN CHECK"},
        {key:"sub",   label:"サブ",   default:"PRO — officially postponed"}
      ],
      defaultFields: {title:"RAIN CHECK", sub:"PRO — officially postponed"},
      svg: ({w=880,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#93c5fd", strokeW:10, bg:"#0b1220",
        body: (x,y,W,H)=> prohibited({x,y,W,H,color:"#93c5fd",title:fields.title,sub:fields.sub})
      })
    });

    // 5) LEFTOVER WAX（皮肉スポンサー）
    list.push({
      id: "leftover-wax",
      title: "LEFTOVER WAX｜前回の余りがスポンサー",
      tags: ["sponsor","joke","logo"],
      badge: ["矩形","白地","皮肉"],
      editable: [
        {key:"line1", label:"1行目", default:"LEFTOVER"},
        {key:"line2", label:"2行目", default:"WAX — since last trip"}
      ],
      defaultFields: {line1:"LEFTOVER", line2:"WAX — since last trip"},
      svg: ({w=860,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#111827", strokeW:10, bg:"#ffffff",
        body: (x,y,W,H)=> rectSponsor({x,y,W,H,text1:fields.line1,text2:fields.line2,t1:"#111827",t2:"#0ea5e9"})
      })
    });

    // 6) WEEKEND WARRIOR（自虐スローガン）
    list.push({
      id: "weekend-warrior",
      title: "WEEKEND WARRIOR｜平日は口だけ",
      tags: ["slogan","joke"],
      badge: ["横長","白黒","大文字"],
      editable: [
        {key:"main", label:"メイン", default:"WEEKEND WARRIOR"},
        {key:"sub",  label:"サブ",  default:"talks on weekdays"}
      ],
      defaultFields: {main:"WEEKEND WARRIOR", sub:"talks on weekdays"},
      svg: ({w=900,h=300,fields={}}={}) => withFrame({
        w,h, stroke:"#111827", strokeW:8, bg:"#ffffff",
        body: (x,y,W,H)=> slogan({x,y,W,H,fg:"#111827",text:fields.main,sub:fields.sub})
      })
    });

    // 7) SPREADSHEET SURF CLUB（IT/脱力）
    list.push({
      id: "spreadsheet-surf-club",
      title: "SPREADSHEET SURF CLUB｜表計算から波予測",
      tags: ["maker","logo","joke","nerd"],
      badge: ["幾何","グラデ","横長"],
      editable: [
        {key:"a", label:"上段", default:"SPREADSHEET"},
        {key:"b", label:"下段", default:"SURF CLUB — vLOOKUP tide"}
      ],
      defaultFields: {a:"SPREADSHEET", b:"SURF CLUB — vLOOKUP tide"},
      svg: ({w=900,h=360,fields={}}={}) => withFrame({
        w,h, stroke:"#ffffff", strokeW:10, bg:"#0b1220",
        body: (x,y,W,H)=> maker({x,y,W,H,a:fields.a,b:fields.b,grad1:"#22c55e",grad2:"#3b82f6",icon:"hex"})
      })
    });

    // 8) QUIVER = 1 (borrowed)（辛口）
    list.push({
      id: "quiver-eq-1",
      title: "QUIVER = 1（借り物）｜身軽すぎる装備",
      tags: ["slogan","joke","gear"],
      badge: ["白黒","数式","横長"],
      editable: [
        {key:"main", label:"メイン", default:"QUIVER = 1"},
        {key:"sub",  label:"サブ",  default:"(borrowed)"}
      ],
      defaultFields: {main:"QUIVER = 1", sub:"(borrowed)"},
      svg: ({w=860,h=320,fields={}}={}) => withFrame({
        w,h, stroke:"#0f172a", strokeW:8, bg:"#ffffff",
        body: (x,y,W,H)=> slogan({x,y,W,H,fg:"#0f172a",text:fields.main,sub:fields.sub})
      })
    });

    // 9) TETRA BLOCKS LOCAL（テトラポッド地元）
    list.push({
      id: "tetra-blocks-local",
      title: "TETRA BLOCKS LOCAL｜テトラ観測隊",
      tags: ["local","illust","joke"],
      badge: ["幾何","波消し","丸角"],
      editable: [{key:"main",label:"メイン",default:"TETRA BLOCKS"},{key:"sub",label:"サブ",default:"LOCAL — sit & watch"}],
      defaultFields: {main:"TETRA BLOCKS", sub:"LOCAL — sit & watch"},
      svg: ({w=880,h=420,fields={}}={}) => withFrame({
        w,h, stroke:"#93c5fd", strokeW:10, bg:"#0b1220",
        body:(x,y,W,H)=> `
          <g stroke="#93c5fd" stroke-width="8" fill="none" stroke-linejoin="round">
            <polygon points="${polygonPoints(3, x+W*0.25, y+H*0.62, Math.min(W,H)*0.10)}" />
            <polygon points="${polygonPoints(3, x+W*0.40, y+H*0.66, Math.min(W,H)*0.10)}" />
            <polygon points="${polygonPoints(3, x+W*0.55, y+H*0.60, Math.min(W,H)*0.10)}" />
            <path d="M ${x+W*0.10} ${y+H*0.70} q ${W*0.15} ${-H*0.12} ${W*0.30} 0 q ${W*0.15} ${H*0.12} ${W*0.30} 0" />
          </g>
          <g font-family="system-ui, sans-serif" fill="#e5e7eb" font-weight="900" text-anchor="middle">
            ${fitTextTag({x:x+W*0.70, y:y+H*0.46, text:(fields.main), weight:900, sizePx:H*0.18, boxW:W*0.36, anchor:'middle'})}
            ${fitTextTag({x:x+W*0.70, y:y+H*0.74, text:(fields.sub),  weight:800, sizePx:H*0.14, boxW:W*0.30, anchor:'middle', fill:"#93c5fd"})}
          </g>
        `
      })
    });

    // 10) TIDE IN-LAWS（家族ネタ・義実家）
    list.push({
      id: "tide-in-laws",
      title: "TIDE IN-LAWS｜潮と義実家の機嫌待ち",
      tags: ["family","slogan","joke"],
      badge: ["横長","白黒","社会派"],
      editable: [
        {key:"main", label:"メイン", default:"TIDE IN-LAWS"},
        {key:"sub",  label:"サブ",  default:"both unpredictable"}
      ],
      defaultFields: {main:"TIDE IN-LAWS", sub:"both unpredictable"},
      svg: ({w=900,h=320,fields={}}={}) => withFrame({
        w,h, stroke:"#111827", strokeW:8, bg:"#ffffff",
        body: (x,y,W,H)=> slogan({x,y,W,H,fg:"#111827",text:fields.main,sub:fields.sub})
      })
    });

    // ======== 追加ここまで ========

    return list;
  }

  // ======== イベント初期化 ========
  initTags();
  $("#q")?.addEventListener("input", render);
  render();
})();
