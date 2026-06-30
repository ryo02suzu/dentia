const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");
const EXE = "/opt/pw-browsers/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:" + (process.env.RENDER_PORT || 4599);
const OUT = path.join(__dirname, "shots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CONVO_PERIO =
  "患者）歯ぐきから血が出て、口臭も気になります。歯みがきのときに毎回出血します。\n" +
  "歯科医師）本日は歯周精密検査です。全顎を6点法で計測していきますね。\n" +
  "#16、頬側 近心3・中央2・遠心4、舌側 3・3・5、遠心にBOP陽性、動揺度1。\n" +
  "#17、頬側 3・3・4、舌側 3・2・3、BOP陽性。\n" +
  "#26、頬側 4・3・5、舌側 3・4・6、頬側遠心にBOP、動揺度1。\n" +
  "#27、頬側 3・4・5、舌側 4・3・4。……（全顎を同様に計測）\n" +
  "歯科医師）PCRは42%。臼歯部に縁下歯石を認めます。喫煙は1日10本くらいですね。";

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.locator("#root").waitFor();
  await sleep(600);
  await page.getByRole("button", { name: /手入力/ }).click();
  // select template FIRST (selecting a chip resets the textarea), then fill
  await page.getByRole("button", { name: /歯周精密検査/ }).click();
  await sleep(200);
  await page.locator("#convo").fill(CONVO_PERIO);
  await page.locator("#convo").evaluate((el) => { el.scrollTop = 0; el.blur(); });
  await sleep(150);
  await page.getByRole("button", { name: /のSOAPを生成|SOAPを生成/ }).first().click();
  await page.getByRole("button", { name: /QRで転記/ }).waitFor({ timeout: 15000 });
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT, "09-perio.png") });

  // clean crop of just the result column (right half)
  await page.screenshot({
    path: path.join(OUT, "10-result-crop.png"),
    clip: { x: 740, y: 0, width: 700, height: 900 },
  });
  await ctx.close();
  await browser.close();
  console.log("captured 09-perio.png, 10-result-crop.png");
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
