// ===== ダッシュボード（index.html）のロジック =====
import { db, NEXT_JAPAN_MATCH } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// ----- 起動 -----
window.addEventListener("DOMContentLoaded", () => {
  initUserStatus();
  startCountdown();
  checkPredictionStatus();
});

// ----- ユーザーステータス表示 -----
function initUserStatus() {
  const nickname = localStorage.getItem("wc2026:nickname");
  const el = document.getElementById("user-status");
  if (!el) return;
  el.textContent = nickname ? `${nickname} さん` : "未ログイン";
}

// ----- 日本戦までのカウントダウン -----
function startCountdown() {
  const target = new Date(NEXT_JAPAN_MATCH.kickoff).getTime();
  const el = document.getElementById("countdown");
  if (!el) return;

  const update = () => {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      el.textContent = "キックオフ！";
      el.style.color = "var(--color-primary)";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (days > 0) {
      el.textContent = `あと ${days}日 ${hours}時間 ${minutes}分`;
    } else {
      el.textContent = `あと ${hours}時間 ${minutes}分 ${seconds}秒`;
    }
  };

  update();
  setInterval(update, 1000);
}

// ----- 予想済み / 未予想バッジ -----
async function checkPredictionStatus() {
  const userId = localStorage.getItem("wc2026:userId");
  const ctaBtn = document.querySelector(".cta-button");
  if (!userId || !ctaBtn) return;

  try {
    const snap = await get(ref(db, `matches/${NEXT_JAPAN_MATCH.id}/predictions/${userId}`));
    const badge = document.createElement("span");
    badge.className = `prediction-badge ${snap.exists() ? "badge-done" : "badge-pending"}`;
    badge.textContent = snap.exists() ? "予想済み ✓" : "未予想";
    ctaBtn.parentNode.insertBefore(badge, ctaBtn);
  } catch (e) {
    // Firebase未接続時はバッジを出さない
  }
}
