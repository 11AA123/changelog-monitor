[README.md](https://github.com/user-attachments/files/29581779/README.md)
# 📡 changelog-monitor

**6大SaaSの最新情報を、毎朝Slackに届ける自動監視ボット**

[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-automated-2088FF?logo=github-actions&logoColor=white)](https://github.com/11AA123/changelog-monitor/actions)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

> **Stripe がまた何か変えた。OpenAI がエンドポイントを廃止した。AWS が新サービスを出した。**
> 全部自分で追うのは、もう終わりにしよう。

| | |
|---|---|
| **監視対象** | 🔵 Stripe · 🔶 Firebase · ⚫ OpenAI · ◼️ Vercel · 🟢 Supabase · 🟠 AWS |
| **実行環境** | GitHub Actions（完全無料） |
| **AI要約** | Gemini 2.5 Flash（日本語3行） |
| **通知先** | Slack Block Kit（構造化カード） |
| **セットアップ** | **約3分** |

---

## スクリーンショット

```
$ npm start

[Stripe]   New update detected — 2026-06-24.dahlia
[Firebase] New update detected — firebase@12.15.0
[OpenAI]   New update detected — 2026-06-09
[Vercel]   New update detected — 2026-06-26:query-web-analytics
[Supabase] New update detected — 47197
[AWS]      New update detected — 2026-06-25
All 6 notifications sent.
```

Slack にはこのような構造化通知が届きます：

```
┌─────────────────────────────────────────┐
│ 🔵 SaaS変更検知 — Stripe                │
├──────────────────┬──────────────────────┤
│ バージョン/ID    │ 2026-06-24.dahlia    │
│ 日付             │ 2026-06-24           │
│ 変更件数         │ 12件                 │
│ 危険度           │ ⚠️ Breaking あり     │
├─────────────────────────────────────────┤
│ AI 3行要約                              │
│ 1. Charge API に非同期キャプチャ追加     │
│ 2. 【Breaking】v1 /charges 廃止予定     │
│ 3. TypeScript 型定義が厳密化            │
├─────────────────────────────────────────┤
│ [Changelog を開く 🔗]                   │
└─────────────────────────────────────────┘
```

---

## 3分セットアップ

### 前提条件

- GitHubアカウント
- Slackワークスペース（Incoming Webhook を作れる権限）
- [Google AI Studio](https://aistudio.google.com) の Gemini API キー（無料）

---

### Step 1 — リポジトリをフォーク

右上の **Fork** ボタンをクリックして、自分のアカウントにコピーします。

```
https://github.com/11AA123/changelog-monitor
```

---

### Step 2 — Slack Incoming Webhook を取得

1. [Slack API](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. **Incoming Webhooks** → 有効化 → **Add New Webhook to Workspace**
3. 通知を送りたいチャンネルを選択
4. 発行された URL をコピー（`https://hooks.slack.com/services/T.../B.../...`）

---

### Step 3 — GitHub Secrets を登録

フォークしたリポジトリの **Settings → Secrets and variables → Actions → New repository secret** に2つ追加：

| Secret 名 | 値 |
|---|---|
| `SLACK_WEBHOOK_URL` | Step 2 でコピーした Webhook URL |
| `GEMINI_API_KEY` | Google AI Studio で取得した API キー |

---

### Step 4 — 完了

毎日 **09:00 (JST)** に自動で実行されます。手動で今すぐ試したい場合：

**Actions** タブ → **Changelog Monitor** → **Run workflow**

---

## ローカルで動かす

```bash
git clone https://github.com/11AA123/changelog-monitor
cd changelog-monitor
npm install
```

`.env` ファイルを作成：

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
GEMINI_API_KEY=your_gemini_api_key_here
```

実行：

```bash
npm start
```

---

## 仕組み

```
GitHub Actions (毎日 UTC 00:00)
        │
        ▼
  6ソースを並列取得
  ┌──────────┬──────────┬──────────┐
  │ Stripe   │ Firebase │ OpenAI   │  ... など
  │ Markdown │ Atom XML │ HTML     │
  └──────────┴──────────┴──────────┘
        │
        ▼ 前回との差分チェック (last_seen.json)
        │ 変更なし → スキップ
        │ 変更あり ↓
        ▼
  Gemini 2.5 Flash で日本語3行要約
        │
        ▼
  Slack Block Kit で通知
        │
        ▼
  last_seen.json をリポジトリにコミット
  （次回実行時の重複チェック用）
```

### ソース別の取得方式

| SaaS | 取得元 | 方式 |
|---|---|---|
| 🔵 Stripe | `docs.stripe.com/changelog` | Markdown パース |
| 🔶 Firebase | `github.com/firebase/firebase-js-sdk/releases.atom` | Atom XML |
| ⚫ OpenAI | `platform.openai.com/docs/changelog` | HTML スクレイピング |
| ◼️ Vercel | `vercel.com/changelog` | HTML スクレイピング |
| 🟢 Supabase | `supabase.com/changelog` | HTML スクレイピング |
| 🟠 AWS | `aws.amazon.com/new/feed/` | RSS XML |

---

## プロジェクト構成

```
changelog-monitor/
├── src/
│   ├── index.ts          # エントリーポイント・並列実行
│   ├── types.ts          # 共通型定義
│   ├── state.ts          # last_seen.json の読み書き
│   ├── ai.ts             # Gemini API 呼び出し
│   ├── slack.ts          # Slack Block Kit 通知
│   └── scrapers/
│       ├── stripe.ts
│       ├── firebase.ts
│       ├── openai.ts
│       ├── vercel.ts
│       ├── supabase.ts
│       └── aws.ts
├── .github/
│   └── workflows/
│       └── monitor.yml   # GitHub Actions 定義
├── last_seen.json        # 既読状態（自動コミット）
├── index.html            # ランディングページ
└── package.json
```

---

## 監視ソースを追加する

`src/scrapers/` に新しいファイルを追加するだけです。

```typescript
// src/scrapers/myservice.ts
import type { ChangelogEntry } from "../types.js";

export async function fetchMyService(): Promise<ChangelogEntry> {
  // ... スクレイピング or RSS 取得
  return { id, date, title, changes, hasBreaking, url };
}
```

`src/index.ts` の `SOURCES` 配列に追加：

```typescript
{ id: "myservice", name: "MyService", emoji: "🟣", fetch: fetchMyService },
```

以上。GitHub Actions は次回から自動でそのソースも監視します。

---

## よくある質問

**Q: Gemini API キーは有料ですか？**
無料枠（20リクエスト/日）で動きます。6ソースが毎日更新されても1日6リクエストなので余裕があります。

**Q: GitHub Actions の料金は？**
パブリックリポジトリは完全無料。プライベートでも月2,000分の無料枠があり、このツールは1回あたり約1分なので問題ありません。

**Q: 通知が来ない場合は？**
Actions タブでログを確認してください。Secrets の設定ミスが原因のほとんどです。

**Q: 同じ更新が何度も通知される？**
`last_seen.json` が正しくコミットされているか確認してください。Actions の `permissions: contents: write` が必要です（デフォルトで設定済み）。

---

## ライセンス

MIT — 自由に fork・改変・商用利用できます。

---

<div align="center">

**毎朝のSlack通知が、あなたの代わりに Changelog を読む。**

[⭐ Star this repo](https://github.com/11AA123/changelog-monitor) · [🐛 Issue を報告](https://github.com/11AA123/changelog-monitor/issues)

</div>
