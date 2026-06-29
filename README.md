# dentia — 歯科専用AIカルテ下書き生成

診療を**録音するだけ**で、自動で文字起こしし、歯科向けの **SOAP形式カルテ下書き**（S: 主訴・問診 / O: 口腔内所見 / A: 評価・診断 / P: 治療計画）を生成します。

## AIの2段構成

| 段 | 役割 | 使用AI | エンドポイント |
| --- | --- | --- | --- |
| AI① | 文字起こし（音声 → テキスト） | STT Adapter（既定 OpenAI Whisper `whisper-1`／国産API・自前STTへ切替可）＋ 歯科用語の後処理補正 | `POST /api/transcribe` |
| AI② | SOAP生成（テキスト → 歯科SOAP） | Anthropic Claude（`claude-sonnet-4-6`） | `POST /api/generate` |

処理の流れ：**録音 →【AI① STT＋後処理補正】→ 文字起こし →【AI② Claude】→ 歯科SOAP表示**

> 🎙️ 文字起こしは**差し替え可能な STT Adapter**（`stt/`）経由です。環境変数 `STT_PROVIDER` で `openai`（既定）／`amivoice`（国産API）／`selfhost`（自前 faster-whisper 等）を切り替えられ、どのエンジンでも歯科用語の**後処理補正辞書**（`stt/dictionary.js`）が効きます。外部API依存からの脱却（国内処理・データ主権）に向けた設計・移行計画は [`docs/stt-migration-plan.md`](./docs/stt-migration-plan.md) を参照。

- フロントエンド: `index.html`（React + CSS、単一ファイル）。ブラウザのマイク（MediaRecorder）で録音
- バックエンド: Node.js + Express（`server.js`）。静的配信・文字起こし・SOAP生成
- 認証・保存: **Supabase**（メール+パスワード認証 / カルテ保存 / Row Level Security）
- テンプレート（処置別）: 初診 / 再診 / メンテナンス(SPT) / 補綴 / 根管治療 — 録音・手入力どちらでも適用されます

**ログインすると**、生成したカルテがアカウントに保存され、別端末でも同じアカウントでログインして閲覧できます（スマホで録音・生成 → PCで閲覧、等）。

> ⚠️ 生成物は「下書き」です。A（評価・診断）は断定を避け、最終確認は歯科医師が行う前提の表現にしています。内容を必ず確認・加筆のうえご利用ください。
> 🔒 録音した音声はサーバーのメモリ上でのみ扱い、文字起こし後に破棄します。ディスクへの永続保存は行いません（医療データのため）。
> 🔒 保存されるカルテ（文字起こし・SOAP）は患者の機微情報です。Supabase の RLS により**本人のアカウントの行だけ**read/write できるようにしています。

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
SUPABASE_URL=https://xxxx.supabase.co   # ログイン・保存（任意）
SUPABASE_ANON_KEY=eyJ...                # ログイン・保存（任意）
# ANTHROPIC_MODEL=claude-sonnet-4-6  # 任意
# OPENAI_TRANSCRIBE_MODEL=whisper-1  # 任意
# PORT=3000                          # 任意（既定 3000）
```

> 🔒 APIキー・鍵はコードに直書きせず、必ず `.env` で管理します。`.env` は `.gitignore` でコミット対象外です。
> `ANTHROPIC_API_KEY` のみでも手入力でのSOAP生成は動きます。録音には `OPENAI_API_KEY`、ログイン・保存には `SUPABASE_*` が必要です。
> **`SUPABASE_*` 未設定時はログイン無しの従来モード**で動作します（既存機能を壊さないための安全網。カルテ保存は無効）。

### 3. 起動

```bash
npm start          # → http://localhost:3000
npm run dev        # 開発用（変更を自動反映, Node 18+）
```

> 🎤 マイク録音はブラウザのセキュリティ上、**`localhost` か HTTPS** でのみ動作します。Render（HTTPS）や `http://localhost:3000` ではOK、それ以外のHTTP環境ではマイクがブロックされます。

### 4. Supabase（ログイン・カルテ保存）のセットアップ

> dentia 専用の**新しい Supabase プロジェクト**を使ってください（過去の別プロジェクトのキーは使わない）。

