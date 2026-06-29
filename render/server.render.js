// Local render server: serves the vendored dentia app + stubs /api/* with
// realistic dental content, so Playwright can screenshot the REAL UI.
const express = require("express");
const path = require("path");
const app = express();
app.use(express.json({ limit: "2mb" }));

const DIR = __dirname;
app.use("/vendor", express.static(path.join(DIR, "vendor")));
app.get(["/", "/index.html"], (_req, res) =>
  res.sendFile(path.join(DIR, "index.local.html"))
);

// No Supabase → app runs in the no-login demo mode (no auth wall).
app.get("/api/config", (_req, res) =>
  res.json({ supabaseUrl: null, supabaseAnonKey: null, inviteRequired: false })
);
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Template-aware polished dental SOAP for screenshots.
const SOAPS = {
  first: {
    S: "主訴：右下の奥歯が1週間前から冷たいものでしみる。\n現病歴：3日前から症状が強くなり、甘いものでもしみるようになった。自発痛はなし。\n既往歴：特記事項なし。服薬なし。アレルギー：なし。",
    O: "#46：遠心隣接面に及ぶ深在性う蝕（C3疑い）。冷水痛(+)、甘味痛(+)、打診痛(-)、EPT生活反応(+)。\n#47：咬合面に小窩裂溝う蝕（C1）。\n口腔衛生状態：おおむね良好（PCR 18%）。歯肉に明らかな腫脹なし。\nエックス線（デンタル）：#46遠心に歯髄に近接する透過像。根尖部に明らかな透過像なし。",
    A: "#46 深在性う蝕（C3疑い）。歯髄保存の可否を要精査。\n#47 う蝕（C1）。\n※確定診断は歯科医師が行う。",
    P: "1. #46 う蝕除去・覆髄処置、症状に応じて歯髄保存を試みる（要観察）。\n2. 経過により抜髄〜根管治療へ移行の可能性を説明。\n3. #47 CR充填。\n4. TBI・PMTC、定期管理へ移行。",
  },
  counsel: {
    S: "主訴：前歯の見た目を改善したい。以前から気になっていた。\n要望：白く・自然な見た目にしたい。費用と期間も知りたい。\n既往歴：特記なし。",
    O: "#11・#21：軽度の変色とわずかな形態不調和。隣接面う蝕は認めない。\n歯周組織：PD 2〜3mm、BOP(-)、PCR 20%。\n咬合：前歯部に early contact なし。",
    A: "審美的主訴に対し、ホワイトニング／ラミネートベニア／オールセラミッククラウン等の選択肢を提示中。\n齲蝕・歯周の活動性は低く、審美治療の前提条件は概ね良好。",
    P: "1. 各選択肢のメリット・費用・期間・後戻りについて説明（情報提供）。\n2. 口腔内写真・スタディモデルで術前評価。\n3. ホワイトニング先行 →（希望に応じて）補綴的アプローチを検討。\n4. 同意取得のうえ自費治療計画を確定。",
  },
  perio: {
    S: "主訴：歯ぐきからの出血と口臭が気になる。ブラッシング時に出血する。\n経過：半年前から自覚。喫煙あり（1日10本）。",
    O: "歯周精密検査（6点法）：\n#16 PD 頬側3-2-4／舌側3-3-5、BOP(+)遠心、動揺度1\n#26 PD 頬側4-3-5／舌側3-4-6、BOP(+)頬側遠心、動揺度1\n#36・#46 にも4〜5mmの限局的ポケットを認める。\nPCR 42%（O'Leary法）。縁下歯石を臼歯部に認める。",
    A: "広汎型慢性歯周炎（中等度）の疑い。プラークコントロール不良と喫煙がリスク因子。\n※確定診断・進行度判定は歯科医師が行う。",
    P: "1. TBI（ブラッシング指導）、禁煙支援。\n2. SC・SRP（縁下）を部位ごとに実施。\n3. 再評価（4〜6週後）でPD・BOPを再検査。\n4. 安定後はSPTへ移行、リコール間隔を設定。",
  },
};
function soapFor(t) {
  return SOAPS[t] || SOAPS.first;
}
app.post("/api/generate", (req, res) => {
  const t = (req.body && req.body.template) || "first";
  // small delay so the loading state is real, then return
  setTimeout(() => res.json(soapFor(t)), 250);
});
app.post("/api/referral", (_req, res) => {
  setTimeout(
    () =>
      res.json({
        letter:
          "〇〇大学病院 口腔外科 御机下\n\n平素より大変お世話になっております。下記患者様につきまして、精査・加療をお願い申し上げます。\n\n【傷病名】#48 水平埋伏智歯\n【紹介目的】抜歯依頼\n【現病歴】右下智歯周囲の腫脹・疼痛を反復。\n【口腔内・エックス線所見】#48 近心傾斜の水平埋伏。下顎管との近接を認める。\n【既往歴・服薬】特記事項なし。\n\nお手数をおかけいたしますが、何卒よろしくお願い申し上げます。\n\n[医院名]　[歯科医師名]",
      }),
    200
  );
});
app.post("/api/transcribe", (_req, res) =>
  res.json({ text: "右下の奥歯が冷たいものでしみるんです。" })
);

const PORT = process.env.RENDER_PORT || 4599;
app.listen(PORT, () => console.log("render server on http://localhost:" + PORT));
