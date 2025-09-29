"use client";

import { useMemo, useState } from "react";

const LEVELS = [
  { value: "beginner", label: "初心者（始めたばかり〜）" },
  { value: "novice", label: "初級（テイクオフ練習中）" },
  { value: "intermediate", label: "中級（横に走れる）" },
];

const STYLES = [
  { value: "cruise", label: "ゆったりクルーズしたい" },
  { value: "takeoff", label: "早めのテイクオフを安定させたい" },
  { value: "maneuver", label: "トリック・マニューバ重視" },
];

const WAVES = [
  { value: "knee_waist", label: "ヒザ〜コシ" },
  { value: "shoulder_head", label: "カタ〜アタマ" },
  { value: "overhead", label: "アタマ上" },
];

function estimateVolumeKgKgcm2(heightCm, weightKg, level) {
  // ベースは体重から。初〜中級者は余裕を持って体重×0.45〜0.55L目安。
  const base = weightKg * (level === "beginner" ? 0.55 : level === "novice" ? 0.5 : 0.42);
  // 背の高さを軽微に加味（背が高いとパドル安定に少しプラス）
  const heightAdj = heightCm > 180 ? 2 : heightCm < 160 ? -1 : 0;
  return Math.max(25, Math.round((base + heightAdj) * 10) / 10);
}

function chooseBoardType(level, style, waves, volume) {
  // 直感的ルールベース
  if (level === "beginner") {
    if (style === "cruise") return "ミッドレングス（7'0\"〜8'0\"）/ ロング寄り";
    if (style === "takeoff") return "ファンボード（6'8\"〜7'6\"）";
    return "ミッドレングス or 浮力多めショート（ボリューム重視）";
  }
  if (level === "novice") {
    if (style === "cruise") return "ミッドレングス / フィッシュ（浮力多め）";
    if (style === "takeoff") return "ファンボード or フィッシュ";
    return waves === "knee_waist" ? "フィッシュ" : "浮力多めショート";
  }
  // intermediate
  if (style === "maneuver") {
    return waves === "knee_waist" ? "フィッシュ / グロベラー" : "パフォーマンスショート";
  }
  if (style === "cruise") return "ミッドレングス";
  return "オールラウンドショート（やや浮力）";
}

const AFFIL_SLOTS = [
  {
    title: "エントリー向け ファンボード 7'0\" 〜",
    desc: "テイクオフが安定。初心者〜初級に最適。",
    url: "https://www.amazon.co.jp/s?k=funboard+surf&tag=YOUR_TAG-22", // ←差し替え
  },
  {
    title: "ミッドレングス特集",
    desc: "クルーズ重視ならココ。7'0\"〜8'0\"",
    url: "https://www.amazon.co.jp/s?k=midlength+surf&tag=YOUR_TAG-22", // ←差し替え
  },
  {
    title: "フィッシュ＆グロベラー",
    desc: "小波の日も楽しめる万能選手。",
    url: "https://www.amazon.co.jp/s?k=fish+surfboard&tag=YOUR_TAG-22", // ←差し替え
  },
  {
    title: "ウェットスーツ（季節別）",
    desc: "快適さが結局パフォーマンスに直結。",
    url: "https://www.amazon.co.jp/s?k=wetsuit+surf&tag=YOUR_TAG-22", // ←差し替え
  },
];

