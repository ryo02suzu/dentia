const express=require("express"), path=require("path");
const app=express(); app.use(express.json());
const DIR=path.join(__dirname,"..","sourire");
app.use("/vendor", express.static(path.join(__dirname,"vendor")));
app.get(["/","/index.html"],(_q,r)=>r.sendFile(path.join(DIR,"index.local.html")));
app.post("/api/reply",(req,res)=>{
  const low=(req.body.rating||5)<=2;
  const t = low
    ? "この度はお待たせしてしまい、大変申し訳ございませんでした。ご予約いただいたのにお時間を取らせてしまった点、真摯に受け止めております。受付・診療の流れを見直してまいります。よろしければ一度、直接お話を伺えますと幸いです。ご来院ありがとうございました。"
    : "この度はご来院、そしてあたたかい口コミをありがとうございます。安心して受けていただけたとのお言葉、スタッフ一同とても励みになります。これからも分かりやすいご説明を心がけてまいります。またお変わりありましたら、どうぞお気軽にご相談ください。";
  setTimeout(()=>res.json({text:t}),300);
});
app.post("/api/post",(req,res)=>{
  const t="【定期検診で、お口の健康を守りましょう】\nこんにちは、横浜市港北区のさくら歯科クリニックです。むし歯や歯周病は、痛みが出る前の“早めのチェック”が大切です。定期的な検診とクリーニングで、ご自身の歯を長く健やかに保つお手伝いをいたします。お忙しい方も、まずはお口の状態を知ることから始めてみませんか。ご予約・ご相談はお気軽にどうぞ。";
  setTimeout(()=>res.json({text:t}),300);
});
app.post("/api/recall",(req,res)=>{
  const ch=(req.body.channel||"SMS");
  const nm=(req.body.name||"患者").split(" ")[0];
  const t = ch==="はがき"
    ? nm+"様 いつもお世話になっております。さくら歯科クリニックです。前回のご来院から少しお時間が経ちましたが、お変わりございませんか。お口の健康は定期的なチェックで守れます。ぜひ一度、検診にいらしてください。ご予約はお電話またはWebから承っております。スタッフ一同お待ちしております。"
    : nm+"様 さくら歯科です。お変わりないですか？前回から少し時間が空きましたので、定期検診のご案内です。早めのチェックで予防につながります。ご都合のよい時にご予約お待ちしています（お電話/LINEから）。";
  setTimeout(()=>res.json({text:t}),300);
});
app.listen(3190,()=>console.log("sourire-render on 3190"));