1. [Supabase](https://supabase.com/) で**新規プロジェクト**を作成
2. **SQL Editor** を開き、リポジトリ同梱の [`supabase/schema.sql`](./supabase/schema.sql) を貼り付けて実行
   → `records` テーブル作成＋**RLS（本人の行だけアクセス可）**が有効になります
   - 続けて [`supabase/usage.sql`](./supabase/usage.sql) も実行すると、**1日あたりの生成上限**（`DAILY_API_LIMIT`、既定200）が有効になります（任意・コスト暴走の防止）
   - さらに [`supabase/multitenant.sql`](./supabase/multitenant.sql) を実行すると、**医院（テナント）単位**でカルテを共有する基盤が有効になります（`clinics`/`clinic_members`、医院ベースRLS、ログイン時に個人医院を自動作成）。未実行でも「本人のみ」で動作（後方互換）
   - [`supabase/feedback.sql`](./supabase/feedback.sql) を実行すると、画面の「ご意見」ボタンからのフィードバックが `feedback` テーブルに保存されます（ベータ運用向け・任意）
3. **Authentication → Providers → Email** を有効化
   - 動作確認をすぐ行いたい場合は **「Confirm email」を一時的にOFF** にすると、サインアップ後すぐログインできます（本番では用途に応じて判断）
4. **Project Settings → API** から `Project URL` と `anon public` キーを取得し、`.env` の `SUPABASE_URL` / `SUPABASE_ANON_KEY` に設定

> anon キーはクライアント用途の公開鍵で、データ保護は RLS が担保します。`service_role` キーは本実装では使用しません。

---

## 使い方

1. **ログイン**：初回は「新規登録」でメール＋パスワード登録 →（メール確認ONなら承認後）ログイン。ログイン状態はリロードしても保持されます
2. **「録音して入力」タブ**（既定）でマイクボタンをタップ → 録音開始（経過時間・波形が表示）
3. もう一度タップで停止 → **自動で「文字起こし中…」→「SOAP生成中…」** と進みます
4. 文字起こし結果は「手入力」欄に入るので、聞き取りミスがあれば**修正して再生成**できます
5. 右カラムに S / O / A / P が表示され、ログイン中は**自動でアカウントに保存**されます（「コピー」で全文コピーも可）
6. 右上の **「保存カルテ」** から過去のカルテ一覧 → 詳細を閲覧・削除できます
7. マイクが使えない／テストしたい場合は、**「手入力」タブ**に会話テキストを貼り付けて生成できます（フォールバック）

テンプレート（初診 / 再診 / SPT / 補綴 / 根管治療）は録音・手入力どちらでも反映されます。
**別端末**でも同じアカウントでログインすれば、保存済みのカルテにアクセスできます。

---

## ウェブに公開する（Render）

バックエンドが動くホスティングが必要です。`render.yaml` を同梱しているので [Render](https://render.com/) で公開できます。

1. Render にログイン（GitHub 連携）
2. **New ＋ → Blueprint** で この `dentia` リポジトリを選択（`render.yaml` を自動読み込み）
3. 環境変数 **`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `SUPABASE_URL` / `SUPABASE_ANON_KEY`** の入力を求められるので設定（リポジトリには保存されません）
4. 発行された公開URL（例: `https://dentia-xxxx.onrender.com`）にアクセス

> **既存環境に追記する場合**：Render ダッシュボード → 対象サービス → **Environment** → `SUPABASE_URL` と `SUPABASE_ANON_KEY` を追加 → 保存すると自動で再デプロイされます。
> （`SUPABASE_*` を設定するとログインが必須になります。設定しなければ従来どおりログイン無しで動きます。）
> 無料プランはアクセスが無いとスリープし、初回アクセスが数十秒かかることがあります。

---

## 構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | フロント（ログイン画面・録音UI・生成結果・保存カルテ一覧） |
| `server.js` | Express（静的配信 + `/api/transcribe` + `/api/generate` + `/api/config`） |
| `stt/` | 文字起こしの STT Adapter（プロバイダ切替・後処理補正・音声変換）。詳細は下表 |
| `eval/` | STT精度の評価ハーネス（WER/CER・歯科用語誤り率・歯番/左右取り違え）。`npm run eval -- <dataset.jsonl>` |
| `infra/faster-whisper/` | 自前STT（フェーズ3）の参照サーバ（FastAPI + faster-whisper + Dockerfile） |
| `test/run.js` | 依存ゼロのユニットテスト（`npm test`） |
| `supabase/schema.sql` | Supabase の `records` テーブル + RLS ポリシー |
| `supabase/usage.sql` | 日次利用上限のカウンタ + RPC（任意） |
| `supabase/multitenant.sql` | 医院テナント（clinics/members）+ 医院ベースRLS（任意） |
| `supabase/feedback.sql` | フィードバック収集テーブル + RLS（任意） |
| `render.yaml` | Render デプロイ設定（Blueprint） |
| `.env.example` | 環境変数テンプレート |

認証・DB操作はフロントから `@supabase/supabase-js`（CDN）で直接行い、**RLS** がデータ分離を担保します。サーバーは Supabase の鍵を `/api/config` でフロントへ渡すのみ（既存の生成処理は無変更）。

### STT Adapter（`stt/`）

文字起こしエンジンを差し替え可能にした層。`/api/transcribe` の入出力（音声 → `{text}`）は従来互換のまま、内部エンジンだけを環境変数で切り替えられます。

| ファイル | 役割 |
| --- | --- |
| `stt/index.js` | エンジン抽象層。`STT_PROVIDER` で主エンジン、`STT_FALLBACK` で予備を順に試行（障害時フォールバック） |
| `stt/postprocess.js` / `stt/dictionary.js` | 歯科用語の後処理補正（決定的な辞書置換。`STT_POSTPROCESS_LLM=on` でClaude正規化を追加） |
| `stt/audio.js` | webm/mp4 → 16kHz mono wav へメモリ変換（ffmpeg。不在時は pass-through） |
| `stt/providers/openai.js` | 現行 Whisper API（既定） |
| `stt/providers/amivoice.js` | 国産STT API（フェーズ1。`AMIVOICE_API_KEY` 等が必要） |
| `stt/providers/selfhost.js` | 自前STT（フェーズ3。`SELFHOST_STT_URL` が必要） |
| `stt/llmNormalize.js` | LLM正規化（フェーズ2。表記正規化のみ・フェイルオープン） |

```bash
# エンジン切替の例（.env）
STT_PROVIDER=openai            # 既定（現行と完全に同じ挙動）
# STT_PROVIDER=amivoice        # 国産API（越境停止）。AMIVOICE_API_KEY 等を設定
# STT_PROVIDER=selfhost        # 自前STT。SELFHOST_STT_URL を設定
# STT_FALLBACK=amivoice,openai # 主エンジン障害時に順に試行

npm test                                   # ユニットテスト
npm run eval -- eval/dataset/sample.jsonl  # STT精度の比較レポート
```

切替の判断基準（go/no-go）・コスト・コンプラを含む全体計画は [`docs/stt-migration-plan.md`](./docs/stt-migration-plan.md)。

### API

- `POST /api/transcribe` … `multipart/form-data` の `audio`（音声ファイル）→ `{ "text": "文字起こし" }`
- `POST /api/generate` … `{ "conversation", "memo"(任意), "template" }` → `{ "S", "O", "A", "P" }`
- `GET /api/config` … `{ supabaseUrl, supabaseAnonKey }`（フロントの認証初期化用。anonキーは公開鍵）
- `GET /api/health` … `{ ok, model, sttProvider, sttFallback, transcribeModel, hasAnthropicKey, hasOpenAIKey, authEnabled }`

## ドキュメント

| 資料 | 内容 |
| --- | --- |
| [`docs/stt-migration-plan.md`](./docs/stt-migration-plan.md) | 文字起こしの自前/国産STT化 移行プラン（比較・アーキ・評価・コスト・コンプラ・go/no-go） |
| [`docs/sales-deck.md`](./docs/sales-deck.md) | 営業／提案用スライド（**Marp形式** → スライド/PDFに変換可） |
| [`docs/user-manual.md`](./docs/user-manual.md) | 操作マニュアル（医師・スタッフ向け） |
| [`docs/commercial-readiness.md`](./docs/commercial-readiness.md) | 商用化レディネス チェックリスト／ロードマップ |
| [`eval/README.md`](./eval/README.md) | STT精度の評価ハーネスの使い方・テストセットの作り方 |

> `sales-deck.md` を PDF/PPTX にするには [marp.app](https://marp.app/) に貼り付けるか、`npx @marp-team/marp-cli docs/sales-deck.md --pdf` を実行します。

## セキュリティ TODO（今後の課題）

保存される診療データ（文字起こし・SOAP）は**患者の機微情報**です。現状は Supabase の認証＋RLS による行レベルのアクセス分離、および AI系API（`/api/transcribe`・`/api/generate`）の**サーバー側JWT検証＋レート制限**までを実装しています。実運用に向けては以下が今後の課題です：

- **保存データの暗号化**（保存時・通信経路の暗号化強化、フィールド単位の暗号化）
- **アクセス管理・監査ログ**（操作履歴、権限管理、医院単位の管理者ロール等）
- **医療情報システムの安全管理に関するガイドライン（いわゆる 3省2ガイドライン）準拠**の検討
- **1ユーザー/医院あたりのコスト上限**（日次・月次の生成回数/トークン上限）
- 音声・データの保持期間ポリシー、削除要求への対応

詳細な商用化ロードマップは [`docs/commercial-readiness.md`](./docs/commercial-readiness.md) を参照。

## 既知の制約

- **歯科用語の誤変換**：汎用STTは専門用語（歯式・処置名など）を取り違えることがあります。STT Adapter の**後処理補正辞書**（`stt/dictionary.js`）で代表的な誤変換（`イーピーティー→EPT`・`シャープ46→#46` 等）を救っていますが、なお誤りは残るため、文字起こし結果を確認・修正してから生成する運用を推奨。精度改善・国産/自前STTへの移行計画は [`docs/stt-migration-plan.md`](./docs/stt-migration-plan.md) を参照。
- 録音は HTTPS / localhost 必須（ブラウザ仕様）。
- ブラウザにより録音形式が異なります（Chrome=webm / Safari=mp4 等）。いずれも Whisper 側で対応。
- メール確認（Confirm email）がONの場合、サインアップ後にメール承認が必要です。
- 認証・DB処理はクライアント側で実行し、RLS で保護。AI系API はログイン必須（JWT検証）＋レート制限で保護しています（`SUPABASE_*` 未設定のローカル/デモ環境では従来どおり認証なしで動作）。
- 無料Renderはスリープからの初回起動が遅いことがあります。
