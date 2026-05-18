# Week 1 セットアップ手順書（5/18(月)〜5/24(日)）

このドキュメントは Week 1 の全タスクを操作画面レベルで解説します。

## 完成判定

Week 1 終了時、以下がすべて満たされていること。

- [ ] GitHub に `worldcup-2026` リポジトリが存在する
- [ ] `https://sfuskusoska.github.io/worldcup-2026/` でダッシュボードが表示される
- [ ] Firebase Realtime Database が繋がる
- [ ] football-data.org の API キーが取得済み
- [ ] ニックネーム + 合言葉でログインできる（`jpn-match.html`）
- [ ] Firebase にテストデータが書き込める

---

## Day 1（5/18 月）: GitHub セットアップ

### 1-1. ローカルにファイルを配置

`D:\ドキュメント\worldcup-2026\` フォルダを作成し、このパッケージのファイル一式をコピーする。

### 1-2. GitHub リポジトリ作成

1. ブラウザで `https://github.com/sfuskusoska` を開く
2. 右上の「+」→「New repository」
3. 以下を入力：
   - **Repository name**: `worldcup-2026`
   - **Description**: 「ワールドカップ2026 仲間内向けダッシュボード」
   - **Public** を選択（GitHub Pages 無料利用のため）
   - 「Add a README file」のチェックは**外す**（ローカルから上げる）
4. 「Create repository」をクリック

### 1-3. ローカルから push

PowerShell を起動：

```powershell
cd D:\ドキュメント\worldcup-2026
git init
git add .
git commit -m "Initial commit: Week 1 skeleton"
git branch -M main
git remote add origin https://github.com/sfuskusoska/worldcup-2026.git
git push -u origin main
```

### 1-4. GitHub Pages 有効化

1. GitHub のリポジトリページで「Settings」タブをクリック
2. 左サイドバーの「Pages」
3. **Source**: `Deploy from a branch`
4. **Branch**: `main` / `/ (root)` を選択
5. 「Save」をクリック
6. 数分後、ページ上部に `Your site is live at https://sfuskusoska.github.io/worldcup-2026/` と表示される

この時点では Firebase 未設定なので、ダッシュボードは表示されるがログインは動かない。それで OK。

---

## Day 2（5/19 火）: Firebase セットアップ

### 2-1. Firebase プロジェクト作成

1. `https://console.firebase.google.com/` を開く（Google アカウントでログイン）
2. 「プロジェクトを追加」をクリック
3. **プロジェクト名**: `wc-japan-watch` と入力（半角ハイフンOK）
4. 「続行」 → Google アナリティクスは「無効」を選択
5. 「プロジェクトを作成」をクリック → 完了まで30秒ほど待つ

### 2-2. Realtime Database 有効化

1. 左メニュー「構築」→「Realtime Database」
2. 「データベースを作成」をクリック
3. **ロケーション**: `asia-southeast1` を選択（東京に最も近い）
4. **セキュリティルール**: 「ロックモードで開始」を選択
5. 「有効にする」をクリック

### 2-3. セキュリティルール設定

「ルール」タブをクリック → 内容を以下に書き換えて「公開」をクリック：

```json
{
  "rules": {
    "matches": {
      "$matchId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

注：身内15人運用前提の緩い設定です。

### 2-4. Web アプリ登録と設定取得

1. プロジェクトトップで「ウェブ」アイコン（`</>`）をクリック
2. **アプリのニックネーム**: `wc-japan-watch-web`
3. **Firebase Hosting**: チェックしない
4. 「アプリを登録」をクリック
5. 表示される `firebaseConfig` の内容をメモ帳に保存
6. ローカルの `firebase-config.js` の値を、メモした値に置き換える

例：
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXX",        // ← ここを実際の値に
  authDomain: "wc-japan-watch.firebaseapp.com",
  databaseURL: "https://wc-japan-watch-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wc-japan-watch",
  storageBucket: "wc-japan-watch.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

---

## Day 3（5/20 水）: football-data.org セットアップ

### 3-1. アカウント登録

1. `https://www.football-data.org/client/register` にアクセス
2. 名前・メール・パスワードを入力
3. **「Free」プラン**を選択して登録
4. 確認メールが届くのでリンクをクリックして認証

### 3-2. API キー取得

1. ログイン後、ダッシュボードの「Account」セクションを開く
2. **X-Auth-Token** という名前のキーをコピー
3. ローカルの `firebase-config.js` の `FOOTBALL_DATA_API_KEY` を取得した値に置き換える

