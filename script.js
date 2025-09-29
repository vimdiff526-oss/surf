function nextStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
  document.getElementById('step' + n).classList.remove('hidden');
}
function prevStep(n) { nextStep(n); }

function showResult() {
  const w = parseInt(document.getElementById("weight").value, 10);
  const level = document.getElementById("level").value;
  const style = document.getElementById("style").value;
  const waves = document.getElementById("waves").value;

  let vol = w * (level === "beginner" ? 0.55 : level === "novice" ? 0.5 : 0.42);
  vol = Math.round(vol);

  let board = "オールラウンドショート";
  if (level === "beginner") board = "ファンボード / ミッドレングス";
  if (level === "novice" && style === "cruise") board = "フィッシュ / ミッドレングス";
  if (level === "intermediate" && style === "maneuver") board = "パフォーマンスショート";

  document.getElementById("boardType").textContent = "おすすめボード: " + board;
  document.getElementById("volume").textContent = "推奨ボリューム: 約 " + vol + " L";

  const result = document.getElementById("result");
  const link = document.createElement("a");
  link.className = "btn";
  link.href = `articles-json.html?level=${encodeURIComponent(level)}&style=${encodeURIComponent(style)}&waves=${encodeURIComponent(waves)}`;
  link.textContent = "あなた向け関連記事を見る →";
  result.appendChild(link);

  document.getElementById("quiz").classList.add("hidden");
  result.classList.remove('hidden');
}
