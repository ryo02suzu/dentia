/**
 * 後処理補正（決定的・無料・低レイテンシ）
 *
 * STT が返した生テキストに対し、歯科用語の辞書置換を適用して正規表記へ寄せる。
 *  - 設計書: docs/stt-migration-plan.md §3.2(a)
 *  - LLM正規化（§3.2b）は将来オプション（STT_POSTPROCESS_LLM=on）。本v0では辞書のみ。
 *  - 「意味を変えない・新情報を足さない」が鉄則。歯番/左右の“誤認識”は直さない（表記体裁のみ）。
 */

const { SAFE_RULES, GUARDED_RULES, TOOTH_RULES } = require("./dictionary");
const { normalize } = require("./llmNormalize");

/**
 * 生テキストに辞書置換を適用する。
 * @param {string} raw STTの生出力
 * @returns {string} 正規化後テキスト
 */
function applyDictionary(raw) {
  if (!raw) return raw;
  let text = raw;
  for (const rule of [...SAFE_RULES, ...GUARDED_RULES, ...TOOTH_RULES]) {
    text = text.replace(rule.re, rule.to);
  }
  return text;
}

/**
 * 後処理の入口。今は辞書置換のみ。
 * 将来 STT_POSTPROCESS_LLM=on のときに LLM 正規化段を足す（表記正規化のみ・新情報追加禁止）。
 * @param {string} raw
 * @param {{ mime?: string, filename?: string }} [_meta]
 * @returns {Promise<string>}
 */
async function postProcess(raw, meta) {
  let text = applyDictionary(raw);
  // フェーズ2: 環境変数 ON のときだけ LLM 正規化（表記正規化のみ・新情報追加禁止）。
  // normalize はフェイルオープン（APIキー未設定/エラー時は入力をそのまま返す）なので
  // 文字起こしを止めない。既定 OFF のためリグレッションは無い。
  if (process.env.STT_POSTPROCESS_LLM === "on") {
    text = await normalize(text, meta);
  }
  return text;
}

module.exports = { postProcess, applyDictionary };
