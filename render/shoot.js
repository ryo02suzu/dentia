// Drive the REAL dentia UI in chromium and capture screenshots for the deck.
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const EXE = "/opt/pw-browsers/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:" + (process.env.RENDER_PORT || 4599);
const OUT = path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });

const CONVO_FIRST =
  "歯科医師）こんにちは、今日はどうされましたか。\n" +
  "患者）右下の奥歯が、1週間くらい前から冷たいものでしみるんです。\n" +
  "歯科医師）いつ頃から強くなりましたか。甘いものはどうですか。\n" +
  "患者）3日前くらいから強くなって、甘いものでもしみます。何もしなくても痛むことはないです。\n" +
  "歯科医師）右下の6番ですね。冷たい水をかけますね……しみますか。\n" +
  "患者）はい、しみます。\n" +
  "歯科医師）打診痛はなさそうですね。神経が生きているか、電気歯髄診（EPT）も確認します……反応はありますね（生活反応あり）。\n" +
  "歯科医師）レントゲンを撮りましょう。深い虫歯が神経に近そうです。";

const CONVO_COUNSEL =
  "患者）前歯の見た目を、もう少し白く自然にしたいんです。前から気になっていて。\n" +
  "歯科医師）費用と期間も含めてご説明しますね。今は虫歯や歯周病の問題は大きくありません。\n" +
  "患者）ホワイトニングとセラミック、どちらがいいか迷っています。後戻りも心配で。\n" +
  "歯科医師）それぞれの利点と注意点、お写真と模型で確認しながら一緒に決めましょう。";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fillAndGenerate(page, convo) {
  // switch to 手入力 (paste) tab
  await page.getByRole("button", { name: /手入力/ }).click();
  const ta = page.locator("#convo");
  await ta.click();
  await ta.fill(convo);
  await ta.evaluate((el) => { el.scrollTop = 0; el.blur(); }); // 先頭から見せる
  await sleep(150);
}

async function generate(page) {
  await page.getByRole("button", { name: /のSOAPを生成|SOAPを生成/ }).first().click();
  // wait for result action bar (phase done)
  await page.getByRole("button", { name: /QRで転記/ }).waitFor({ timeout: 15000 });
  await sleep(1200); // let reduced-motion fill settle
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });

  // ---------- DESKTOP ----------
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") console.log("PAGE ERR:", m.text()); });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.locator("#root").waitFor();
  await page.getByText("診療の会話を貼り付け", { exact: false }).waitFor({ timeout: 15000 }).catch(() => {});
  await sleep(800);

  // 1) record (主たる入力) screen — default inputMode is "record"
  await page.screenshot({ path: path.join(OUT, "01-record.png") });

  // 2) input filled (手入力)
  await fillAndGenerate(page, CONVO_FIRST);
  await page.screenshot({ path: path.join(OUT, "02-input.png") });

  // 3) result (初診)
  await generate(page);
  await page.screenshot({ path: path.join(OUT, "03-result.png") });

  // 4) QR modal
  await page.getByRole("button", { name: /QRで転記/ }).click();
  await sleep(900);
  await page.screenshot({ path: path.join(OUT, "04-qr.png") });
  await page.keyboard.press("Escape").catch(() => {});
  // close modal by clicking 閉じる if present
  await page.getByRole("button", { name: /閉じる/ }).first().click().catch(() => {});
  await sleep(400);

  // 5) referral modal
  await page.getByRole("button", { name: /紹介状/ }).click();
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT, "05-referral.png") });
  await page.getByRole("button", { name: /閉じる/ }).first().click().catch(() => {});
  await sleep(300);

  await ctx.close();

  // ---------- MOBILE (iPhone-ish) ----------
  const m = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const mp = await m.newPage();
  await mp.goto(BASE, { waitUntil: "networkidle" });
  await mp.locator("#root").waitFor();
  await sleep(800);
  await mp.screenshot({ path: path.join(OUT, "06-mobile-record.png") });
  // fill + generate on mobile
  await mp.getByRole("button", { name: /手入力/ }).click();
  await mp.locator("#convo").fill(CONVO_FIRST);
  await mp.locator("#convo").evaluate((el) => { el.scrollTop = 0; el.blur(); });
  await sleep(200);
  await mp.screenshot({ path: path.join(OUT, "07-mobile-input.png") });
  await mp.getByRole("button", { name: /のSOAPを生成|SOAPを生成/ }).first().click();
  await mp.getByRole("button", { name: /QRで転記/ }).waitFor({ timeout: 15000 });
  await sleep(1200);
  await mp.screenshot({ path: path.join(OUT, "08-mobile-result.png"), fullPage: false });
  await m.close();

  await browser.close();
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".png"));
  console.log("CAPTURED:", files.join(", "));
  for (const f of files) {
    const sz = fs.statSync(path.join(OUT, f)).size;
    console.log(`  ${f}: ${(sz / 1024).toFixed(0)} KB`);
  }
})().catch((e) => { console.error("SHOOT ERROR:", e.message); process.exit(1); });
