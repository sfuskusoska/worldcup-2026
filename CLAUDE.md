# worldcup-2026 プロジェクト情報

このファイルは Claude Code がプロジェクトを理解するための情報源です。
作業開始時に必ず最初に読んでください。

## プロジェクト概要

ワールドカップ2026を、身内 5〜15人で楽しむためのダッシュボード型 Web アプリ。
ホーム画面はワールドカップ全体の状況を表示するダッシュボード。
その中に「日本戦応援機能」をカードとして配置し、別画面（jpn-match.html）で深い機能を提供する。

## フェーズ戦略

### Phase 1（5/18〜6/15 オランダ戦キックオフ）
- ダッシュボードの骨組み（日本戦カードのみ動作、他は "Coming soon"）
- 日本戦応援機能（予想・感情ボタン・ランキング）の完全実装

### Phase 2（6/16〜6/20 チュニジア戦の前）
- 会場マップ（全16会場）
- 全試合表（football-data.org からリアルタイム取得）
- 次のキックオフ・カウントダウン

### Phase 3（6/22〜大会終了）
- 盛り上がり可視化（Google Trends等、要検討）

## ディレクトリ構造

```
worldcup-2026/
├── index.html         ダッシュボード（ホーム）
├── jpn-match.html     日本戦応援画面
├── fixtures.html      全試合表（Phase 2で実装）
├── style.css          全画面共通スタイル
├── app.js             ダッシュボードのロジック
├── jpn-match.js       日本戦応援画面のロジック（Phase 1で実装）
├── firebase-config.js Firebase設定（要・自分の値に置き換え）
├── data/
│   ├── venues.json    16会場の静的データ
│   └── japan-squad.json 日本代表メンバー（予想用、Phase 1）
├── README.md
├── CLAUDE.md          このファイル
└── WEEK1_SETUP.md     Week 1のセットアップ手順
```

## 技術スタック

- フロントエンド: HTML + Vanilla JS（ES Modules）+ CSS
- フレームワークは使わない（Tokyo gourmet map と同じ方針）
- データベース: Firebase Realtime Database（Sparkプラン）
- スコアAPI: football-data.org（Freeプラン、10 req/分）
- ホスティング: GitHub Pages（`sfuskusoska.github.io/worldcup-2026/`）

## Firebase データ構造

```
/matches/{matchId}/
  meta:
    kickoff: ISO8601文字列
    home: "日本"
    away: "オランダ"
    homeCode: "JPN"
    awayCode: "NED"
    venue: "AT&T Stadium"
    status: "pre" | "live" | "finished"
  predictions/{userId}/
    scoreHome: number
    scoreAway: number
    firstScorer: string
    submittedAt: timestamp
  reactions/{timestamp}/
    userId: string
    type: "good" | "fight"
  liveScore/
    home: number
    away: number
    minute: number
    updatedAt: timestamp
    source: "api" | "manual"
  hostHeartbeat/
    lastSeen: timestamp
```

matchId の命名規則: `YYYY-MM-DD-{home}-{away}` 例: `2026-06-15-jpn-ned`

## 認証

ニックネーム + 合言葉（固定: `samurai2026`）。
合言葉は SHA-256 で照合。Firebase Auth は使わない。
ニックネームと userId（タイムスタンプ + ランダム）を LocalStorage に保存。

## 開発ルール（厳守）

### コード品質
- すべての書き込みは即座に Firebase へ反映（途中経過保存）
- ネットワーク切断時はリトライ（指数バックオフ）
- 並列処理可能な箇所は async/await で並列化
- 関数1つあたり50行以内を目安
- コメントは「なぜそうしたか」を書く（「何をしているか」はコードを読めば分かる）

### 表記ルール
- 「笑」は使わない
- 操作手順は省略しない
- 日本語UI、変数名は英語

### Firebaseセキュリティ
- 身内15人運用前提なので、ルールは緩い設定（誰でも読み書き可）
- 本格運用に切り替える際は要再設計

## API キー管理

GitHub Pages は public リポジトリ前提のため、Firebase の apiKey は公開されます。
これは Firebase の仕様上 OK ですが、セキュリティルールでアクセス制御する必要があります。
football-data.org の API キーも公開されますが、無料枠の制限を超えると停止するだけなので
リスクは限定的。

## デプロイ

```bash
git add .
git commit -m "..."
git push origin main
```

数分後に `https://sfuskusoska.github.io/worldcup-2026/` に反映される。

## トラブルシューティング

### Firebase に書き込めない
1. firebase-config.js の値が正しいか確認
2. Realtime Database のセキュリティルールを確認
3. ブラウザの DevTools で具体的なエラーを確認

### football-data.org の API が動かない
1. API キーが正しいか確認
2. レート制限（10 req/分）を超えていないか確認
3. curl で直接叩いて動作確認

### GitHub Pages が更新されない
1. Settings → Pages でブランチが main / root になっているか
2. Actions タブでデプロイが成功しているか確認
3. ブラウザのキャッシュをクリア（Ctrl+Shift+R）
