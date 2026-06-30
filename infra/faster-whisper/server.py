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
  WHISPER_MODEL  : モデル名（既定 "large-v3"。日本語特化なら "kotoba-tech/kotoba-whisper-v2.0-faster"、
                   軽量化なら "small" 等）。臨床精度は large-v3 以上を推奨。
  COMPUTE_TYPE   : 量子化（既定 "int8"。GPUなら "int8_float16" / "float16" も可）
  DEVICE         : "cuda"（既定）。CUDA不在時は自動で "cpu" にフォールバック。
  BEAM_SIZE      : ビームサイズ（既定 5）
  INITIAL_PROMPT : 直前文脈（歯科語彙のバイアス）。未設定なら歯科の既定プロンプト。
  CONDITION_PREV : "true"/"false"（既定 false）。直前テキストへの依存を切ると幻聴・暴走を抑制。
  TEMPERATURE    : デコード温度（既定 0.0＝決定的）。
  NO_SPEECH_THRESHOLD / LOGPROB_THRESHOLD / COMPRESSION_RATIO_THRESHOLD : 幻聴抑制の閾値。
  VAD_FILTER     : "true"/"false"（既定 true）。無音区間を除去。
  SELFHOST_STT_TOKEN : 任意。設定時は Authorization: Bearer の一致を要求（dentia 側と共有）。
"""

import io
import os

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from faster_whisper import WhisperModel


def _envf(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _envb(name: str, default: bool) -> bool:
    v = os.environ.get(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


# ---- 設定（環境変数で調整） -------------------------------------------------
MODEL_NAME = os.environ.get("WHISPER_MODEL", "large-v3")
COMPUTE_TYPE = os.environ.get("COMPUTE_TYPE", "int8")
DEVICE = os.environ.get("DEVICE", "cuda")
BEAM_SIZE = int(os.environ.get("BEAM_SIZE", "5"))
AUTH_TOKEN = os.environ.get("SELFHOST_STT_TOKEN")

# デコード設定（臨床用途では「創作・暴走を抑え、忠実に拾う」方向にチューニング）。
CONDITION_PREV = _envb("CONDITION_PREV", False)  # 直前依存を切り、無関係文への引きずりを防ぐ
TEMPERATURE = _envf("TEMPERATURE", 0.0)          # 決定的デコード（再現性・安定）
VAD_FILTER = _envb("VAD_FILTER", True)           # 無音除去で幻聴を抑える
NO_SPEECH_THRESHOLD = _envf("NO_SPEECH_THRESHOLD", 0.6)
LOGPROB_THRESHOLD = _envf("LOGPROB_THRESHOLD", -1.0)
COMPRESSION_RATIO_THRESHOLD = _envf("COMPRESSION_RATIO_THRESHOLD", 2.4)

# 歯科用語の認識を助ける initial_prompt（設計書 §3.1, §3.2）。
# Whisper 系は直前文脈として効く。誤変換が起きやすい語・歯式・処置名・症状を厚めに列挙する。
INITIAL_PROMPT = os.environ.get(
    "INITIAL_PROMPT",
    "以下は日本の歯科診療の会話の文字起こしです。次の歯科用語が正しく含まれます："
    "歯式（#46 #36 など）、親知らず、抜歯、抜髄、う蝕、虫歯、根管治療、根管充填、"
    "歯石、スケーリング、SRP、PMTC、プロービング、PD、ポケット、BOP、PCR、"
    "歯茎、歯肉、腫れ、知覚過敏、しみる、打診痛、冷水痛、自発痛、EPT、"
    "Per（根尖性歯周炎）、補綴、クラウン、インレー、型取り、印象、CR、レジン、"
    "詰め物、抗生物質、消炎、奥歯、前歯。",
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
    # 臨床用途のデコード設定：温度0で決定的、直前依存を切り、幻聴閾値で創作を抑える。
    segments, _info = model.transcribe(
        io.BytesIO(data),
        language="ja",
        beam_size=BEAM_SIZE,
        initial_prompt=INITIAL_PROMPT,
        temperature=TEMPERATURE,
        condition_on_previous_text=CONDITION_PREV,
        no_speech_threshold=NO_SPEECH_THRESHOLD,
        log_prob_threshold=LOGPROB_THRESHOLD,
        compression_ratio_threshold=COMPRESSION_RATIO_THRESHOLD,
        vad_filter=VAD_FILTER,  # 無音区間を除去して幻聴（hallucination）を抑える
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
