# dentia — 歯科専用AIカルテ下書き生成

診療を**録音するだけ**で、自動で文字起こしし、歯科向けの **SOAP形式カルテ下書き**（S: 主訴・問診 / O: 口腔内所見 / A: 評価・診断 / P: 治療計画）を生成します。

## AIの2段構成

| 段 | 役割 | 使用AI | エンドポイント |
| --- | --- | --- | --- |
| AI① | 文字起こし（音声 → テキスト） | OpenAI Whisper（`whisper-1`） | `POST /api/transcribe` |
| AI② | SOAP生成（テキスト → 歯科SOAP） | Anthropic Claude（`claude-sonnet-4-6`） | `POST /api/generate` |

処理の流れ：**録音 →【AI① Whisper】→ 文字起こし →【AI② Claude】→ 歯科SOAP表示**

- フロントエンド: `index.html`（React + CSS、単一ファイル）。ブラウザのマイク（MediaRecorder）で録音
- バックエンド: Node.js + Express（`server.js`）。静的配信・文字起こし・SOAP生成
- テンプレート（処置別）: 初診 / 再診 / メンテナンス(SPT) / 補綴 / 根管治療 — 録音・手入力どちらでも適用されます

> ⚠️ 生成物は「下書き」です。A（評価・診断）は断定を避け、最終確認は歯科医師が行う前提の表現にしています。内容を必ず確認・加筆のうえご利用ください。
> 🔒 録音した音声はサーバーのメモリ上でのみ扱い、文字起こし後に破棄します。ディスクへの永続保存は行いません（医療データのため）。

---

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. APIキーの設定（`.env`）

`.env.example` をコピーして `.env` を作成し、**2つのキー**を設定します。

```bash
cp .env.example .env
```

```dotenv
# .env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx   # SOAP生成（必須）  https://console.anthropic.com/
OPENAI_API_KEY=sk-xxxxxxxx          # 文字起こし（必須） https://platform.openai.com/api-keys
# ANTHROPIC_MODEL=claude-sonnet-4-6  # 任意
# OPENAI_TRANSCRIBE_MODEL=whisper-1  # 任意
# PORT=3000                          # 任意（既定 3000）
```

> 🔒 APIキーはコードに直書きせず、必ず `.env` で管理します。`.env` は `.gitignore` でコミット対象外です。
> 手入力（テキスト貼り付け）だけ使う場合は `ANTHROPIC_API_KEY` のみでも動きます。録音を使うには `OPENAI_API_KEY` も必要です。

### 3. 起動

```bash
npm start          # → http://localhost:3000
npm run dev        # 開発用（変更を自動反映, Node 18+）
```

> 🎤 マイク録音はブラウザのセキュリティ上、**`localhost` か HTTPS** でのみ動作します。Render（HTTPS）や `http://localhost:3000` ではOK、それ以外のHTTP環境ではマイクがブロックされます。

---

## 使い方

1. **「録音して入力」タブ**（既定）でマイクボタンをタップ → 録音開始（経過時間・波形が表示）
2. もう一度タップで停止 → **自動で「文字起こし中…」→「SOAP生成中…」** と進みます
3. 文字起こし結果は「手入力」欄に入るので、聞き取りミスがあれば**修正して再生成**できます
4. 右カラムに S / O / A / P が表示され、「コピー」で全文コピー
5. マイクが使えない／テストしたい場合は、**「手入力」タブ**に会話テキストを貼り付けて生成できます（フォールバック）

テンプレート（初診 / 再診 / SPT / 補綴 / 根管治療）は録音・手入力どちらでも反映されます。

---

## ウェブに公開する（Render）

バックエンドが動くホスティングが必要です。`render.yaml` を同梱しているので [Render](https://render.com/) で公開できます。

1. Render にログイン（GitHub 連携）
2. **New ＋ → Blueprint** で この `dentia` リポジトリを選択（`render.yaml` を自動読み込み）
3. 環境変数 **`ANTHROPIC_API_KEY`** と **`OPENAI_API_KEY`** の入力を求められるので、両方を設定（リポジトリには保存されません）
4. 発行された公開URL（例: `https://dentia-xxxx.onrender.com`）にアクセス

> **既存環境に追記する場合**：Render ダッシュボード → 対象サービス → **Environment** → `OPENAI_API_KEY` を追加 → 保存すると自動で再デプロイされます。
> 無料プランはアクセスが無いとスリープし、初回アクセスが数十秒かかることがあります。

---

## 構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | フロント（録音UI・文字起こし配線・生成結果表示） |
| `server.js` | Express（静的配信 + `/api/transcribe` + `/api/generate`） |
| `render.yaml` | Render デプロイ設定（Blueprint） |
| `.env.example` | 環境変数テンプレート |

### API

- `POST /api/transcribe` … `multipart/form-data` の `audio`（音声ファイル）→ `{ "text": "文字起こし" }`
- `POST /api/generate` … `{ "conversation", "memo"(任意), "template" }` → `{ "S", "O", "A", "P" }`
- `GET /api/health` … `{ ok, model, transcribeModel, hasAnthropicKey, hasOpenAIKey }`

## 既知の制約

- **歯科用語の誤変換**：Whisper は専門用語（歯式・処置名など）を取り違えることがあります。文字起こし結果を確認・修正してから生成する運用を推奨。今後の精度改善対象（用語ヒント強化・歯科特化モデル等）。
- 録音は HTTPS / localhost 必須（ブラウザ仕様）。
- ブラウザにより録音形式が異なります（Chrome=webm / Safari=mp4 等）。いずれも Whisper 側で対応。
- 無料Renderはスリープからの初回起動が遅いことがあります。
