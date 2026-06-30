const { chromium } = require("playwright-core");
const path=require("path"), fs=require("fs");
const EXE="/opt/pw-browsers/chromium-1223/chrome-linux64/chrome";
const BASE="http://localhost:3190";
const OUT=path.join(__dirname,"sourire-shots"); fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:["--no-sandbox"]});
  const ctx=await b.newContext({viewport:{width:1280,height:860},deviceScaleFactor:2});
  const p=await ctx.newPage();
  p.on("console",m=>{if(m.type()==="error")console.log("ERR:",m.text());});
  await p.goto(BASE,{waitUntil:"networkidle"}); await sleep(700);
  await p.screenshot({path:path.join(OUT,"1-dash.png")});
  // 口コミ tab
  await p.locator(".nav a",{hasText:"口コミ管理"}).click(); await sleep(400);
  // generate AI reply on first review
  await p.getByRole("button",{name:/AIで返信案を作成/}).first().click();
  await p.locator(".reply textarea").first().waitFor({timeout:15000}); await sleep(500);
  await p.screenshot({path:path.join(OUT,"2-reviews.png")});
  // MEO tab
  await p.locator(".nav a",{hasText:"MEO投稿"}).click(); await sleep(400);
  await p.getByRole("button",{name:/AIで投稿文を作成/}).click();
  await p.locator(".gen-out textarea").waitFor({timeout:15000}); await sleep(500);
  await p.screenshot({path:path.join(OUT,"3-meo.png")});
  // star tab
  await p.locator(".nav a",{hasText:"を増やす"}).click(); await sleep(700);
  await p.screenshot({path:path.join(OUT,"4-getstars.png")});
  await p.locator(".nav a",{hasText:"設定"}).click(); await sleep(500);
  await p.screenshot({path:path.join(OUT,"6-settings.png")});
  // mobile dashboard
  await ctx.close();
  const m=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true});
  const mp=await m.newPage(); await mp.goto(BASE,{waitUntil:"networkidle"}); await sleep(600);
  await mp.screenshot({path:path.join(OUT,"5-mobile.png")});
  await b.close();
  console.log("shots:",fs.readdirSync(OUT).join(", "));
})().catch(e=>{console.error("SHOOT ERR",e.message);process.exit(1);});
