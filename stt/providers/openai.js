/**
 * STT プロバイダ：OpenAI Whisper（現行）
 *
 * 既存 server.js の文字起こし処理をそのまま切り出したもの。挙動不変。
 * フェーズ1以降はフォールバック用途として残す（設計書 §8.3）。
 * ※ 米国送信になるため、コンプラ厳格運用ではフォールバックから外す設定も可（§8.3）。
 */

const OpenAI = require("openai");

const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

// 歯科用語の認識を助ける軽いヒント（精度改善の対象。後処理辞書と二段で効かせる）
const TRANSCRIBE_PROMPT =
  "歯科診療の会話です。歯式（#46 など）、う蝕、抜髄、根管治療、SRP、プロービング、" +
  "打診痛、冷水痛、EPT、Per（根尖性歯周炎）、補綴、クラウン、インレー、CR、" +
  "スケーリング、PMTC、BOP、PCR、RCF などの歯科用語が含まれます。";

/**
 * @param {Buffer} buffer 音声バッファ（メモリのみ・ディスクに書かない）
 * @param {{ filename?: string, mime?: string }} meta
 * @returns {Promise<{ text: string }>}
 */
async function transcribe(buffer, meta = {}) {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error(
      "OPENAI_API_KEY が設定されていません。.env に OPENAI_API_KEY を設定してください（.env.example を参照）。"
    );
    err.status = 500;
    err.userMessage = err.message;
    throw err;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // メモリ上のバッファを直接 File 化（ディスクに書き出さない）
  const file = await OpenAI.toFile(buffer, meta.filename || "audio.webm");
  const tr = await openai.audio.transcriptions.create({
    file,
    model: TRANSCRIBE_MODEL,
    language: "ja",
    prompt: TRANSCRIBE_PROMPT,
  });
  return { text: tr.text || "" };
}

module.exports = { transcribe, TRANSCRIBE_MODEL, TRANSCRIBE_PROMPT };
