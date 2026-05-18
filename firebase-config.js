// ===== Firebase 設定 =====
// Day 2 で Firebase Console から取得した値に置き換えてください。
// 全項目を埋めないと動きません。

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCm7VFWh3now2jLpphkYlNFy7NgWBVOlRo",
  authDomain: "shooting-schedule-maker.firebaseapp.com",
  databaseURL: "https://shooting-schedule-maker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shooting-schedule-maker",
  storageBucket: "shooting-schedule-maker.firebasestorage.app",
  messagingSenderId: "36082667304",
  appId: "1:36082667304:web:17d6b085efabf1c86674a1d"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// ===== football-data.org API キー =====
// Day 3 で取得した X-Auth-Token をここに記入
export const FOOTBALL_DATA_API_KEY = "YOUR_FOOTBALL_DATA_API_KEY";

// ===== 試合定数 =====
export const NEXT_JAPAN_MATCH = {
  id: "2026-06-15-jpn-ned",
  kickoff: "2026-06-15T05:00:00+09:00",
  home: "日本",
  away: "オランダ",
  homeCode: "JPN",
  awayCode: "NED",
  venue: "AT&T Stadium",
  venueId: "att"
};
