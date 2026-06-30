const { chromium } = require("playwright-core");
const path=require("path"), fs=require("fs");
const EXE="/opt/pw-browsers/chromium-1223/chrome-linux64/chrome";
const OUT=path.join(__dirname,"sourire-shots");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:["--no-sandbox"]});
  const ctx=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2});
  const p=await ctx.newPage();
  await p.goto("http://localhost:3190",{waitUntil:"networkidle"}); await sleep(600);
  await p.locator(".nav a",{hasText:"リコール"}).click(); await sleep(400);
  // generate first patient's message
  await p.getByRole("button",{name:/AIで文面を作成/}).first().click();
  await p.locator(".reply textarea").first().waitFor({timeout:15000}); await sleep(500);
  await p.screenshot({path:path.join(OUT,"7-recall.png")});
  await b.close(); console.log("captured 7-recall.png");
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
