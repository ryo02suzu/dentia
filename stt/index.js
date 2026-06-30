/**
 * STT Adapter — 文字起こしエンジンの差し替え可能な抽象層
 *
 * server.js の /api/transcribe からは transcribe() を呼ぶだけ。
 * エンジンの切替は環境変数だけで完結する（設計書: docs/stt-migration-plan.md §2.2, §8）。
 *
 *   STT_PROVIDER   : openai(既定) | amivoice | selfhost    … 主エンジン
 *   STT_FALLBACK   : カンマ区切りの予備エンジン（順に試行）  例: "amivoice,openai"
 *
 * 契約:  transcribe(buffer, { filename, mime }) -> Promise<{ text }>
 *   - 各エンジンの生出力に後処理補正（辞書置換）を必ず通してから返す。
 *   - 主エンジンが失敗/空文字なら STT_FALLBACK を順に試す（§8.3）。
 *   - 音声はメモリのみ・ディスクに残さない（呼び出し側の multer.memoryStorage 前提）。
 */

const openai = require("./providers/openai");
const amivoice = require("./providers/amivoice");
const selfhost = require("./providers/selfhost");
const { postProcess } = require("./postprocess");

// プロバイダ登録表。各エンジンは transcribe(buffer, meta) -> {text} を公開する。
//  - openai   : 現行 Whisper API（既定・フォールバック用）
//  - amivoice : 国産STT API（フェーズ1）。AMIVOICE_API_KEY 等が未設定なら呼び出し時にthrow。
//  - selfhost : 自前 faster-whisper 等（フェーズ3）。SELFHOST_STT_URL 未設定なら呼び出し時にthrow。
const ENGINES = {
  openai: openai.transcribe,
  amivoice: amivoice.transcribe,
  selfhost: selfhost.transcribe,
};

/** STT_FALLBACK を配列に。空要素・主エンジン重複・未知名は除去。 */
function fallbackChain(primary) {
  return (process.env.STT_FALLBACK || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== primary && ENGINES[s]);
}

/**
 * 音声を文字起こしして正規化済みテキストを返す。
 * @param {Buffer} buffer
 * @param {{ filename?: string, mime?: string }} [meta]
 * @returns {Promise<{ text: string, provider: string }>}
 */
async function transcribe(buffer, meta = {}) {
  const primary = process.env.STT_PROVIDER || "openai";
  const order = [primary, ...fallbackChain(primary)].filter((p) => ENGINES[p]);

  if (order.length === 0) {
    const err = new Error(`未知の STT_PROVIDER: "${primary}"`);
    err.status = 500;
    err.userMessage = "文字起こしエンジンの設定が正しくありません。";
    throw err;
  }

  let lastErr = null;
  for (const name of order) {
    try {
      const out = await ENGINES[name](buffer, meta);
      const raw = (out && out.text) || "";
      // 空文字は「認識失敗」とみなしフォールバックへ回す（最後のエンジンならそのまま返す）。
      if (!raw.trim() && name !== order[order.length - 1]) {
        lastErr = Object.assign(new Error(`${name}: 空の文字起こし結果`), { status: 502 });
        continue;
      }
      const text = await postProcess(raw, meta);
      return { text, provider: name };
    } catch (err) {
      lastErr = err;
      // 次のフォールバックへ。全滅したら最後の例外を投げる。
      console.warn(`[stt] provider "${name}" failed:`, err.message);
    }
  }

  throw lastErr || Object.assign(new Error("文字起こしに失敗しました。"), { status: 500 });
}

module.exports = { transcribe, ENGINES };
