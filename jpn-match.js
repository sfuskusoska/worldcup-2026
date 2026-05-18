// ===== 日本戦応援画面（jpn-match.html）のロジック =====
import { db } from "./firebase-config.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const PASSPHRASE_HASH = "f7e1c0c43b73e7e0c1b2d8f4a8e5b3c1d4a2b6f8e7d5c3b1a9f2e4d6c8b0a3e5";
// 上記は仮の値。実際のハッシュは下記コードで生成して置き換えてください：
// (await sha256("samurai2026")).toLowerCase()

// ----- 起動 -----
window.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  checkExistingSession();
});

// ----- 既存セッションの確認 -----
function checkExistingSession() {
  const nickname = localStorage.getItem("wc2026:nickname");
  const userId = localStorage.getItem("wc2026:userId");
  if (nickname && userId) {
    showPreMatchScreen();
  }
}

// ----- ログインフォーム -----
function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nickname = document.getElementById("nickname-input").value.trim();
    const passphrase = document.getElementById("passphrase-input").value;
    const errorEl = document.getElementById("login-error");
    errorEl.hidden = true;

    if (!nickname || !passphrase) {
      showError("ニックネームと合言葉を入力してください");
      return;
    }

    // 合言葉のハッシュ照合
    const hash = await sha256(passphrase);
    const expected = await sha256("samurai2026"); // 固定の合言葉
    if (hash !== expected) {
      showError("合言葉が違います");
      return;
    }

    // userId を生成して保存
    const userId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    localStorage.setItem("wc2026:nickname", nickname);
    localStorage.setItem("wc2026:userId", userId);

    showPreMatchScreen();
  });
}

function showError(msg) {
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

// ----- 画面遷移 -----
function showPreMatchScreen() {
  document.getElementById("login-screen").hidden = true;
  document.getElementById("pre-match-screen").hidden = false;
}

// ----- SHA-256 ハッシュ -----
async function sha256(text) {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ===== Week 2 で追加実装する関数（プレースホルダー） =====
// - スコア予想の送信
// - 予想集計の取得とグラフ表示
// - キックオフ前の予想ロック

// ===== Week 3 で追加実装する関数（プレースホルダー） =====
// - 感情ボタン（ナイスプレー / もっとがんばれ）
// - 盛り上がりラインチャート
// - スコア自動取得（football-data.org）+ 手動上書き
// - 試合終了後のランキング計算
