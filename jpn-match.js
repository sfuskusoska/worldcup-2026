// ===== 日本戦応援画面（jpn-match.html）のロジック =====
import { db, NEXT_JAPAN_MATCH } from "./firebase-config.js";
import { ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const MATCH_ID = NEXT_JAPAN_MATCH.id;
const LOCK_BEFORE_MS = 5 * 60 * 1000; // キックオフ5分前でロック

let predictionChart = null;

// ----- 起動 -----
window.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  checkExistingSession();
});

// ----- 既存セッションの確認 -----
function checkExistingSession() {
  const nickname = localStorage.getItem("wc2026:nickname");
  const userId = localStorage.getItem("wc2026:userId");
  if (nickname && userId) showPreMatchScreen();
}

// ----- ログインフォーム -----
function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nickname = document.getElementById("nickname-input").value.trim();
    const passphrase = document.getElementById("passphrase-input").value;
    document.getElementById("login-error").hidden = true;

    if (!nickname || !passphrase) {
      showLoginError("ニックネームと合言葉を入力してください");
      return;
    }

    const hash = await sha256(passphrase);
    const expected = await sha256("samurai2026");
    if (hash !== expected) {
      showLoginError("合言葉が違います");
      return;
    }

    const userId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    localStorage.setItem("wc2026:nickname", nickname);
    localStorage.setItem("wc2026:userId", userId);
    showPreMatchScreen();
  });
}

function showLoginError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.hidden = false;
}

// ----- 試合前画面 -----
async function showPreMatchScreen() {
  document.getElementById("login-screen").hidden = true;
  document.getElementById("pre-match-screen").hidden = false;

  await loadSquadOptions();
  updateLockState();
  setInterval(updateLockState, 10000);

  const userId = localStorage.getItem("wc2026:userId");
  await loadMyPrediction(userId);

  listenPredictions();
  initPredictionForm(userId);
}

// ----- 選手リスト読み込み -----
async function loadSquadOptions() {
  try {
    const res = await fetch("./data/japan-squad.json");
    const data = await res.json();
    const sel = document.getElementById("first-scorer");
    data.players.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.position !== "—"
        ? `${p.no}. ${p.name}`
        : p.name;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("squad読み込み失敗", e);
  }
}

// ----- ロック判定 -----
function isLocked() {
  const kickoff = new Date(NEXT_JAPAN_MATCH.kickoff).getTime();
  return Date.now() >= kickoff - LOCK_BEFORE_MS;
}

function updateLockState() {
  const locked = isLocked();
  const form = document.getElementById("prediction-form");
  const notice = document.getElementById("lock-notice");
  const btn = document.getElementById("prediction-submit");
  if (!form) return;

  notice.hidden = !locked;
  btn.disabled = locked;
  form.querySelectorAll("input, select").forEach(el => el.disabled = locked);
}

// ----- 自分の予想を取得して表示 -----
async function loadMyPrediction(userId) {
  const snap = await get(ref(db, `matches/${MATCH_ID}/predictions/${userId}`));
  if (!snap.exists()) return;

  const pred = snap.val();
  document.getElementById("score-home").value = pred.scoreHome;
  document.getElementById("score-away").value = pred.scoreAway;
  if (pred.firstScorer) {
    document.getElementById("first-scorer").value = pred.firstScorer;
  }
  showPredictionMessage(`予想済み（${pred.scoreHome}−${pred.scoreAway}）送信済みです。変更も可能です。`);
}

// ----- 予想フォーム送信 -----
function initPredictionForm(userId) {
  const form = document.getElementById("prediction-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isLocked()) return;

    const scoreHome = parseInt(document.getElementById("score-home").value, 10);
    const scoreAway = parseInt(document.getElementById("score-away").value, 10);
    const firstScorer = document.getElementById("first-scorer").value;
    const btn = document.getElementById("prediction-submit");

    btn.disabled = true;
    btn.textContent = "送信中…";

    try {
      await set(ref(db, `matches/${MATCH_ID}/predictions/${userId}`), {
        scoreHome,
        scoreAway,
        firstScorer: firstScorer || null,
        nickname: localStorage.getItem("wc2026:nickname"),
        submittedAt: Date.now()
      });
      showPredictionMessage(`✓ ${scoreHome}−${scoreAway} で予想を送りました`);
    } catch (err) {
      showPredictionMessage("送信に失敗しました。再度お試しください。");
      console.error(err);
    } finally {
      btn.disabled = isLocked();
      btn.textContent = "予想を送る";
    }
  });
}

function showPredictionMessage(msg) {
  const el = document.getElementById("prediction-message");
  el.textContent = msg;
  el.hidden = false;
}

// ----- 全員の予想をリアルタイム取得 → チャート更新 -----
function listenPredictions() {
  onValue(ref(db, `matches/${MATCH_ID}/predictions`), (snap) => {
    const data = snap.val() || {};
    renderChart(data);
    renderList(data);
  });
}

function renderChart(data) {
  const counts = {};
  Object.values(data).forEach(p => {
    const key = `${p.scoreHome}−${p.scoreAway}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([k]) => k);
  const values = sorted.map(([, v]) => v);
  const total = values.reduce((s, v) => s + v, 0);

  document.getElementById("vote-count").textContent = total ? `（${total}票）` : "";

  const ctx = document.getElementById("prediction-chart").getContext("2d");

  if (predictionChart) predictionChart.destroy();

  predictionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "票数",
        data: values,
        backgroundColor: "rgba(200, 16, 46, 0.7)",
        borderColor: "rgba(200, 16, 46, 1)",
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

function renderList(data) {
  const list = document.getElementById("prediction-list");
  const myUserId = localStorage.getItem("wc2026:userId");
  const entries = Object.entries(data).sort((a, b) => b[1].submittedAt - a[1].submittedAt);

  list.innerHTML = entries.map(([uid, p]) => `
    <div class="prediction-item ${uid === myUserId ? "is-mine" : ""}">
      <span class="pred-name">${p.nickname || "名無し"}</span>
      <span class="pred-score">${p.scoreHome}−${p.scoreAway}</span>
      ${p.firstScorer ? `<span class="pred-scorer">${p.firstScorer}</span>` : ""}
    </div>
  `).join("");
}

// ----- SHA-256 -----
async function sha256(text) {
  const buffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}
