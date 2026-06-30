/**
 * STT 評価スコアラ（依存ゼロ・自前実装）
 *
 * 設計書: docs/stt-migration-plan.md §5（評価計画）
 * 使い方:
 *   node eval/score.js <dataset.jsonl>
 *
 * dataset（JSON Lines, 1行=1会話）:
 *   { "id": "...", "ref": "正解テキスト", "hyp": "システム出力" }
 *   または複数システム横並び比較:
 *   { "id": "...", "ref": "正解", "hyps": { "whisper": "...", "amivoice": "..." } }
 *
 * 算出指標（§5.1）:
 *   - CER : 文字レベル誤り率（Levenshtein/参照文字数）。日本語の主指標。
 *   - WER : トークン（空白/句読点区切り）レベル誤り率。補助指標。
 *   - term : 歯科用語タグの多重集合 precision/recall/F1（term-level）。
 *            term 誤り率 = 1 - recall（= 正解用語のうち出力で取りこぼした割合）。
 *   - tooth: 歯番取り違え率。ref と hyp の歯番多重集合を比較し
 *            取り違え(substitution相当)+欠落+余剰 を ref 歯番数で割る。
 *   - lat  : 左右取り違え率。左右多重集合の不一致 / ref 左右数。
 *
 * プログラム利用（require）:
 *   const { cer, wer, scorePair, scoreDataset } = require("./eval/score");
 * CLI は require.main===module のときだけ実行する。
 */

const fs = require("fs");
const { extractTerms, extractTeeth, extractLaterality } = require("./terms");

/* ------------------------------------------------------------------ *
 * Levenshtein 距離（O(n*m) DP・2行ローリング）
 *   任意の「シンボル列」（文字配列 or トークン配列）に対する編集距離。
 * ------------------------------------------------------------------ */
/**
 * @param {string[]} a 参照シンボル列
 * @param {string[]} b 仮説シンボル列
 * @returns {number} 編集距離（挿入/削除/置換 各コスト1）
 */
function levenshtein(a, b) {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  let prev = new Array(m + 1);
  let curr = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    const ai = a[i - 1];
    for (let j = 1; j <= m; j++) {
      const cost = ai === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // 削除
        curr[j - 1] + 1, // 挿入
        prev[j - 1] + cost // 置換 or 一致
      );
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[m];
}

/* ------------------------------------------------------------------ *
 * CER / WER
 * ------------------------------------------------------------------ */
/** 文字配列化（空白も1文字として扱う。日本語は基本これで十分）。 */
function toChars(s) {
  return Array.from(s || "");
}

