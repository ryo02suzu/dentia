/**
 * STT プロバイダ：未実装スタブ（amivoice / selfhost）
 *
 * フェーズ1（国産STT API）・フェーズ3（自前 faster-whisper）でここを実装する。
 * 設計書: docs/stt-migration-plan.md §3, §6, §8。
 * 実装時の契約: (buffer, meta) => Promise<{ text: string }>
 *   - 必要なら meta.mime を見て ffmpeg で wav/16kHz mono へ変換してから送る（§8.2）。
 *   - 音声は国内/自社内で処理し、ログに本文・音声を残さない（§7）。
 */

/**
 * @param {string} name プロバイダ名（エラーメッセージ用）
 */
function makeStub(name) {
  return async function transcribe() {
    const err = new Error(`STT プロバイダ "${name}" は未実装です（フェーズ1/3で実装）。`);
    err.status = 501;
    err.userMessage = "文字起こしエンジンが未設定です。設定をご確認ください。";
    throw err;
  };
}

module.exports = { makeStub };
