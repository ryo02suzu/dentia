/* ------------------------------------------------------------------ *
 * Sourire — 歯科の口コミ・MEO 集患を AI で自動運用するシステム（試作）
 *   by Sourirette
 *   レセコン/電子カルテ連携は不要。医院の「Google という公開資産」だけを扱う。
 *   本番は Google ビジネスプロフィール API 接続（要・利用申請）。
 *   この試作は AI 生成（口コミ返信・MEO投稿）の中核を実際に動かす。
 * ------------------------------------------------------------------ */
"use strict";
require("dotenv").config();
const express = require("express");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3100;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

app.use(express.json({ limit: "1mb" }));

// 基本セキュリティヘッダ
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// 簡易レート制限（試作用・インメモリ）
const rl = new Map();
app.use("/api/", (req, res, next) => {
  const k = req.ip || "x";
  const now = Date.now();
  const arr = (rl.get(k) || []).filter((t) => now - t < 60000);
  if (arr.length >= 40)
    return res.status(429).json({ error: "アクセスが集中しています。少し待ってお試しください。" });
  arr.push(now);
  rl.set(k, arr);
  next();
});

/* ---- プロンプト（医療広告ガイドライン・ステマ規制に配慮） ---- */
const REPLY_SYSTEM = `あなたは日本の歯科医院の受付・広報担当として、Googleの口コミに対する医院からの返信文を作成します。
# 必ず守る制約
- 治療効果を断定しない（「治る」「No.1」「必ず」等の誇大・比較優良表現は使わない＝医療広告ガイドライン）。
- 病名・具体的な治療内容など、個人が特定され得る情報は書かない（プライバシー）。
- 来院・投稿へのお礼を中心に、温かく丁寧に。2〜4文、120〜180字程度。
- 低評価（★1〜2）には、不快な思いをさせたお詫び＋改善する姿勢＋「直接お話を伺いたい」旨を、言い訳せず誠実に。
- 絵文字は控えめ（0〜1個）。署名や定型すぎる表現は避け、口コミの内容に一言触れて個別感を出す。
本文のみを出力し、前置きや説明は付けない。`;

const POST_SYSTEM = `あなたは歯科医院の広報担当として、Googleビジネスプロフィール（Google マップ）の投稿文を作成します。
# 必ず守る制約
- 250〜400字。患者目線でやさしく、専門用語は噛み砕く。
- 医療広告ガイドラインに配慮（治療効果の断定・体験談・比較優良・誇大はNG）。
- 最後に自然な行動喚起（ご予約／お気軽にご相談／定期検診を 等）を1文。
- 地域名を1回入れる（MEO対策）。ハッシュタグ・絵文字は控えめ。
本文のみを出力し、前置きや説明は付けない。`;

function client() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/* ---- 口コミ返信の生成 ---- */
app.post("/api/reply", async (req, res) => {
  const { review, rating, clinic, area } = req.body || {};
  if (!review || !String(review).trim())
    return res.status(400).json({ error: "口コミ本文がありません。" });
  const c = client();
  if (!c) return res.status(500).json({ error: "ANTHROPIC_API_KEY が未設定です。" });
  const user =
    `# 医院名\n${clinic || "（医院名）"}（${area || "地域"}）\n` +
    `# 口コミ（★${rating || "?"}）\n${String(review).trim()}\n\n` +
    `上記の口コミに対する、医院からの返信文を作成してください。`;
  try {
    const m = await c.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: REPLY_SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    const t = (m.content.find((b) => b.type === "text") || {}).text || "";
    return res.json({ text: t.trim() });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "生成に失敗しました。" });
  }
});

/* ---- MEO 投稿の生成 ---- */
app.post("/api/post", async (req, res) => {
  const { theme, clinic, area } = req.body || {};
  if (!theme) return res.status(400).json({ error: "テーマがありません。" });
  const c = client();
  if (!c) return res.status(500).json({ error: "ANTHROPIC_API_KEY が未設定です。" });
  const user =
    `# 医院名\n${clinic || "（医院名）"}（${area || "地域"}）\n# 投稿テーマ\n${theme}\n\n` +
    `上記テーマで Google ビジネスプロフィール用の投稿文を1本作成してください。`;
  try {
    const m = await c.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: POST_SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    const t = (m.content.find((b) => b.type === "text") || {}).text || "";
    return res.json({ text: t.trim() });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "生成に失敗しました。" });
  }
});

/* ---- リコール（離脱・未来院患者の掘り起こし）文面の生成 ---- */
const RECALL_SYSTEM = `あなたは日本の歯科医院の受付担当として、しばらく来院がない患者さんへ、定期検診・メンテナンスの再来院をうながす短いメッセージを作成します。
# 必ず守る制約
- 押し付けがましくしない。「お変わりないですか」等の気づかい＋「定期的なチェックが予防になります」＋「ご予約お待ちしています」を基本構成に。
- 不安を煽らない／治療効果を断定しない（医療広告ガイドライン配慮）。病名や具体的治療内容は書かない。
- 前回の処置内容・経過期間に自然に触れて個別感を出す（例：定期検診から/詰め物の経過/歯周のメンテ/お子さまのフッ素）。
- 媒体に合わせる：SMSは70字前後、LINEは120字前後、はがきは少し丁寧に150字前後。
- 予約方法を1つ入れる（電話／LINE／Web）。医院名と一言の温かさ。
本文のみを出力し、前置きや説明は付けない。`;

app.post("/api/recall", async (req, res) => {
  const { name, months, last, category, channel, clinic } = req.body || {};
  const c = client();
  if (!c) return res.status(500).json({ error: "ANTHROPIC_API_KEY が未設定です。" });
  const user =
    `# 医院名\n${clinic || "（医院名）"}\n` +
    `# 患者さん\nお名前：${name || "（患者名）"} 様\n最終来院：約${months || "?"}ヶ月前\n前回の内容：${last || "不明"}\n区分：${category || ""}\n` +
    `# 媒体\n${channel || "SMS"}\n\n` +
    `上記の患者さんへ送る、再来院をうながすメッセージを作成してください。`;
  try {
    const m = await c.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: RECALL_SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    const t = (m.content.find((b) => b.type === "text") || {}).text || "";
    return res.json({ text: t.trim() });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "生成に失敗しました。" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// 静的配信は index.html のみ
app.get(["/", "/index.html"], (_req, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

app.listen(PORT, () => console.log(`Sourire on http://localhost:${PORT}`));
