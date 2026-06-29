/**
 * 後処理補正（決定的・無料・低レイテンシ）
 *
 * STT が返した生テキストに対し、歯科用語の辞書置換を適用して正規表記へ寄せる。
 *  - 設計書: docs/stt-migration-plan.md §3.2(a)
 *  - LLM正規化（§3.2b）は将来オプション（STT_POSTPROCESS_LLM=on）。本v0では辞書のみ。
 *  - 「意味を変えない・新情報を足さない」が鉄則。歯番/左右の“誤認識”は直さない（表記体裁のみ）。
 */

const { SAFE_RULES, GUARDED_RULES, TOOTH_RULES } = require("./dictionary");

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
async function postProcess(raw, _meta) {
  const text = applyDictionary(raw);
  // TODO(phase2): if (process.env.STT_POSTPROCESS_LLM === "on") text = await llmNormalize(text);
  return text;
}

module.exports = { postProcess, applyDictionary };
