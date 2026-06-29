const { chromium } = require("playwright-core");
const path = require("path");
const EXE = "/opt/pw-browsers/chromium-1223/chrome-linux64/chrome";
const SRC = "file://" + path.resolve(__dirname, "..", "deck", "deck.html");
const OUT = path.resolve(__dirname, "..", "deck", "dentia-deck.pdf");

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(SRC, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const n = await page.evaluate(() => document.querySelectorAll(".slide").length);
  await page.pdf({
    path: OUT,
    width: "1280px",
    height: "720px",
    printBackground: true,
    pageRanges: "",
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });
  await browser.close();
  console.log("slides:", n, "-> PDF:", OUT);
})().catch((e) => { console.error("PDF ERR:", e.message); process.exit(1); });
