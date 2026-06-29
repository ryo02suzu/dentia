# dentia 自前STT 参照サーバ（faster-whisper）

dentia のフェーズ3「自前STT」用の最小サーバです。音声を受けて日本語で文字起こしし
`{text}` を返します。**音声・文字起こし本文を外部に出さず、ログにも残しません**
（設計書 `docs/stt-migration-plan.md` §6, §7）。

dentia 側は `STT_PROVIDER=selfhost` とし、`SELFHOST_STT_URL` をこのサーバの
`/transcribe` に向けるだけで接続できます（`stt/providers/selfhost.js`）。

## エンドポイント

- `POST /transcribe` — multipart field `audio`（wav/webm/mp4 可）。応答 `{ "text": "..." }`
- `GET /health` — `{ status, model, device, compute_type }`（本文は含めない）

## 環境変数

| 変数 | 既定 | 説明 |
|---|---|---|
| `WHISPER_MODEL` | `large-v3` | モデル名。軽量化は `kotoba-tech/kotoba-whisper-v2.0-faster` 等も可 |
| `COMPUTE_TYPE` | `int8` | 量子化。GPUなら `int8_float16` / `float16` |
| `DEVICE` | `cuda` | `cuda`。CUDA不在時は自動で `cpu` にフォールバック |
| `BEAM_SIZE` | `5` | ビームサイズ |
| `SELFHOST_STT_TOKEN` | （無） | 設定時は `Authorization: Bearer` の一致を要求（dentia 側と共有） |
| `HOST` / `PORT` | `0.0.0.0` / `8000` | バインド先 |

## ローカル起動（CPUでも可）

```bash
cd infra/faster-whisper
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
# CPU で試すなら DEVICE=cpu。初回はモデルDLで時間がかかる。
DEVICE=cpu COMPUTE_TYPE=int8 WHISPER_MODEL=large-v3 uvicorn server:app --port 8000
```

動作確認:

```bash
curl -s http://localhost:8000/health
curl -s -F "audio=@sample.wav" http://localhost:8000/transcribe
```

## Docker 起動

```bash
cd infra/faster-whisper
docker build -t dentia-stt .

# CPU で起動（精度/速度は GPU 推奨。試験用）
docker run --rm -p 8000:8000 -e DEVICE=cpu -e COMPUTE_TYPE=int8 dentia-stt

# GPU で起動（Dockerfile を nvidia/cuda ベースへ切替えた前提。§6.2）
docker run --rm --gpus all -p 8000:8000 \
  -e DEVICE=cuda -e COMPUTE_TYPE=int8_float16 dentia-stt
```

`Dockerfile` の既定ベースは `python:3.11-slim`（CPU可）。本番GPUでは冒頭コメントの
`nvidia/cuda:*-cudnn-runtime` ベースへ切替えてください。

## GPU / サーバーレスGPU での運用（設計書 §6.2, §6.3）

- dentia は「録音停止後に1回・数秒〜十数秒許容」なので **常時GPUは不要**。
  使った分だけ課金される **サーバーレスGPU（秒課金）が小規模チームの本命**です。
- このアプリはステートレス（起動時にモデルをロードして使い回す）なので、
  サーバーレスGPU基盤のコンテナとしてそのまま載せられます。

### コールドスタート対策

- **モデルをイメージに焼き込む**：`Dockerfile` のプリフェッチ行（コメント）を有効化すると、
  初回DL待ちが消える代わりにイメージが肥大化します。
- **ウォーム1台を保持**：低稼働でもレイテンシを抑えたい場合は最小1インスタンスを常駐。
- **量子化で軽量化**：`COMPUTE_TYPE=int8`（CPU）/ `int8_float16`（GPU）でVRAM・ロード時間を圧縮。

## dentia 側の設定

```
# .env（dentia ルート）
STT_PROVIDER=selfhost
SELFHOST_STT_URL=http://<gpu-host>:8000/transcribe
SELFHOST_STT_TOKEN=        # 任意（このサーバの SELFHOST_STT_TOKEN と一致させる）
SELFHOST_TIMEOUT_MS=120000 # 任意（既定 120000、超過で 504）
```

dentia 側 (`stt/providers/selfhost.js`) は ffmpeg があれば送信前に 16kHz mono wav へ
変換します。フォールバック（`STT_FALLBACK`）に国産API等を並べておくと、自前STT障害時に
切り替わります（設計書 §8.3）。

## 概算コストの考え方（設計書 §6.2）

- faster-whisper large-v3 INT8 で GPU 実処理は **実時間の 0.1〜0.3 倍程度**。
  サーバーレスGPU単価 × その秒数が1リクエストのコストになります。
- 目安として **1時間音声あたり数十円オーダー**を狙えますが、GPU種別・モデル・単価で
  大きく変動します。**必ず実測と最新料金で確定**してください（為替・料金改定で変わります）。
