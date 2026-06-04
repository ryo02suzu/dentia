# dentia — 歯科専用AIカルテ下書き生成

歯科診療の会話テキストを貼り付けると、Anthropic Claude API が歯科向けの **SOAP形式カルテ下書き**（S: 主訴・問診 / O: 口腔内所見 / A: 評価・診断 / P: 治療計画）を生成します。

- フロントエンド: 既存の `index.html`（React + CSS、単一ファイル）
- バックエンド: Node.js + Express（`server.js`）が静的フロントの配信と Claude API 呼び出しを担当
- モデル: `claude-sonnet-4-20250514`
- テンプレート（処置別）: 初診 / 再診 / メンテナンス(SPT) / 補綴 / 根管治療 — 選択に応じて生成プロンプトを切り替えます

> ⚠️ 生成される A（評価・診断）は、最終的に歯科医師が確定する前提の「下書き」です。内容を必ず確認・加筆のうえご利用ください。

---

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. APIキーの設定（`.env`）

`.env.example` をコピーして `.env` を作成し、Anthropic の APIキーを設定します。

```bash
cp .env.example .env
```

作成した `.env` を開き、`ANTHROPIC_API_KEY` に [Anthropic Console](https://console.anthropic.com/) で取得したキーを設定してください。

```dotenv
# .env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# PORT=3000   # 任意（既定は 3000）
```

> 🔒 APIキーはコードに直書きせず、必ず `.env` で管理します。`.env` は `.gitignore` でコミット対象外にしています。

### 3. 起動

```bash
npm start
```

起動後、ブラウザで以下にアクセスします。

```
http://localhost:3000
```

開発中にファイル変更を自動反映したい場合は次のコマンドが使えます（Node.js 18+）。

```bash
npm run dev
```

---

## 使い方

1. 左カラムの「会話を貼り付け」に診療の会話を入力します（必要に応じて「補足メモ」に既往歴・アレルギー等を記載）。
2. テンプレート（初診 / 再診 / SPT / 補綴 / 根管治療）を選びます。
3. 「SOAPを生成」ボタンを押すと、生成中はローディングが表示され、完了すると右カラムに S / O / A / P が表示されます。
4. 「コピー」で全文をクリップボードにコピーできます。

> 🎤「録音して入力」タブは UI のみで、録音・文字起こし機能は**準備中**です。現在は「会話を貼り付け」をご利用ください。

---

## ウェブに公開する（Render）

バックエンド（`server.js`）が動くホスティングが必要です。リポジトリに `render.yaml` を同梱しているので、[Render](https://render.com/) で簡単に公開できます。

1. Render にログイン（GitHub 連携）
2. **New ＋ → Blueprint** を選び、この `dentia` リポジトリを選択（`render.yaml` を自動で読み込みます）
3. デプロイ時に環境変数 **`ANTHROPIC_API_KEY`** の入力を求められるので、Anthropic のキーを設定（リポジトリには保存されません）
4. 発行された公開URL（例: `https://dentia.onrender.com`）にアクセス

> Blueprint を使わず手動で作る場合は、Web Service を作成し、Build Command に `npm install`、Start Command に `npm start`、環境変数に `ANTHROPIC_API_KEY` を設定すればOKです。
> 無料プランはアクセスが無いとスリープし、初回アクセスが数十秒かかることがあります。

## 構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | フロントエンド（UI・生成結果表示） |
| `server.js` | Express サーバー（静的配信 + `POST /api/generate`） |
| `.env.example` | 環境変数のテンプレート（APIキー設定場所） |
| `package.json` | 依存パッケージと起動スクリプト |

### API

- `POST /api/generate`
  - リクエスト: `{ "conversation": "会話テキスト", "memo": "補足メモ(任意)", "template": "first|recall|spt|pros|endo" }`
  - レスポンス: `{ "S": "...", "O": "...", "A": "...", "P": "..." }`
- `GET /api/health`
  - 稼働確認用。`{ "ok": true, "model": "...", "hasKey": true/false }`
