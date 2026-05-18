// ===== 日本戦応援画面（jpn-match.html）のロジック =====
import { db, NEXT_JAPAN_MATCH } from "./firebase-config.js";
import { ref, set, get, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const MATCH_ID = NEXT_JAPAN_MATCH.id;
const LOCK_BEFORE_MS = 5 * 60 * 1000;

let predictionChart = null;
let currentScreen = null;
let preMatchInited = false;
let liveInited = false;
let postInited = false;

// ----- 起動 -----
window.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  checkExistingSession();
  initAdminPanel();
});

// ----- 既存セッションの確認 -----
function checkExistingSession() {
  const nickname = localStorage.getItem("wc2026:nickname");
  const userId = localStorage.getItem("wc2026:userId");
  if (nickname && userId) enterApp(userId);
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
    enterApp(userId);
  });
}

function showLoginError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.hidden = false;
}

// ----- アプリ入場 → Firebase の status を監視して画面を切り替え -----
function enterApp(userId) {
  document.getElementById("login-screen").hidden = true;

  onValue(ref(db, `matches/${MATCH_ID}/status`), (snap) => {
    const status = snap.val() || "pre";
    switchScreen(status, userId);
  });
}

function switchScreen(status, userId) {
  ["pre-match-screen", "live-screen", "post-match-screen"].forEach(id => {
    document.getElementById(id).hidden = true;
  });

  if (status === "pre") {
    document.getElementById("pre-match-screen").hidden = false;
    if (!preMatchInited) {
      preMatchInited = true;
      initPreMatchScreen(userId);
    }
  } else if (status === "live") {
    document.getElementById("live-screen").hidden = false;
    if (!liveInited) {
      liveInited = true;
      initLiveScreen(userId);
    }
  } else if (status === "post") {
    document.getElementById("post-match-screen").hidden = false;
    if (!postInited) {
      postInited = true;
      initPostMatchScreen(userId);
    }
  }

  currentScreen = status;
}

// ===== 試合前画面 =====

async function initPreMatchScreen(userId) {
  await loadSquadOptions();
  updateLockState();
  setInterval(updateLockState, 10000);
  await loadMyPrediction(userId);
  listenPredictions();
  initPredictionForm(userId);
}

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
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
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

// ===== 試合中画面 =====

function initLiveScreen(userId) {
  listenLiveScore();
  listenReactions();
  initReactionButtons(userId);
}

function listenLiveScore() {
  onValue(ref(db, `matches/${MATCH_ID}/liveScore`), (snap) => {
    const score = snap.val();
    const homeEl = document.getElementById("live-score-home");
    const awayEl = document.getElementById("live-score-away");
    const minEl = document.getElementById("live-minute");
    if (!homeEl) return;

    if (score) {
      homeEl.textContent = score.home ?? "-";
      awayEl.textContent = score.away ?? "-";
      minEl.textContent = score.minute ? `${score.minute}'` : "";
    }
  });
}

function listenReactions() {
  onValue(ref(db, `matches/${MATCH_ID}/reactions`), (snap) => {
    const data = snap.val() || {};
    const stream = document.getElementById("reaction-stream");
    if (!stream) return;

    const emojiMap = { goal: "⚽", close: "😣", amazing: "🔥", foul: "😡" };
    const labelMap = { goal: "ゴール！", close: "惜しい！", amazing: "すごい！", foul: "ファウル！" };

    const entries = Object.values(data)
      .sort((a, b) => b.submittedAt - a.submittedAt)
      .slice(0, 30);

    stream.innerHTML = entries.map(r => `
      <div class="reaction-item">
        <span class="reaction-emoji">${emojiMap[r.type] || "👋"}</span>
        <span class="reaction-name">${r.nickname || "名無し"}</span>
        <span class="reaction-label">${labelMap[r.type] || r.type}</span>
      </div>
    `).join("");
  });
}

function initReactionButtons(userId) {
  const nickname = localStorage.getItem("wc2026:nickname");
  document.querySelectorAll(".reaction-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const type = btn.dataset.reaction;
      btn.classList.add("reaction-sent");
      setTimeout(() => btn.classList.remove("reaction-sent"), 600);

      try {
        await push(ref(db, `matches/${MATCH_ID}/reactions`), {
          type,
          nickname,
          userId,
          submittedAt: Date.now()
        });
      } catch (e) {
        console.error("reaction送信失敗", e);
      }
    });
  });
}

// ===== 試合後画面 =====

