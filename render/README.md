# deck 用レンダリングハーネス

`deck/dentia-deck.pdf` の製品スクリーンショットは、**実際に動く dentia アプリ**を
ヘッドレス Chromium で操作して撮影したものです（モックではありません）。

この `render/` はそのための一式です。`vendor/`（CDNライブラリ）・`shots/`（撮影画像）・
`index.local.html`（生成物）は `.gitignore` 対象なので、再生成する場合は以下を実行します。

## 前提
- Node.js / Chromium（このリポジトリでは `/opt/pw-browsers/chromium-1223/...`）
- 日本語フォント（Noto Sans CJK JP、ブランドフォント Zen Kaku Gothic New / Outfit）

## 手順
1. CDN ライブラリを `render/vendor/` に取得（react, react-dom, @babel/standalone, @supabase/supabase-js, qrcode）。
2. ルートの `index.html` の CDN `<script>` をローカル `/vendor/*` に書き換えた `render/index.local.html` を生成。
3. `node render/server.render.js` … 上記アプリを配信し、`/api/*` を歯科サンプルSOAPでスタブ。
4. `node render/shoot.js` / `node render/shoot2.js` … 実画面を操作し `render/shots/*.png` を撮影。
5. 撮影画像を `deck/assets/` にコピー。
6. `node render/topdf.js` … `deck/deck.html` を 1280×720 の PDF（`deck/dentia-deck.pdf`）に出力。

## ファイル
- `server.render.js` … スタブ配信サーバ（Supabase 無し＝ログイン不要のデモモード）
- `shoot.js` / `shoot2.js` … Playwright 撮影スクリプト（PC / モバイル / 歯周精密 等）
- `topdf.js` … HTML スライド → PDF