/** トークン化（空白で分割し、句読点を周辺から剥がす簡易版）。 */
function toTokens(s) {
  if (!s) return [];
  return s
    .replace(/[。、，．,.!?！？]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * 文字誤り率（Character Error Rate）。
 * @returns {{ rate:number, dist:number, refLen:number }}
 */
function cer(ref, hyp) {
  const r = toChars(ref);
  const dist = levenshtein(r, toChars(hyp));
  const refLen = r.length;
  return { rate: refLen === 0 ? (dist === 0 ? 0 : 1) : dist / refLen, dist, refLen };
}

/**
 * 単語誤り率（Word Error Rate, トークンレベル）。日本語では補助指標。
 * @returns {{ rate:number, dist:number, refLen:number }}
 */
function wer(ref, hyp) {
  const r = toTokens(ref);
  const dist = levenshtein(r, toTokens(hyp));
  const refLen = r.length;
  return { rate: refLen === 0 ? (dist === 0 ? 0 : 1) : dist / refLen, dist, refLen };
}

/* ------------------------------------------------------------------ *
 * 多重集合の一致集計（term / tooth / laterality 共通）
 *   precision = TP / (TP+FP) = 正しく出した数 / 出力した総数
 *   recall    = TP / (TP+FN) = 正しく出した数 / 正解の総数
 *   誤り率     = 1 - recall  （正解の取りこぼし率）
 *   置換/欠落/余剰: 多重集合の差から算出（編集距離ではなく集合差で十分）。
 * ------------------------------------------------------------------ */
/**
 * @param {string[]} refArr 正解タグ列
 * @param {string[]} hypArr 出力タグ列
 */
function multisetStats(refArr, hypArr) {
  const refCnt = new Map();
  const hypCnt = new Map();
  for (const t of refArr) refCnt.set(t, (refCnt.get(t) || 0) + 1);
  for (const t of hypArr) hypCnt.set(t, (hypCnt.get(t) || 0) + 1);

  let tp = 0; // 一致（多重度の min を加算）
  for (const [t, c] of refCnt) tp += Math.min(c, hypCnt.get(t) || 0);

  const refTotal = refArr.length;
  const hypTotal = hypArr.length;
  const missing = refTotal - tp; // 正解にあって出力に無い（欠落=FN）
  const extra = hypTotal - tp; // 出力にあって正解に無い（余剰=FP）

  const precision = hypTotal === 0 ? (refTotal === 0 ? 1 : 0) : tp / hypTotal;
  const recall = refTotal === 0 ? (hypTotal === 0 ? 1 : 0) : tp / refTotal;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  // 誤り率 = 1 - recall（正解用語のうち取りこぼした割合）。ref が空なら 0。
  const errRate = refTotal === 0 ? 0 : 1 - recall;

  return { tp, refTotal, hypTotal, missing, extra, precision, recall, f1, errRate };
}

/* ------------------------------------------------------------------ *
 * 1ペア（ref vs hyp）の全指標
 * ------------------------------------------------------------------ */
/**
 * @param {string} ref
 * @param {string} hyp
 */
function scorePair(ref, hyp) {
  const c = cer(ref, hyp);
  const w = wer(ref, hyp);
  const term = multisetStats(extractTerms(ref), extractTerms(hyp));
  const tooth = multisetStats(extractTeeth(ref), extractTeeth(hyp));
  const lat = multisetStats(extractLaterality(ref), extractLaterality(hyp));
  return { cer: c, wer: w, term, tooth, lat };
}

/* ------------------------------------------------------------------ *
 * データセット集計（システムごとにマイクロ平均）
 *   - CER/WER: 全行の編集距離合計 / 参照長合計（マイクロ平均）。
 *   - term/tooth/lat: TP/ref/hyp を全行で合算してから precision/recall/F1。
 * ------------------------------------------------------------------ */
/**
 * @param {{id?:string, ref:string, hyp?:string, hyps?:Record<string,string>}[]} rows
 * @returns {{ systems:string[], perSystem:Record<string, object>, count:number }}
 */
function scoreDataset(rows) {
  // 出現するシステム名を収集（hyp 単体は "hyp" 扱い）。
  const systems = new Set();
  for (const row of rows) {
    if (row.hyps && typeof row.hyps === "object") {
      for (const k of Object.keys(row.hyps)) systems.add(k);
    } else if (typeof row.hyp === "string") {
      systems.add("hyp");
    }
  }

  // システムごとの累積器
  const acc = {};
  for (const s of systems) {
    acc[s] = {
      cerDist: 0,
      cerRef: 0,
      werDist: 0,
      werRef: 0,
      term: { tp: 0, ref: 0, hyp: 0 },
      tooth: { tp: 0, ref: 0, hyp: 0 },
      lat: { tp: 0, ref: 0, hyp: 0 },
      n: 0,
    };
  }

  for (const row of rows) {
    const ref = row.ref || "";
    const hypMap = row.hyps && typeof row.hyps === "object" ? row.hyps : { hyp: row.hyp || "" };
    for (const [sys, hyp] of Object.entries(hypMap)) {
      if (!acc[sys]) continue;
      const a = acc[sys];
      const p = scorePair(ref, hyp || "");
      a.cerDist += p.cer.dist;
      a.cerRef += p.cer.refLen;
      a.werDist += p.wer.dist;
      a.werRef += p.wer.refLen;
      a.term.tp += p.term.tp;
      a.term.ref += p.term.refTotal;
      a.term.hyp += p.term.hypTotal;
      a.tooth.tp += p.tooth.tp;
      a.tooth.ref += p.tooth.refTotal;
      a.tooth.hyp += p.tooth.hypTotal;
      a.lat.tp += p.lat.tp;
      a.lat.ref += p.lat.refTotal;
      a.lat.hyp += p.lat.hypTotal;
      a.n += 1;
    }
  }

  // 累積から最終指標を確定
  const perSystem = {};
  for (const s of systems) {
    const a = acc[s];
    perSystem[s] = {
      n: a.n,
      cer: a.cerRef === 0 ? 0 : a.cerDist / a.cerRef,
      wer: a.werRef === 0 ? 0 : a.werDist / a.werRef,
      term: finalizeSet(a.term),
      tooth: finalizeSet(a.tooth),
      lat: finalizeSet(a.lat),
    };
  }

  return { systems: [...systems], perSystem, count: rows.length };
}

/** 累積した {tp, ref, hyp} から precision/recall/F1/誤り率を確定。 */
function finalizeSet(a) {
  const precision = a.hyp === 0 ? (a.ref === 0 ? 1 : 0) : a.tp / a.hyp;
  const recall = a.ref === 0 ? (a.hyp === 0 ? 1 : 0) : a.tp / a.ref;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const errRate = a.ref === 0 ? 0 : 1 - recall;
  return { precision, recall, f1, errRate, tp: a.tp, ref: a.ref, hyp: a.hyp };
}

/* ------------------------------------------------------------------ *
 * 出力整形（テキスト表・複数システム横並び）
 * ------------------------------------------------------------------ */
const pct = (x) => (x * 100).toFixed(1) + "%";

/** 値を固定幅に右詰め。 */
function pad(s, w) {
  s = String(s);
  return s.length >= w ? s : " ".repeat(w - s.length) + s;
}
/** 値を固定幅に左詰め。 */
function padR(s, w) {
  s = String(s);
  return s.length >= w ? s : s + " ".repeat(w - s.length);
}

/**
 * 集計結果をテキスト表で標準出力に書く。
 * 行=指標、列=システム。複数システムは横並び比較。
 */
function renderTable(result) {
  const systems = result.systems;
  const labelW = 22;
  const colW = 14;

  const lines = [];
  lines.push(`評価データ件数: ${result.count} 行 / システム: ${systems.join(", ")}`);
  lines.push("");

  // ヘッダ
  let head = padR("指標", labelW);
  for (const s of systems) head += pad(s, colW);
  lines.push(head);
  lines.push("-".repeat(labelW + colW * systems.length));

  // 1行=1指標を出すヘルパ
  const row = (label, fn) => {
    let line = padR(label, labelW);
    for (const s of systems) line += pad(fn(result.perSystem[s]), colW);
    lines.push(line);
  };

  row("CER（文字誤り率）", (m) => pct(m.cer));
  row("WER（語誤り率）", (m) => pct(m.wer));
  lines.push("-".repeat(labelW + colW * systems.length));
  row("用語 recall", (m) => pct(m.term.recall));
  row("用語 precision", (m) => pct(m.term.precision));
  row("用語 F1", (m) => pct(m.term.f1));
  row("用語 誤り率(1-recall)", (m) => pct(m.term.errRate));
  lines.push("-".repeat(labelW + colW * systems.length));
  row("歯番 取り違え率", (m) => pct(m.tooth.errRate));
  row("歯番 F1", (m) => pct(m.tooth.f1));
  row("歯番 (一致/正解)", (m) => `${m.tooth.tp}/${m.tooth.ref}`);
  lines.push("-".repeat(labelW + colW * systems.length));
  row("左右 取り違え率", (m) => pct(m.lat.errRate));
  row("左右 (一致/正解)", (m) => `${m.lat.tp}/${m.lat.ref}`);

  lines.push("");
  lines.push("※ CER=全体の地力（主指標）。用語/歯番/左右=臨床的に重要な専門指標（§5.1）。");
  lines.push("※ 誤り率は小さいほど良い。recall/precision/F1 は大きいほど良い。");

  return lines.join("\n");
}

/* ------------------------------------------------------------------ *
 * JSONL 読み込み
 * ------------------------------------------------------------------ */
/**
 * JSON Lines ファイルを読み、行オブジェクト配列を返す。
 * 空行・// 始まりのコメント行は無視。壊れた行は警告して飛ばす。
 */
function loadJsonl(path) {
  const text = fs.readFileSync(path, "utf8");
  const rows = [];
  let lineNo = 0;
  for (const line of text.split(/\r?\n/)) {
    lineNo++;
    const t = line.trim();
    if (!t || t.startsWith("//")) continue;
    try {
      rows.push(JSON.parse(t));
    } catch (e) {
      console.warn(`[score] ${path}:${lineNo} JSON 解析失敗のためスキップ: ${e.message}`);
    }
  }
  return rows;
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */
function main(argv) {
  const path = argv[2];
  if (!path) {
    console.error("使い方: node eval/score.js <dataset.jsonl>");
    console.error("  各行 JSON: { id, ref, hyp } もしくは { id, ref, hyps: { whisper, amivoice } }");
    process.exit(2);
  }
  if (!fs.existsSync(path)) {
    console.error(`[score] ファイルが見つかりません: ${path}`);
    process.exit(2);
  }
  const rows = loadJsonl(path);
  if (rows.length === 0) {
    console.error("[score] 有効なデータ行がありません。");
    process.exit(1);
  }
  const result = scoreDataset(rows);
  console.log(renderTable(result));
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  levenshtein,
  cer,
  wer,
  scorePair,
  scoreDataset,
  multisetStats,
  loadJsonl,
  renderTable,
};
