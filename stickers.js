/* stickers.js — humor-boosted edition
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
    const line1 = fitTextTag({x:x+pad, y:y+H*0.48, text:text1, weight:900, sizePx:Math.min(W,H)*0.24, boxW:w1,
