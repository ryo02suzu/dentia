/**
 * 歯科用語タグ抽出ユーティリティ（評価ハーネス用）
 *
 * 設計書: docs/stt-migration-plan.md §5.1 / §5.2
 *  - term-level 誤り率・歯番取り違え率・左右取り違え率の自動採点に使う。
 *  - ここは「テキストから歯科的に意味のあるトークンを拾う」だけ。正規化はしない。
 *  - 正規表現はメンテしやすいよう表（TERM_PATTERNS）で一元管理する。
 *
 * 公開:
 *   extractTerms(text)       -> string[]  歯科用語（略語・所見・術式など）の正規タグ列
 *   extractTeeth(text)       -> string[]  歯番（#? 1〜2桁, FDI 2桁中心）の列
 *   extractLaterality(text)  -> string[]  左右（"左"/"右"）の出現列
 *
 * いずれも出現順の配列を返す（多重集合として扱えるよう重複は保持）。
 */

/* ------------------------------------------------------------------ *
 * 歯科用語パターン表
 *   各行 { tag, re }:
 *     tag = 正規タグ（採点はこのタグの多重集合で行う）
 *     re  = テキスト中の表記ゆれを拾う正規表現（読み仮名・英略・全角を吸収）
 *   注意: 置換はしない（あくまで「数える」用途）。誤爆を避け、確実な表記のみ拾う。
 * ------------------------------------------------------------------ */
/** @type {{ tag: string, re: RegExp }[]} */
const TERM_PATTERNS = [
  // --- 検査・略語（英略 or カタカナ読み） ---
  { tag: "EPT", re: /\bEPT\b|イーピーティー|電気歯髄(?:診|検査)/g },
  { tag: "SRP", re: /\bSRP\b|エスアールピー/g },
  { tag: "PMTC", re: /\bPMTC\b|ピーエムティーシー/g },
  { tag: "BOP", re: /\bBOP\b|ビーオーピー/g },
  { tag: "PCR", re: /\bPCR\b|ピーシーアール/g },
  { tag: "TBI", re: /\bTBI\b|ティービーアイ/g },
  { tag: "SPT", re: /\bSPT\b|エスピーティー/g },
  { tag: "RCF", re: /\bRCF\b|アールシーエフ/g },
  { tag: "EMR", re: /\bEMR\b|イーエムアール/g },
  { tag: "FMC", re: /\bFMC\b|エフエムシー/g },
  { tag: "Per", re: /\bPer\b|根尖性歯周炎/g },
  { tag: "PD", re: /\bPD\b|プロービングデプス|ピーディー/g },

  // --- 所見・症状 ---
  { tag: "打診痛", re: /打診痛/g },
  { tag: "冷水痛", re: /冷水痛/g },
  { tag: "温水痛", re: /温水痛/g },
  { tag: "自発痛", re: /自発痛/g },
  { tag: "プロービング", re: /プロービング(?!デプス)/g },
  { tag: "う蝕", re: /う蝕|齲蝕|ウショク/g },

  // --- 齲蝕分類 C1〜C4（数字は別タグに分ける＝取り違えを検出しやすく） ---
  { tag: "C1", re: /\bC1\b|シーワン/g },
  { tag: "C2", re: /\bC2\b|シーツー/g },
  { tag: "C3", re: /\bC3\b|シースリー/g },
  { tag: "C4", re: /\bC4\b|シーフォー/g },

  // --- 術式・処置 ---
  { tag: "抜髄", re: /抜髄/g },
  { tag: "感染根管治療", re: /感染根管治療/g },
  { tag: "根管充填", re: /根管充[填塡]/g },
  { tag: "スケーリング", re: /スケーリング/g },
  { tag: "補綴", re: /補綴/g },
  { tag: "クラウン", re: /クラウン/g },
  { tag: "インレー", re: /インレー/g },
  { tag: "CR", re: /\bCR(?![A-Za-z])|シーアール/g },
];

/**
 * 歯科用語タグを出現順に抽出する。
 * 同一語に複数表記がヒットしても tag に正規化して数える。
 * @param {string} text
 * @returns {string[]} 例: ["#46 文脈なしのタグ列", "EPT", "Per", ...]
 */
function extractTerms(text) {
  if (!text) return [];
  // {index, tag} を集めて、テキスト上の出現位置でソート＝出現順を保つ。
  const hits = [];
  for (const { tag, re } of TERM_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      hits.push({ index: m.index, tag });
      if (m.index === re.lastIndex) re.lastIndex++; // 空マッチ保険
    }
  }
  hits.sort((a, b) => a.index - b.index);
  return hits.map((h) => h.tag);
}

/* ------------------------------------------------------------------ *
 * 歯番（歯式）抽出
 *   "#46" / "46番" / 単独 "46" を拾い、"#46" 形に正規化したタグで返す。
 *   FDI の 2桁（11〜48）が中心だが、乳歯/簡略表記の 1桁も許容する。
 *   数字そのものは変えない（取り違え検出のため）。
 * ------------------------------------------------------------------ */
const TOOTH_RE = /(?:#|＃|♯|シャープ|井桁|ナンバー|番号)?\s*(\d{1,2})\s*番?(?=[^0-9]|$)/g;

/**
 * 歯番を出現順に抽出する。記号有無/「番」付きを吸収し "#NN" に正規化。
 * 一般の数値（mm 値・年齢等）の混入を避けるため、歯式記号付き or 「番」付き、
 * もしくは FDI 妥当域(11-18/21-28/31-38/41-48) の 2桁のみを採用する。
 * @param {string} text
 * @returns {string[]} 例: ["#46", "#36"]
 */
function extractTeeth(text) {
  if (!text) return [];
  const out = [];
  let m;
  TOOTH_RE.lastIndex = 0;
  while ((m = TOOTH_RE.exec(text)) !== null) {
    const num = m[1];
    const whole = m[0];
    const hasMark = /[#＃♯]|シャープ|井桁|ナンバー|番号|番/.test(whole);
    const n = parseInt(num, 10);
    const isFdi =
      num.length === 2 &&
      ((n >= 11 && n <= 18) ||
        (n >= 21 && n <= 28) ||
        (n >= 31 && n <= 38) ||
        (n >= 41 && n <= 48));
    // 記号/「番」付き、または FDI 妥当域の2桁だけを歯番として採用（誤検出抑制）。
    if (hasMark || isFdi) out.push(`#${num}`);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 左右抽出
 *   "左"/"右"（"左右"・"左下"・"右上" 等の合成語も各1回として拾う）。
 *   左右取り違えは臨床的に危険なので単独指標として比較する（§5.1）。
 * ------------------------------------------------------------------ */
const LATERAL_RE = /[左右]/g;

/**
 * 左右の出現を出現順に抽出する。
 * @param {string} text
 * @returns {string[]} 例: ["左", "右", "右"]
 */
function extractLaterality(text) {
  if (!text) return [];
  return text.match(LATERAL_RE) || [];
}

module.exports = {
  extractTerms,
  extractTeeth,
  extractLaterality,
  TERM_PATTERNS, // テスト/拡張用に公開
};