export default function QuizPage() {
  const [step, setStep] = useState(1);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [level, setLevel] = useState("beginner");
  const [style, setStyle] = useState("cruise");
  const [waves, setWaves] = useState("knee_waist");
  const [paddle, setPaddle] = useState(3); // 1〜5 主観
  const [freq, setFreq] = useState(2); // 1〜5 月間回数の感覚
  const [result, setResult] = useState(null);

  const canNext = useMemo(() => {
    if (step === 1) return height > 120 && height < 220 && weight > 30 && weight < 150;
    return true;
  }, [step, height, weight]);

  function handleNext() {
    if (!canNext) return;
    if (step < 4) setStep(step + 1);
    else {
      // 診断計算
      let vol = estimateVolumeKgKgcm2(height, weight, level);

      // paddling/頻度で微調整
      if (paddle <= 2) vol += 2; // パドル弱め → 少し増やす
      if (freq <= 2 && level !== "intermediate") vol += 1; // 海行く頻度少 → 浮力少しプラス
      if (waves === "overhead" && level === "intermediate") vol -= 1.5; // 大波で中級 → 取り回し寄り

      vol = Math.max(25, Math.round(vol * 10) / 10);

      const boardType = chooseBoardType(level, style, waves, vol);

      setResult({
        volume: vol,
        boardType,
        profile: { height, weight, level, style, waves, paddle, freq }
      });
      setStep(5);
      // ここで gtag などイベント送信も可
      // window.gtag?.('event', 'diagnosis_complete', { volume: vol, boardType });
    }
  }

  function handleBack() {
    if (step > 1 && step <= 4) setStep(step - 1);
  }

  return (
    <main className="grid" style={{gap: 20}}>
      <section className="card">
        <div className="h1">サーフボード診断</div>
        <div className="muted small">Step {step <=4 ? `${step} / 4` : "結果"}</div>
        <div className="divider" />

        {step === 1 && (
          <div className="grid">
            <div className="row">
              <label className="label">身長（cm）</label>
              <input className="input" type="number" min={130} max={220}
                     value={height} onChange={e=>setHeight(Number(e.target.value))}/>
            </div>
            <div className="row">
              <label className="label">体重（kg）</label>
              <input className="input" type="number" min={35} max={150}
                     value={weight} onChange={e=>setWeight(Number(e.target.value))}/>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid">
            <div className="row">
              <label className="label">レベル</label>
              <select className="select" value={level} onChange={e=>setLevel(e.target.value)}>
                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div className="row">
              <label className="label">スタイル</label>
              <select className="select" value={style} onChange={e=>setStyle(e.target.value)}>
                {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid">
            <div className="row">
              <label className="label">よく入る波サイズ</label>
              <select className="select" value={waves} onChange={e=>setWaves(e.target.value)}>
                {WAVES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </div>
            <div className="row">
              <label className="label">パドリング自信度（1弱〜5強）: {paddle}</label>
              <input className="range" type="range" min={1} max={5} value={paddle}
                     onChange={e=>setPaddle(Number(e.target.value))}/>
            </div>
            <div className="row">
              <label className="label">サーフィン頻度（1少〜5多）: {freq}</label>
              <input className="range" type="range" min={1} max={5} value={freq}
                     onChange={e=>setFreq(Number(e.target.value))}/>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid">
            <div className="card">
              <div className="h3">入力確認</div>
              <div className="small muted">
                身長 {height}cm / 体重 {weight}kg / レベル {LEVELS.find(l=>l.value===level)?.label} /<br/>
                スタイル {STYLES.find(s=>s.value===style)?.label} / 波 {WAVES.find(w=>w.value===waves)?.label} /<br/>
                パドル {paddle} / 頻度 {freq}
              </div>
            </div>
            <div className="muted small">内容に問題なければ「結果を見る」を押してください。</div>
          </div>
        )}

        {step === 5 && result && (
          <div className="grid">
            <div className="card">
              <div className="h2">診断結果</div>
              <div className="kpis">
                <div className="kpi">
                  <div className="h3">推奨ボリューム</div>
                  <div style={{fontSize: 22, fontWeight: 800}}>{result.volume} L</div>
                </div>
                <div className="kpi">
                  <div className="h3">ボード種別</div>
                  <div style={{fontSize: 16, fontWeight: 700}}>{result.boardType}</div>
                </div>
              </div>
              <div className="divider" />
              <div className="small muted">
                ※ 目安値です。実際のブランドやモデルで体感は変わります。迷ったら少しだけ浮力多めが無難です。
              </div>
            </div>

            <div className="card">
              <div className="h2">おすすめアイテム（アフェリエイト）</div>
              <div className="grid" style={{gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12}}>
                {AFFIL_SLOTS.map((s, i) => (
                  <a key={i} className="card" href={s.url} target="_blank" rel="noopener noreferrer">
                    <div className="h3">{s.title}</div>
                    <div className="small muted">{s.desc}</div>
                    <div className="divider" />
                    <div className="badge">ショップで見る</div>
                  </a>
                ))}
              </div>
              <div className="small muted" style={{marginTop: 8}}>
                ※ 上記URLの <code>YOUR_TAG-22</code> を、ご自身のアフェリエイトIDに差し替えてください。
              </div>
            </div>

            <div className="card">
              <div className="h2">もっと理解を深める</div>
              <ul className="list">
                <li className="small">・ボリュームが大きいほど浮力が増し、テイクオフと安定性が向上します。</li>
                <li className="small">・小波中心ならフィッシュ/グロベラー、クルーズ重視ならミッドレングスが◎</li>
                <li className="small">・中級以上で大波狙いはパフォーマンスショート＋やや低ボリュームが取り回し良。</li>
              </ul>
            </div>
          </div>
        )}

        <div className="divider" />
        <div style={{display: "flex", gap: 8, justifyContent: "space-between"}}>
          <button className="btn" onClick={handleBack} disabled={step===1 || step===5} style={{opacity: (step===1||step===5)?0.5:1}}>
            ← 戻る
          </button>
          {step <= 4 && (
            <button className="btn" onClick={handleNext} disabled={!canNext} style={{opacity: canNext?1:0.6}}>
              {step === 4 ? "結果を見る" : "次へ →"}
            </button>
          )}
          {step === 5 && (
            <a className="btn" href="/" aria-label="ホームへ">ホームへ戻る</a>
          )}
        </div>
      </section>
    </main>
  );
}
