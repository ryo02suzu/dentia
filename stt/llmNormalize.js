/**
 * LLM正規化（フェーズ2・任意）
 *
 * STTの聞き起こし日本語テキストを、意味を変えずに「歯科の標準表記」へ正規化する。
 *  - 設計書: docs/stt-migration-plan.md §3.2(b), §10（LLM正規化の改変リスク対策）
 *  - 後処理辞書（postprocess.js）で吸収しきれない表記揺れ・歯科用語の明らかな誤変換だけを直す。
 *  - 既存依存 @anthropic-ai/sdk を使う（server.js の /api/generate と同じSDK）。
 *
 * 絶対制約（システムプロンプトで強く縛る）:
 *   - 情報を追加・削除・要約しない。新たな所見/診断/数値を創作しない。発話の意味を変えない。
 *   - 歯番・左右・数値は勝手に変更しない（読み仮名→記号などの表記直しのみ許可）。
 *   - 出力は正規化後テキストそのもの。説明文・前置きを付けない。
 *
 * フェイルオープン:
 *   ANTHROPIC_API_KEY未設定・APIエラー・空応答のときは、入力 text をそのまま返す。
 *   文字起こしを止めないことを最優先にする。エラーは console.warn 程度（本文は出さない）。
 */

const Anthropic = require("@anthropic-ai/sdk");

// server.js と同じモデル既定に揃える。
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// 正規化呼び出しのタイムアウト（ms）。フェイルオープン設計なので、
// ハングした正規化が文字起こし応答を長時間ブロックしないよう既定を短めにする。
// 環境変数 STT_LLM_TIMEOUT_MS で調整可能（既定15秒・下限1秒）。
function resolveTimeoutMs() {
  const v = Number(process.env.STT_LLM_TIMEOUT_MS);
  if (Number.isFinite(v) && v >= 1000) return v;
  return 15000;
}

// 構造化出力用ツール。input.text に正規化後テキストだけを入れさせ、確実に取り出す。
const NORMALIZE_TOOL = {
  name: "record_normalized_text",
  description:
    "歯科の聞き起こしテキストを歯科標準表記に正規化した結果を記録する。" +
    "意味は一切変えず、表記の揺れと明らかな歯科用語の誤変換のみを直したテキストを text に入れる。",
  input_schema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "正規化後の本文テキスト（説明や注釈を含めない）。",
      },
    },
    required: ["text"],
  },
};

// 改変防止を最優先にしたシステムプロンプト。
const SYSTEM_PROMPT =
  "あなたは歯科診療の音声文字起こしを校正する専門家です。" +
  "入力は歯科の会話を聞き起こした日本語テキストです。" +
  "あなたの唯一の仕事は、表記の揺れと歯科用語の明らかな誤変換だけを、歯科の標準表記に正規化することです。\n" +
  "厳守事項:\n" +
  "1. 情報を追加・削除・要約してはならない。文や語を勝手に補ったり省いたりしない。\n" +
  "2. 新たな所見・診断・数値・固有名詞を創作してはならない。\n" +
  "3. 発話の意味を変えてはならない。語順や言い回しを必要以上に変えない。\n" +
  "4. 歯番・左右（右/左・上/下）・数値（PD値、C分類、ミリ数など）を勝手に変更してはならない。" +
  "読み仮名から記号への表記直し（例: 『シャープよんろく』→『#46』、『イーピーティー』→『EPT』）のみ許可する。\n" +
  "5. 判断に迷うものは元のまま残す。確実に誤変換と言えるものだけ直す。\n" +
  "6. 出力は record_normalized_text ツールで、正規化後のテキストのみを返す。説明や前置きを付けない。";

/**
 * 入力長に見合う max_tokens を見積もる。
 * 日本語1文字 ≈ 1〜2トークン程度を見込み、入力相当＋余裕を確保する（上限あり）。
 * @param {string} text
 * @returns {number}
 */
function estimateMaxTokens(text) {
  const base = Math.ceil((text ? text.length : 0) * 2) + 256;
  // 過大なリクエストを避けるための下限・上限。
  return Math.min(Math.max(base, 512), 8192);
}

/**
 * STTの生／辞書補正済みテキストを歯科標準表記に正規化する。
 * フェイルオープン: 失敗時は入力 text をそのまま返す。
 * @param {string} text 正規化対象の日本語テキスト
 * @param {{ filename?: string, mime?: string }} [_meta] 予約（現状未使用）
 * @returns {Promise<string>}
 */
async function normalize(text, _meta) {
  // 空・非文字列はそのまま返す（呼ぶ意味がない）。
  if (!text || typeof text !== "string" || !text.trim()) return text;

  // APIキー未設定はフェイルオープン（機能オフと同義）。
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[stt:llmNormalize] ANTHROPIC_API_KEY 未設定のため正規化をスキップします。");
    return text;
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await client.messages.create(
      {
        model: MODEL,
        max_tokens: estimateMaxTokens(text),
        system: SYSTEM_PROMPT,
        tools: [NORMALIZE_TOOL],
        // 必ずツールで返させ、出力を構造化して取り出す。
        tool_choice: { type: "tool", name: NORMALIZE_TOOL.name },
        messages: [
          {
            role: "user",
            content:
              "次の歯科の聞き起こしテキストを、上記の厳守事項に従って正規化し、" +
              "record_normalized_text ツールで記録してください。\n\n" +
              `---\n${text}\n---`,
          },
        ],
      },
      // SDKのリクエストタイムアウト（内部でAbortControllerを使用）。
      // 既定のリトライで実時間が延びないよう maxRetries=0 にする。
      { timeout: resolveTimeoutMs(), maxRetries: 0 }
    );

    // tool_use ブロックから input.text のみを取り出す。
    const toolUse = Array.isArray(msg.content)
      ? msg.content.find((b) => b.type === "tool_use")
      : null;
    const out = toolUse && toolUse.input ? toolUse.input.text : "";

    // 空応答はフェイルオープン（元テキストを採用）。
    if (!out || typeof out !== "string" || !out.trim()) {
      console.warn("[stt:llmNormalize] 空応答のため入力テキストを使用します。");
      return text;
    }
    return out;
  } catch (err) {
    // 本文は出さない。原因の概要のみを残す。
    console.warn("[stt:llmNormalize] 正規化に失敗したため入力テキストを使用します:", err && err.message);
    return text;
  }
}

module.exports = { normalize };
