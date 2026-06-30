const { chromium } = require("playwright-core");
const path = require("path");
const EXE = "/opt/pw-browsers/chromium-1223/chrome-linux64/chrome";
const SRC = "file://" + path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.goto(SRC, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const n = await p.evaluate(() => document.querySelectorAll(".s").length);
  await p.pdf({ path: OUT, width: "1280px", height: "720px", printBackground: true,
    margin: { top:"0", bottom:"0", left:"0", right:"0" } });
  await b.close();
  console.log("slides:", n, "->", OUT);
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