### 3-3. 動作確認

PowerShell で（`YOUR_API_KEY` を実際のキーに置き換え）：

```powershell
curl -H "X-Auth-Token: YOUR_API_KEY" "https://api.football-data.org/v4/competitions/WC/matches"
```

JSON 形式でワールドカップ全試合のデータが返ってくれば成功。

---

## Day 4（5/21 木）: 確認と微調整

### 4-1. ローカルでサイト動作確認

```powershell
cd D:\ドキュメント\worldcup-2026
python -m http.server 8000
```

ブラウザで `http://localhost:8000` を開き：

- [ ] ダッシュボードが表示される
- [ ] カウントダウンが動いている（残り日数が秒単位で減る）
- [ ] 「みんなで応援する」リンクで `jpn-match.html` に遷移できる
- [ ] ログイン画面が表示される

### 4-2. 合言葉ハッシュの埋め込み（重要）

`jpn-match.js` の `PASSPHRASE_HASH` の値が仮の値になっているので、本物のハッシュを生成して埋め込む。

ブラウザの DevTools（F12）→ Console で以下を実行：

```javascript
async function sha256(text) {
  const buffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}
await sha256("samurai2026");
```

返ってきたハッシュ値を `jpn-match.js` の `PASSPHRASE_HASH` に貼り付けてください。

> 補足：実際は `jpn-match.js` の中で起動時にハッシュを動的に計算しているので、`PASSPHRASE_HASH` 定数は使われていません。これは将来 ハッシュ値を直書きしたくなったときのため。今は気にしなくて OK。

---

## Day 5（5/22 金）: ログイン動作確認

### 5-1. ログイン試験

ブラウザで `jpn-match.html` を開き：

1. ニックネームに「テスト」、合言葉に `samurai2026` を入力
2. 「参加する」をクリック
3. 試合前画面に遷移すれば成功
4. リロードしてもログイン状態が保たれることを確認

### 5-2. ログアウト試験

DevTools の Console で：

```javascript
localStorage.removeItem("wc2026:nickname");
localStorage.removeItem("wc2026:userId");
location.reload();
```

ログイン画面に戻れば OK。

---

## Day 6（5/23 土）: Firebase書き込みテストとデプロイ

### 6-1. Firebase 書き込みテスト

ブラウザで `http://localhost:8000` を開き、DevTools の Console で：

```javascript
const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js");
const { db } = await import("./firebase-config.js");
await set(ref(db, 'matches/2026-06-15-jpn-ned/meta'), {
  kickoff: "2026-06-15T05:00:00+09:00",
  home: "日本",
  away: "オランダ",
  homeCode: "JPN",
  awayCode: "NED",
  venue: "AT&T Stadium",
  venueId: "att",
  status: "pre"
});
console.log("書き込み成功");
```

Firebase Console の「Realtime Database」タブで、データが書き込まれていることを確認。

### 6-2. デプロイ

```powershell
git add .
git commit -m "Week 1: Firebase設定とログイン機能"
git push origin main
```

数分後、`https://sfuskusoska.github.io/worldcup-2026/` で同じものが動作することをスマホからも確認。

---

## Day 7（5/24 日）: バッファ日

積み残しを処理する日。具体例：

- スマホ表示の崩れがないか確認
- Firebase の権限エラーが出ていないかチェック
- Week 2 のタスクを下書き

---

## トラブルシューティング

### Firebase 書き込みエラー「Permission denied」

→ セキュリティルールが古い設定のまま。Day 2-3 を再実行。

### ログイン後にすぐログアウトされる

→ LocalStorage が無効化されている可能性。シークレットウィンドウや、ブラウザの設定でブロックされていないか確認。

### GitHub Pages にアクセスすると404

→ デプロイから5〜10分待つ。それでも404なら Settings → Pages の設定を再確認。

### CORS エラー

→ `python -m http.server` を起動せず `file:///` で開いている可能性。必ず HTTP サーバー経由でアクセス。

---

## Week 2 プレビュー（5/25〜5/31）

- 試合前：スコア予想入力 + 最初の得点者選択
- 予想送信後の集計グラフ（円グラフ・Chart.js）
- キックオフ5分前で予想ロック
- ダッシュボードの日本戦カードに「予想済み」「未予想」ステータス表示

Week 1 完了時に、Week 2 のタスクリストをまた整理してお出しします。
