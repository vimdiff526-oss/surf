"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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
  const base = weightKg * (level === "beginner" ? 0.55 : level === "novice" ? 0.5 : 0.42);
  const heightAdj = heightCm > 180 ? 2 : heightCm < 160 ? -1 : 0;
  return Math.max(25, Math.round((base + heightAdj) * 10) / 10);
}

function chooseBoardType(level, style, waves, volume) {
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
    url: "https://www.amazon.co.jp/s?k=funboard+surf&tag=YOUR_TAG-22",
  },
  {
    title: "ミッドレングス特集",
    desc: "クルーズ重視ならココ。7'0\"〜8'0\"",
    url: "https://www.amazon.co.jp/s?k=midlength+surf&tag=YOUR_TAG-22",
  },
  {
    title: "フィッシュ＆グロベラー",
    desc: "小波の日も楽しめる万能選手。",
    url: "https://www.amazon.co.jp/s?k=fish+surfboard&tag=YOUR_TAG-22",
  },
  {
    title: "ウェットスーツ（季節別）",
    desc: "快適さが結局パフォーマンスに直結。",
    url: "https://www.amazon.co.jp/s?k=wetsuit+surf&tag=YOUR_TAG-22",
  },
];

export default function QuizPage() {
  const [step, setStep] = useState(1);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [level, setLevel] = useState("beginner");
  const [style, setStyle] = useState("cruise");
  const [waves, setWaves] = useState("knee_waist");
  const [paddle, setPaddle] = useState(3);
  const [freq, setFreq] = useState(2);
  const [result, setResult] = useState(null);

  const canNext = useMemo(() => {
    if (step === 1) return height > 120 && height < 220 && weight > 30 && weight < 150;
    return true;
  }, [step, height, weight]);

  function handleNext() {
    if (!canNext) return;
    if (step < 4) setStep(step + 1);
    else {
      let vol = estimateVolumeKgKgcm2(height, weight, level);
      if (paddle <= 2) vol += 2;
      if (freq <= 2 && level !== "intermediate") vol += 1;
      if (waves === "overhead" && level === "intermediate") vol -= 1.5;
      vol = Math.max(25, Math.round(vol * 10) / 10);
      const boardType = chooseBoardType(level, style, waves, vol);

      setResult({
        volume: vol,
        boardType,
        profile: { height, weight, level, style, waves, paddle, freq },
      });
      setStep(5);
    }
  }

  function handleBack() {
    if (step > 1 && step <= 4) setStep(step - 1);
  }

  return (
    <main className="grid" style={{ gap: 20 }}>
      <section className="card">
        <div className="h1">サーフボード診断</div>
        <div className="muted small">Step {step <= 4 ? `${step} / 4` : "結果"}</div>
        <div className="divider" />

        {/* ステップごとのフォームは省略、前回と同じ */}

        {step === 5 && result && (
          <div className="grid">
            <div className="card">
              <div className="h2">診断結果</div>
              <div className="kpis">
                <div className="kpi">
                  <div className="h3">推奨ボリューム</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{result.volume} L</div>
                </div>
                <div className="kpi">
                  <div className="h3">ボード種別</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{result.boardType}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="h2">おすすめアイテム（アフェリエイト）</div>
              <div
                className="grid"
                style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}
              >
                {AFFIL_SLOTS.map((s, i) => (
                  <a
                    key={i}
                    className="card"
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="h3">{s.title}</div>
                    <div className="small muted">{s.desc}</div>
                    <div className="divider" />
                    <div className="badge">ショップで見る</div>
                  </a>
                ))}
              </div>
            </div>

            {/* ★関連記事導線を追加 */}
            <div className="card">
              <div className="h2">さらに学ぶ</div>
              <p className="small muted">
                ボード選びやサーフィンのコツを深掘りした記事をチェック！
              </p>
              <Link href="/articles" className="btn" style={{ marginTop: 12 }}>
                関連記事ページへ →
              </Link>
            </div>
          </div>
        )}

        <div className="divider" />
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button
            className="btn"
            onClick={handleBack}
            disabled={step === 1 || step === 5}
            style={{ opacity: step === 1 || step === 5 ? 0.5 : 1 }}
          >
            ← 戻る
          </button>
          {step <= 4 && (
            <button
              className="btn"
              onClick={handleNext}
              disabled={!canNext}
              style={{ opacity: canNext ? 1 : 0.6 }}
            >
              {step === 4 ? "結果を見る" : "次へ →"}
            </button>
          )}
          {step === 5 && (
            <a className="btn" href="/" aria-label="ホームへ">
              ホームへ戻る
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