async function initPostMatchScreen(userId) {
  const resultSnap = await get(ref(db, `matches/${MATCH_ID}/result`));
  const result = resultSnap.val();

  if (result) {
    document.getElementById("final-home").textContent = result.homeScore ?? "-";
    document.getElementById("final-away").textContent = result.awayScore ?? "-";
    if (result.firstScorer) {
      document.getElementById("first-scorer-result").textContent =
        `最初の得点者：${result.firstScorer}`;
    }
  }

  const predsSnap = await get(ref(db, `matches/${MATCH_ID}/predictions`));
  const predictions = predsSnap.val() || {};
  renderRanking(predictions, result, userId);
}

function getMatchResult(home, away) {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

function calculatePoints(pred, result) {
  if (!result) return 0;
  let pts = 0;

  if (pred.scoreHome === result.homeScore && pred.scoreAway === result.awayScore) {
    pts += 5;
  } else if (getMatchResult(pred.scoreHome, pred.scoreAway) === getMatchResult(result.homeScore, result.awayScore)) {
    pts += 2;
  }

  if (pred.firstScorer && result.firstScorer && pred.firstScorer === result.firstScorer) {
    pts += 3;
  }

  return pts;
}

function renderRanking(predictions, result, myUserId) {
  const ranked = Object.entries(predictions)
    .map(([uid, pred]) => ({
      uid,
      nickname: pred.nickname || "名無し",
      scoreHome: pred.scoreHome,
      scoreAway: pred.scoreAway,
      firstScorer: pred.firstScorer,
      points: calculatePoints(pred, result)
    }))
    .sort((a, b) => b.points - a.points);

  const medals = ["🥇", "🥈", "🥉"];
  const list = document.getElementById("ranking-list");

  list.innerHTML = ranked.map((entry, i) => `
    <div class="ranking-item ${entry.uid === myUserId ? "is-mine" : ""}">
      <span class="rank-medal">${medals[i] || `${i + 1}`}</span>
      <span class="rank-name">${entry.nickname}</span>
      <span class="rank-prediction">${entry.scoreHome}−${entry.scoreAway}</span>
      ${entry.firstScorer ? `<span class="rank-scorer">${entry.firstScorer}</span>` : ""}
      <span class="rank-points">${entry.points}pt</span>
    </div>
  `).join("");
}

// ===== 管理者パネル =====

function initAdminPanel() {
  const isAdmin = new URLSearchParams(location.search).get("admin") === "1";
  const panel = document.getElementById("admin-panel");
  if (!isAdmin || !panel) return;

  panel.hidden = false;

  // 選手リストをadminにも読み込む
  fetch("./data/japan-squad.json")
    .then(r => r.json())
    .then(data => {
      const sel = document.getElementById("admin-first-scorer");
      data.players.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.name;
        opt.textContent = p.name;
        sel.appendChild(opt);
      });
    })
    .catch(() => {});

  // ステータス更新
  document.getElementById("admin-status-btn").addEventListener("click", async () => {
    const status = document.getElementById("admin-status").value;
    await set(ref(db, `matches/${MATCH_ID}/status`), status);
    showAdminMessage(`ステータスを「${status}」に更新しました`);
  });

  // ライブスコア更新
  document.getElementById("admin-live-btn").addEventListener("click", async () => {
    const home = parseInt(document.getElementById("admin-live-home").value, 10);
    const away = parseInt(document.getElementById("admin-live-away").value, 10);
    const minute = parseInt(document.getElementById("admin-live-minute").value, 10);
    if (isNaN(home) || isNaN(away)) { showAdminMessage("スコアを入力してください"); return; }
    await set(ref(db, `matches/${MATCH_ID}/liveScore`), {
      home, away, minute: isNaN(minute) ? null : minute
    });
    showAdminMessage(`ライブスコアを ${home}−${away}（${minute || "?"}分）に更新しました`);
  });

  // 最終結果確定
  document.getElementById("admin-final-btn").addEventListener("click", async () => {
    const homeScore = parseInt(document.getElementById("admin-final-home").value, 10);
    const awayScore = parseInt(document.getElementById("admin-final-away").value, 10);
    const firstScorer = document.getElementById("admin-first-scorer").value || null;
    if (isNaN(homeScore) || isNaN(awayScore)) { showAdminMessage("スコアを入力してください"); return; }
    await set(ref(db, `matches/${MATCH_ID}/result`), { homeScore, awayScore, firstScorer });
    await set(ref(db, `matches/${MATCH_ID}/status`), "post");
    showAdminMessage(`最終結果 ${homeScore}−${awayScore} を確定しました。ステータスを post に変更しました。`);
  });
}

function showAdminMessage(msg) {
  const el = document.getElementById("admin-message");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, 4000);
}

// ----- SHA-256 -----
async function sha256(text) {
  const buffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}
