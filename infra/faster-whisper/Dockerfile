# dentia 自前STT 参照サーバ（faster-whisper）
#
# このベースは CPU でも動く python:3.11-slim。faster-whisper は CTranslate2 で
# CPU 推論も可能だが、本番の精度/速度には GPU を推奨（設計書 §6.2）。
#
# GPU で動かす場合は、ベースを CUDA ランタイム入りに切り替える:
#   FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04
#   （Python と pip を apt で入れてから下記 requirements を導入。
#     起動は `docker run --gpus all ...`、env DEVICE=cuda COMPUTE_TYPE=int8_float16）
# サーバーレスGPU基盤（秒課金）に載せる場合も同様にGPUランタイムのイメージを使う。

FROM python:3.11-slim

# ffmpeg: faster-whisper が webm/mp4/wav 等をデコードするのに使用（一時ファイルは作らない）。
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 依存を先に入れてレイヤキャッシュを効かせる。
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py ./

# モデルは初回起動時にダウンロードされ HF キャッシュへ載る。
# コールドスタート短縮のため、ビルド時にプリフェッチしたい場合は下記を有効化（イメージは肥大化）:
#   ARG WHISPER_MODEL=large-v3
#   RUN python -c "from faster_whisper import WhisperModel; WhisperModel('${WHISPER_MODEL}', device='cpu', compute_type='int8')"

ENV HOST=0.0.0.0 \
    PORT=8000 \
    WHISPER_MODEL=large-v3 \
    COMPUTE_TYPE=int8 \
    DEVICE=cuda

EXPOSE 8000

# uvicorn で起動（録音停止後の単発リクエスト想定なのでワーカは1で十分）。
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
