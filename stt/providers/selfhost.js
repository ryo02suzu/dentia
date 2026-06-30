/**
 * STT プロバイダ：自前STT（フェーズ3 / faster-whisper 参照サーバ）
 *
 * 音声を自社管理の faster-whisper サーバ（infra/faster-whisper/server.py）へ POST し、
 * {text} を受け取る。音声は社内/自社GPUから外に出さない＝越境停止・データ主権（設計書 §6, §7）。
 *
 *   SELFHOST_STT_URL    : 文字起こしエンドポイント（例 http://gpu-host:8000/transcribe）。必須。
 *   SELFHOST_STT_TOKEN  : 任意。あれば Authorization: Bearer で付与（簡易な共有シークレット）。
 *   SELFHOST_TIMEOUT_MS : タイムアウト（既定 120000）。超過で status=504。
 *
 * 契約: transcribe(buffer, { filename, mime }) => Promise<{ text }>（後処理は呼び出し側 Adapter が実施）。
 *  - 音声はメモリのみ・ディスクに残さない。本文・音声を console に出さない（要配慮個人情報）。
 *  - グローバル fetch / FormData / Blob（Node18+）を使用。新規npm依存なし。
 */

const { toWav16kMono } = require("../audio");

const DEFAULT_TIMEOUT_MS = 120000;

/** 利用者に出してよい安全な日本語文言を付けた Error を生成する。 */
function sttError(message, status, userMessage) {
  const err = new Error(message);
  err.status = status;
  err.userMessage = userMessage;
  return err;
}

/**
 * @param {Buffer} buffer 音声バッファ（メモリのみ）
 * @param {{ filename?: string, mime?: string }} [meta]
 * @returns {Promise<{ text: string }>}
 */
async function transcribe(buffer, meta = {}) {
  const url = process.env.SELFHOST_STT_URL;
  if (!url) {
    throw sttError(
      "SELFHOST_STT_URL が未設定です。",
      500,
      "自前STTのURL(SELFHOST_STT_URL)が未設定です。"
    );
  }

  // faster-whisper は ffmpeg で webm/mp4 も読めるが、サーバ負荷を下げるため事前に
  // 16kHz mono wav へ寄せておく（ffmpeg 不在環境では pass-through で元バッファのまま送る）。
  const { buffer: body, converted, contentType } = await toWav16kMono(buffer);
  const filename = converted ? "audio.wav" : meta.filename || "audio.webm";
  const type = converted ? "audio/wav" : meta.mime || contentType || "application/octet-stream";

  // multipart/form-data の field "audio" で送信（サーバ側 server.py の受け口と一致）。
  const form = new FormData();
  form.append("audio", new Blob([body], { type }), filename);

  // タイムアウトは AbortController で実装（既定/上限は環境変数で調整可能）。
  const timeoutMs = Number(process.env.SELFHOST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {};
  if (process.env.SELFHOST_STT_TOKEN) {
    headers.Authorization = `Bearer ${process.env.SELFHOST_STT_TOKEN}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    // AbortController による中断＝タイムアウト。それ以外は接続不可など。
    if (err && err.name === "AbortError") {
      throw sttError(
        `自前STTがタイムアウトしました (${timeoutMs}ms): ${url}`,
        504,
        "自前STTの応答がありませんでした。時間をおいて再度お試しください。"
      );
    }
    throw sttError(
      `自前STTへの接続に失敗しました: ${err && err.message}`,
      502,
      "自前STTに接続できませんでした。サーバーの稼働状況をご確認ください。"
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // 本文に音声・PII が混ざる可能性は低いが、念のため先頭のみ・短く（ログには出さない）。
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      /* 読めなくても続行 */
    }
    throw sttError(
      `自前STTがエラー応答 (HTTP ${res.status}): ${detail}`,
      res.status >= 500 ? 502 : res.status,
      "自前STTの処理でエラーが発生しました。設定とサーバーの状態をご確認ください。"
    );
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw sttError(
      "自前STTのレスポンスがJSONではありません。",
      502,
      "自前STTの応答が不正でした。サーバーの設定をご確認ください。"
    );
  }

  return { text: (data && data.text) || "" };
}

module.exports = { transcribe };
