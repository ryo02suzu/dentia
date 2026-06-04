/**
 * dentia — 会話 → 歯科SOAP生成 用の軽量バックエンド
 *
 * - 静的フロント（index.html）を配信
 * - POST /api/generate で会話テキストを Anthropic Claude API に送り、
 *   歯科SOAP（S / O / A / P）の下書きを生成して返す
 *
 * APIキーは .env の ANTHROPIC_API_KEY で管理（直書き禁止）。
 */

require("dotenv").config();

const path = require("path");
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-sonnet-4-20250514";
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

/* ------------------------------------------------------------------ *
 * テンプレート（処置別）ごとの追加プロンプト
 * ------------------------------------------------------------------ */
const TEMPLATES = {
  first: {
    label: "初診",
    guide:
      "初診の診療録として整理する。主訴の発症時期・経過・誘発因子・性状を問診として丁寧にまとめ、" +
      "Oでは初診時に行う基本的な口腔内診査（視診・う蝕/歯周の所見、必要に応じたデンタルX-P・口腔内写真）に触れる。",
  },
  recall: {
    label: "再診",
    guide:
      "再診（前回処置後の経過観察）として整理する。Sでは前回からの症状の変化・推移を中心に記載し、" +
      "Oでは前回処置部位の状態（仮封・咬合・打診痛など）を確認する観点でまとめる。",
  },
  spt: {
    label: "メンテナンス(SPT)",
    guide:
      "歯周病安定期治療（SPT）の診療録として整理する。Oでは PCR・プロービングデプス・BOP・歯石沈着などの" +
      "歯周検査所見を重視し、Aでは歯周組織の安定性を評価、Pでは SPT の継続・再SRP・TBI・リコール間隔を計画する。",
  },
  pros: {
    label: "補綴",
    guide:
      "補綴処置の診療録として整理する。Oでは支台歯の状態・二次う蝕の有無・補綴物の適合/脱離・対合関係・咬合を、" +
      "Pでは支台歯形成・印象採得・補綴物製作・装着（セット）といった補綴ステップを計画する。",
  },
  endo: {
    label: "根管治療",
    guide:
      "根管治療（歯内療法）の診療録として整理する。Oでは歯髄・根尖部の状態（EPT反応・打診痛・根尖部圧痛・" +
      "デンタルX-Pでの根尖部透過像など）を重視し、Pでは抜髄/感染根管治療・根管長測定(EMR)・拡大洗浄・根管貼薬・" +
      "根管充填(RCF)といったステップを計画する。",
  },
};

/* ------------------------------------------------------------------ *
 * 共通システムプロンプト
 * ------------------------------------------------------------------ */
function buildSystemPrompt(templateId) {
  const tmpl = TEMPLATES[templateId] || TEMPLATES.first;
  return `あなたは日本の歯科診療を支援するAIアシスタントです。歯科医師と患者の診療会話から、歯科のSOAP形式カルテ「下書き」を作成します。

# 出力するSOAPの定義
- S（Subjective・主訴/問診）: 患者の訴え・主訴、症状の発症時期・経過・性状・誘発因子などの問診内容。
- O（Objective・口腔内所見）: 視診・触診・各種検査による客観的所見。
- A（Assessment・評価/診断）: 所見にもとづく評価・診断の見立て。
- P（Plan・治療計画）: 今後の処置・検査・指導・次回予定などの計画。

# 今回のテンプレート: ${tmpl.label}
${tmpl.guide}

# 歯科記載のルール
- 歯式は FDI/部位表記（例: #46, #36）で適切に用いる。
- 歯科検査の用語を適切に使う: 冷水痛・温水痛・打診痛・自発痛・EPT（電気歯髄診）・プロービング(PD)・BOP・PCR 等。所見の有無は (+)/(-)/(±) で簡潔に表す。
- 歯科処置の用語を適切に使う: う蝕(C1〜C4)・抜髄・感染根管治療・根管充填(RCF)・SRP・スケーリング・PMTC・補綴(FMC/クラウン/インレー)・支台築造 等。
- カルテらしい簡潔な体言止め・箇条書き調の日本語で記載する。

# 重要な制約
- A（評価・診断）は確定診断ではなく、最終的に歯科医師が確定する前提の「下書き・見立て」である。断定を避け、「〜の可能性」「〜を疑う」「〜を鑑別中」「要精査」等の表現を用いる。
- 会話に存在しない検査値や所見を創作しない。会話から読み取れない項目は無理に埋めず、「会話からは確認できず」等と記すか、簡潔にとどめる。
- 補足メモ（既往歴・アレルギー等）が与えられた場合は、関連する箇所（特に O / A / P）に適切に反映する。
- 各セクションは要点を絞り、冗長にしない。`;
}

/* ------------------------------------------------------------------ *
 * 構造化出力用ツール（S/O/A/P を確実に分けて受け取る）
 * ------------------------------------------------------------------ */
const SOAP_TOOL = {
  name: "record_dental_soap",
  description: "歯科SOAPカルテの下書きを S / O / A / P の4項目で記録する。",
  input_schema: {
    type: "object",
    properties: {
      S: { type: "string", description: "主訴・問診（Subjective）" },
      O: { type: "string", description: "口腔内所見（Objective）" },
      A: {
        type: "string",
        description:
          "評価・診断（Assessment）。歯科医師が確定する前提の下書きであり、断定を避けた表現にする。",
      },
      P: { type: "string", description: "治療計画（Plan）" },
    },
    required: ["S", "O", "A", "P"],
  },
};

/* ------------------------------------------------------------------ *
 * 生成エンドポイント
 * ------------------------------------------------------------------ */
app.post("/api/generate", async (req, res) => {
  const { conversation, memo, template } = req.body || {};

  if (!conversation || !conversation.trim()) {
    return res.status(400).json({ error: "会話テキストが空です。" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error:
        "APIキーが設定されていません。.env に ANTHROPIC_API_KEY を設定してください（.env.example を参照）。",
    });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userContent =
    `# 診療の会話\n${conversation.trim()}\n\n` +
    (memo && memo.trim()
      ? `# 補足メモ（既往歴・アレルギー等）\n${memo.trim()}\n\n`
      : "") +
    `上記の会話から、歯科のSOAPカルテ下書きを作成し、record_dental_soap ツールで記録してください。`;

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: buildSystemPrompt(template),
      tools: [SOAP_TOOL],
      tool_choice: { type: "tool", name: SOAP_TOOL.name },
      messages: [{ role: "user", content: userContent }],
    });

    const toolUse = msg.content.find((b) => b.type === "tool_use");
    if (!toolUse || !toolUse.input) {
      return res
        .status(502)
        .json({ error: "AIから有効な結果を取得できませんでした。" });
    }

    const { S = "", O = "", A = "", P = "" } = toolUse.input;
    return res.json({ S, O, A, P });
  } catch (err) {
    console.error("[generate] error:", err);
    const status = err.status || 500;
    const message =
      err.status === 401
        ? "APIキーが無効です。.env の ANTHROPIC_API_KEY を確認してください。"
        : err.message || "生成中にエラーが発生しました。";
    return res.status(status).json({ error: message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, hasKey: !!process.env.ANTHROPIC_API_KEY });
});

app.listen(PORT, () => {
  console.log(`dentia server: http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "⚠️  ANTHROPIC_API_KEY が未設定です。.env を作成して設定してください（.env.example を参照）。"
    );
  }
});
