(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== モバイルDL互換（さらに強化） =====
  const isIOS = /iP(hone|od|ad)/.test(navigator.platform)
    || ((/Mac/.test(navigator.userAgent) && "ontouchend" in document))
    || (/iOS|iPhone|iPad|CriOS|FxiOS|Safari/.test(navigator.userAgent) && "ontouchend" in document);
  const supportsDownloadAttr = 'download' in document.createElement('a');

  function toast(msg){
    if ($('#toast-style')==null){
      const style = document.createElement('style');
      style.id = 'toast-style';
      style.textContent = `.toast{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:9999;background:#0f1729;color:#e2e8f0;border:1px solid #1f2b3f;border-radius:12px;padding:10px 14px;box-shadow:0 6px 18px rgba(0,0,0,.25);font:600 13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}`;
      document.head.appendChild(style);
    }
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg; document.body.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; }, 1800);
    setTimeout(()=>{ el.remove(); }, 2200);
  }

  function downloadBlobSmart(blob, filename){
    if (supportsDownloadAttr && !isIOS){
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 1000);
    } else {
      // iOS: dataURL化して <img> を含むHTMLとして新規タブに表示 → 長押し保存が最も確実
      const fr = new FileReader();
      fr.onload = () => {
        const dataURL = fr.result; // e.g. data:image/png;base64,...
        const html = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(filename)}</title>
          <body style="margin:0;background:#000;display:grid;place-items:center;min-height:100vh">
          <img src="${dataURL}" alt="image" style="max-width:100%;height:auto"/>
          <div style="position:fixed;top:10px;left:0;right:0;text-align:center;color:#fff;font:600 14px system-ui">長押しで保存</div>
          </body>`;
        const pageURL = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        const w = window.open(pageURL, '_blank');
        if (!w) toast('新しいタブを開けませんでした。ポップアップを許可してください。');
      };
      fr.readAsDataURL(blob);
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
    // 防CORS（同一オリジンのdata URLなので不要だが一応）
    img.crossOrigin = 'anonymous';
    const [w,h] = readViewbox(svgString) || [1024, 512];
    const ratio = w / h; const destW = px; const destH = Math.round(px / ratio);
    const canvas = document.createElement('canvas'); canvas.width = destW; canvas.height = destH;
    const ctx = canvas.getContext('2d');
    await new Promise(res => { img.onload = res; img.src = svg64; });
    ctx.clearRect(0,0,destW,destH); ctx.drawImage(img, 0, 0, destW, destH);
    return await new Promise(res => canvas.toBlob(res, 'image/png'));
  }

  // ======= テキストフィット（はみ出し抑制） =======
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d');
  function fitTextSize(text, targetWidth, basePx, weight=900){
    // 目標幅に収まるフォントサイズにスケール（多バイトでもmeasureTextで計測）
    const fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    const clamp = (n, lo, hi)=> Math.max(lo, Math.min(hi, n));
    let size = basePx;
    mctx.font = `${weight} ${size}px ${fontFamily}`;
    let w = mctx.measureText(text).width;
    if (w <= targetWidth) return size;
    // 1回で概算スケール
    size = Math.max(8, Math.floor(size * (targetWidth / w)));
    mctx.font = `${weight} ${size}px ${fontFamily}`;
    w = mctx.measureText(text).width;
    // 微調整
    while (w > targetWidth && size > 8){
      size -= 1; mctx.font = `${weight} ${size}px ${fontFamily}`;
      w = mctx.measureText(text).width;
    }
    return clamp(size, 8, basePx);
  }

  // ======= デザイン定義 =======
  // 重要：withFrame の inner を広げ、安全マージン増（= はみ出し耐性UP）
  function withFrame({w,h,rx=Math.round(Math.min(w,h)*0.06), inner=14, body, stroke="#ffffff", strokeW=0, bg=null}){
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

  // テキスト主体の各ボディで fitTextSize を使用（title / sub / text1 / text2 / name）
  function sponsorRectBody({x,y,W,H, text1,text2, t1,t2}){
    const base1 = Math.min(W,H)*0.24, base2 = Math.min(W,H)*0.18;
    const fs1 = fitTextSize(text1, W*0.84, base1, 900);
    const fs2 = fitTextSize(text2, W*0.84, base2, 800);
    return `<g font-family="system-ui, sans-serif" font-weight="800">
      <text x="${x+W*0.02}" y="${y+H*0.46}" font-weight="900" dominant-baseline="middle" font-size="${fs1}" fill="${t1}">${esc(text1)}</text>
      <text x="${x+W*0.02}" y="${y+H*0.80}" font-size="${fs2}" fill="${t2}">${esc(text2)}</text>
    </g>`;
  }
  function roundBadgeBody({x,y,W,H, text}){
    const r = Math.min(W,H)/2 - 6, cx = x+W/2, cy = y+H/2;
    const fs = fitTextSize(text, W*0.86, r*0.30, 900);
    return `<defs><linearGradient id="g${hash(text)}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3ec4ff"/><stop offset="1" stop-color="#0ea5e980"/></linearGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g${hash(text)})" stroke="#ffffff" stroke-width="8"/>
      <g font-family="system-ui, sans-serif" fill="#ffffff" text-anchor="middle">
        <text x="${cx}" y="${cy}" font-weight="900" font-size="${fs}" dominant-baseline="central">${esc(text)}</text>
      </g>`;
  }
  function sloganBody({x,y,W,H, fg,text,sub}){
    const fs1 = fitTextSize(text, W*0.94, H*0.36, 900);
    const fs2 = sub ? fitTextSize(sub, W*0.90, H*0.14, 700) : 0;
    return `<g font-family="system-ui, sans-serif" text-anchor="middle">
      <text x="${x+W/2}" y="${y+H*0.52}" font-weight="900" font-size="${fs1}" fill="${fg}" dominant-baseline="middle">${esc(text)}</text>
      ${sub ? `<text x="${x+W/2}" y="${y+H*0.82}" font-weight="700" font-size="${fs2}" fill="${fg}" opacity="0.75">${esc(sub)}</text>`:``}
    </g>`;
  }
  function ovalSponsorBody({x,y,W,H,grad1,grad2,title,sub}){
    const pad = Math.min(W,H)*0.08, cx=x+W/2, cy=y+H/2, rx=W/2-pad, ry=H/2-pad;
    const fs1 = fitTextSize(title, W*0.86, H*0.24, 900);
    const fs2 = sub ? fitTextSize(sub, W*0.70, H*0.14, 700) : 0;
    const gid = `lg${hash(title)}`;
    return `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${grad1}"/><stop offset="1" stop-color="${grad2}"/></linearGradient></defs>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${gid})" stroke="#ffffff" stroke-width="8"/>
      <g font-family="system-ui, sans-serif" text-anchor="middle" fill="#ffffff">
        <text x="${cx}" y="${cy - H*0.06}" font-weight="900" font-size="${fs1}">${esc(title)}</text>
        ${sub ? `<text x="${cx}" y="${cy + H*0.16}" font-weight="700" font-size="${fs2}" opacity="0.92">${esc(sub)}</text>`:``}
      </g>`;
  }
  function prohibitedBody({x,y,W,H, border,title,sub}){
    const fs1 = fitTextSize(title, W*0.90, H*0.24, 900);
    const fs2 = sub ? fitTextSize(sub, W*0.86, H*0.14, 700) : 0;
    const gid = `pat${hash(title)}`;
    return `<defs><pattern id="${gid}" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(-20)">
        <rect width="40" height="40" fill="#0b1220"/><rect width="20" height="40" fill="#111827"/></pattern></defs>
      <rect x="${x}" y="${y}" width="${W}" height="${H}" rx="${Math.min(W,H)*0.06}" fill="url(#${gid})" stroke="${border}" stroke-width="6"/>
      <g font-family="system-ui, sans-serif" text-anchor="middle">
        <text x="${x+W/2}" y="${y+H*0.48}" font-weight="900" font-size="${fs1}" fill="#fff" letter-spacing="1.5">${esc(title)}</text>
        ${sub ? `<text x="${x+W/2}" y="${y+H*0.78}" font-weight="700" font-size="${fs2}" fill="${border}" opacity="0.95">${esc(sub)}</text>`:``}
      </g>`;
  }
  function makerBody({x,y,W,H,a,b,grad1,grad2,icon}){
    const gid = `grad${hash(a+b)}`;
    const fsA = fitTextSize(a, W*0.50, H*0.24, 900);
    const fsB = fitTextSize(b, W*0.50, H*0.18, 800);
    const iconEl = makerIcon(icon, x+W*0.18, y+H*0.5, Math.min(W,H)*0.22);
    return `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${grad1}"/><stop offset="1" stop-color="${grad2}"/></linearGradient></defs>
      ${iconEl}
      <g font-family="system-ui, sans-serif" fill="#e5e7eb" font-weight="800">
        <text x="${x+W*0.42}" y="${y+H*0.50}" font-size="${fsA}">${esc(a)}</text>
        <text x="${x+W*0.42}" y="${y+H*0.78}" font-size="${fsB}" fill="url(#${gid})">${esc(b)}</text>
      </g>`;
  }
  function makerIcon(type, cx, cy, R){
    const stroke = '#ffffff';
    if (type==='hex'){ const pts = polygonPoints(6,cx,cy,R*0.72); return `<polygon points="${pts}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`; }
    if (type==='tri'){ const pts = polygonPoints(3,cx,cy,R*0.82); return `<polygon points="${pts}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`; }
    return `<circle cx="${cx}" cy="${cy}" r="${R*0.55}" fill="#0f172a" stroke="${stroke}" stroke-width="10"/>`;
  }
  function localBody({x,y,W,H,name}){
    const cx=x+W/2, cy=y+H/2, r=Math.min(W,H)/2-8;
    const top=`${name} SURF`, bottom='LOCAL PRIDE', gid=`lg${hash(name)}`;
    const fsTop = fitTextSize(top, W*0.90, r*0.30, 900);
    const fsBot = fitTextSize(bottom, W*0.80, r*0.20, 700);
    return `<defs><radialGradient id="${gid}" cx="50%" cy="38%" r="70%">
        <stop offset="0%" stop-color="#59d0ff"/><stop offset="100%" stop-color="#0ea5e9"/></radialGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gid})" stroke="#fff" stroke-width="10"/>
      <g font-family="system-ui, sans-serif" text-anchor="middle" fill="#ffffff">
        <text x="${cx}" y="${cy - r*0.25}" font-weight="900" font-size="${fsTop}">${esc(top)}</text>
        <text x="${cx}" y="${cy + r*0.30}" font-weight="700" font-size="${fsBot}" opacity="0.95">${esc(bottom)}</text>
      </g>`;
  }

  // ---- イラスト群（テキストは控えめなので溢れにくいが一応fit） ----
  function coffeeBoardIllust({x,y,W,H, title='OKA SURFER'}){
    const fs = fitTextSize(title, W*0.36, H*0.16, 900);
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
        <text x="${x+W*0.58}" y="${y+H*0.75}" font-size="${fs}">${esc(title)}</text>
      </g>`;
  }
  function deskSurfIllust({x,y,W,H, title1='DESK', title2='SURF DEPT.'}){
    const fs1 = fitTextSize(title1, W*0.30, H*0.22, 900);
    const fs2 = fitTextSize(title2, W*0.30, H*0.18, 800);
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
        <text x="${x+W*0.66}" y="${y+H*0.30}" font-size="${fs1}">${esc(title1)}</text>
        <text x="${x+W*0.66}" y="${y+H*0.54}" font-size="${fs2}" fill="#22d3ee">${esc(title2)}</text>
      </g>`;
  }
  function flipflopIllust({x,y,W,H, title1='FLIP-FLOP', title2='LIFE'}){
    const fs1 = fitTextSize(title1, W*0.34, H*0.18, 900);
    const fs2 = fitTextSize(title2, W*0.30, H*0.16, 800);
    return `<g stroke="#a7f3d0" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="${x+W*0.30}" cy="${y+H*0.50}" rx="${W*0.12}" ry="${H*0.24}" fill="#0f172a"/>
        <ellipse cx="${x+W*0.50}" cy="${y+H*0.54}" rx="${W*0.12}" ry="${H*0.24}" fill="#0f172a"/>
        <path d="M ${x+W*0.30} ${y+H*0.44} q ${W*0.02} ${H*0.08} 0 ${H*0.16} M ${x+W*0.50} ${y+H*0.48} q ${W*0.02} ${H*0.08} 0 ${H*0.16}"/>
      </g>
      <g fill="#e2e8f0" font-family="system-ui, sans-serif" font-weight="900">
        <text x="${x+W*0.66}" y="${y+H*0.46}" font-size="${fs1}">${esc(title1)}</text>
        <text x="${x+W*0.66}" y
