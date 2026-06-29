/**
 * STT プロバイダ：AmiVoice Cloud Platform（国産STT・フェーズ1の本命）
 *
 * 設計書 docs/stt-migration-plan.md の §1〜§3, §8 に対応。
 * 国産API へ切替えることで OpenAI（米国）への音声送信を停止し、越境を止める（§7）。
 *
 * 実装の根拠（AmiVoice の一般的な同期HTTP音声認識APIの形）:
 *   - POST に multipart/form-data で以下のフィールドを載せる:
 *       u = APPKEY（接続用認証キー）
 *       d = リクエストパラメータ文字列。認識エンジン（接続文法）は
 *           "grammarFileNames=<エンジン名>" の形で指定する。
 *       a = 音声データ本体（バイナリ）。16kHz/mono の wav/PCM を送るのが無難。
 *   - レスポンスは JSON。正常時は body.text に認識結果文字列が入り、
 *     エラー時は body.code（エラーコード）・body.message（説明）が入る。
 *
 *   ※ 正式なフィールド名・エンドポイント・エンジン名（接続文法）・レスポンス形式は、
 *      契約時に AmiVoice 公式ドキュメントで必ず確認すること。
 *      ここでは一般的なAPI形を前提とした実装であり、本番投入前に実機で要検証。
 *
 * 契約（stt/index.js Adapter から呼ばれる）:
 *   transcribe(buffer, { filename, mime }) -> Promise<{ text }>
 *   - 戻り値は生テキスト（後処理＝辞書置換/LLM正規化は Adapter 側が行う）。
 *   - 設定不足・APIエラー・タイムアウトは throw（err.status / err.userMessage 付与）。
 *   - 音声はメモリのみ・ディスクに書かない。本文・音声を console に出さない（要配慮個人情報）。
 */

const { toWav16kMono } = require("../audio");

// ── 設定（環境変数）。既定値は安全側・差し替え可能にする ───────────────
const ENDPOINT = process.env.AMIVOICE_ENDPOINT || "https://acp-api.amivoice.com/v1/recognize";
// 接続文法（認識エンジン）。既定は汎用 "-a-general"。
// 医療系に寄せる場合は "-a-medical" 等へ env で差し替える（正式名はドキュメント要確認）。
const ENGINE = process.env.AMIVOICE_ENGINE || "-a-general";
// タイムアウト（ミリ秒）。長尺音声を考慮し既定 60 秒。
const TIMEOUT_MS = Number(process.env.AMIVOICE_TIMEOUT_MS) || 60000;

/** status / userMessage を付与した Error を作る小ヘルパ */
function sttError(message, status, userMessage) {
  const err = new Error(message);
  err.status = status;
  err.userMessage = userMessage;
  return err;
}

/**
 * @param {Buffer} buffer 音声バッファ（メモリのみ・ディスクに書かない）
 * @param {{ filename?: string, mime?: string }} [meta]
 * @returns {Promise<{ text: string }>}
 */
async function transcribe(buffer, meta = {}) {
  // ── APPKEY（接続用認証キー）必須 ─────────────────────────────
  const appKey = process.env.AMIVOICE_API_KEY;
  if (!appKey) {
    throw sttError(
      "AMIVOICE_API_KEY が設定されていません（.env を確認）。",
      500,
      "国産STT(AmiVoice)のAPIキーが未設定です。"
    );
  }

  // ── 送信前に 16kHz mono wav へ変換 ───────────────────────────
  // ffmpeg 不在時は pass-through（元バッファのまま）。その場合は webm/mp4 を
  // そのまま送ることになるため、本番では ffmpeg を用意して wav 送信を推奨。
  const { buffer: audioBuf, converted, contentType } = await toWav16kMono(buffer);
  // 変換できたら wav、できなければ元の mime / 既定値を使う。
  const audioMime = converted ? contentType : meta.mime || "application/octet-stream";
  const audioName = converted ? "audio.wav" : meta.filename || "audio";

  // ── multipart/form-data 組み立て（Node18+ のグローバル FormData/Blob）──
  const form = new FormData();
  form.append("u", appKey); // u: APPKEY
  form.append("d", "grammarFileNames=" + ENGINE); // d: リクエストパラメータ（認識エンジン指定）
  form.append("a", new Blob([audioBuf], { type: audioMime }), audioName); // a: 音声本体

  // ── タイムアウト（AbortController）────────────────────────────
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    // abort はタイムアウト扱い、それ以外は接続エラー扱い。
    if (err && err.name === "AbortError") {
      throw sttError("AmiVoice 応答タイムアウト", 504, "文字起こしがタイムアウトしました。");
    }
    throw sttError(
      "AmiVoice への接続に失敗しました: " + err.message,
      502,
      "国産STT(AmiVoice)への接続に失敗しました。時間をおいて再度お試しください。"
    );
  } finally {
    clearTimeout(timer);
  }

  // ── レスポンス解釈 ───────────────────────────────────────────
  // 本文に音声・認識テキストを含むため、エラーログにも body 本文は出さない。
  let body;
  try {
    body = await res.json();
  } catch {
    // JSON でない＝想定外のエラー応答（HTMLのゲートウェイエラー等）。
    throw sttError(
      `AmiVoice 応答がJSONではありません (HTTP ${res.status})`,
      res.status >= 400 ? res.status : 502,
      "国産STT(AmiVoice)で想定外の応答がありました。"
    );
  }

  // AmiVoice 側のエラー（HTTP非200、または body.code/body.message でのエラー通知）。
  // ※ code の正常値（空文字や "0" 等）の扱いは公式ドキュメントで要確認。
  //    ここでは「code が真値（空でない）かつ message がある」場合をエラーとみなす保守的判定。
  const apiErrored = (body && body.code && body.message) || !res.ok;
  if (apiErrored) {
    const detail = body && body.message ? String(body.message) : `HTTP ${res.status}`;
    throw sttError(
      `AmiVoice 認識エラー: ${detail}`,
      res.ok ? 502 : res.status,
      "国産STT(AmiVoice)で文字起こしに失敗しました。"
    );
  }

  // 正常時は body.text を返す。空文字はそのまま返す（フォールバック判断は Adapter 側）。
  const text = body && typeof body.text === "string" ? body.text : "";
  return { text };
}

module.exports = { transcribe, ENGINE, ENDPOINT, TIMEOUT_MS };
