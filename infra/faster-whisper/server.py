"""
dentia 自前STT 参照サーバ（faster-whisper / フェーズ3）

dentia の selfhost プロバイダ（stt/providers/selfhost.js）から multipart "audio" を受け、
faster-whisper で日本語の文字起こしを行い {text} を返す軽量 FastAPI アプリ。

設計方針（設計書 docs/stt-migration-plan.md §6, §7）:
  - 音声は自社管理の環境内のみで処理し、外部へ送らない（越境停止・データ主権）。
  - 要配慮個人情報のため、音声バイト列・文字起こし本文をログに残さない。
    （uvicorn のアクセスログにも本文は出さない。例外時もメッセージに本文を含めない。）
  - 一時ファイルは作らず、メモリ上のバイト列を直接デコードして推論にかける。

環境変数:
  WHISPER_MODEL  : モデル名（既定 "large-v3"。軽量化なら "kotoba-tech/kotoba-whisper-v2.0-faster" 等）
  COMPUTE_TYPE   : 量子化（既定 "int8"。GPUなら "int8_float16" / "float16" も可）
  DEVICE         : "cuda"（既定）。CUDA不在時は自動で "cpu" にフォールバック。
  BEAM_SIZE      : ビームサイズ（既定 5）
  SELFHOST_STT_TOKEN : 任意。設定時は Authorization: Bearer の一致を要求（dentia 側と共有）。
"""

import io
import os

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from faster_whisper import WhisperModel

# ---- 設定（環境変数で調整） -------------------------------------------------
MODEL_NAME = os.environ.get("WHISPER_MODEL", "large-v3")
COMPUTE_TYPE = os.environ.get("COMPUTE_TYPE", "int8")
DEVICE = os.environ.get("DEVICE", "cuda")
BEAM_SIZE = int(os.environ.get("BEAM_SIZE", "5"))
AUTH_TOKEN = os.environ.get("SELFHOST_STT_TOKEN")

# 歯科用語の認識を助ける initial_prompt（設計書 §3.1, §3.2）。
# Whisper 系は直前文脈として効く。誤変換が起きやすい略語・歯式を列挙しておく。
INITIAL_PROMPT = (
    "歯科診療の会話です。歯式（#46 など）、う蝕、抜髄、根管治療、SRP、"
    "プロービング、PD、打診痛、冷水痛、EPT、Per（根尖性歯周炎）、補綴、"
    "クラウン、インレー、CR、スケーリング、PMTC、BOP、PCR、RCF が含まれます。"
)


def _load_model() -> WhisperModel:
    """モデルをロード。CUDA が使えない環境では CPU + int8 へ自動フォールバックする。"""
    try:
        return WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)
    except Exception as exc:  # noqa: BLE001 - GPU不在/ドライバ不整合などを広く捕捉
        if DEVICE != "cpu":
            # CPU では int8 が無難。本文ではなく状況のみをログに出す。
            print(f"[faster-whisper] {DEVICE} 不可のため CPU へフォールバック: {exc}")
            return WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")
        raise


app = FastAPI(title="dentia self-hosted STT", version="1.0")

# 起動時に一度だけロード（コールドスタート対策。常駐プロセスで使い回す）。
model = _load_model()


@app.get("/health")
def health():
    """死活監視用。モデル名・デバイス等を返す（音声・本文は一切含めない）。"""
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
    }


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    """multipart field "audio" を受け、日本語で文字起こしして {text} を返す。"""
    # 任意の共有シークレット検証（設定時のみ）。
    if AUTH_TOKEN:
        expected = f"Bearer {AUTH_TOKEN}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="unauthorized")

    # メモリ上で読み取り、一時ファイルを作らずに推論へ。
    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty audio")

    # faster-whisper は file-like を受け付ける。内部で ffmpeg/av が webm/mp4/wav を読む。
    segments, _info = model.transcribe(
        io.BytesIO(data),
        language="ja",
        beam_size=BEAM_SIZE,
        initial_prompt=INITIAL_PROMPT,
        vad_filter=True,  # 無音区間を除去して幻聴（hallucination）を抑える
    )

    # segments はジェネレータ。連結して本文を作る（本文はログに出さない）。
    text = "".join(seg.text for seg in segments).strip()
    return {"text": text}


if __name__ == "__main__":
    import uvicorn

    # access ログは本文を含めないが、運用に応じて無効化も可。
    uvicorn.run(
        app,
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "8000")),
    )
