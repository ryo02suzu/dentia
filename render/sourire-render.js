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
app.listen(3190,()=>console.log("sourire-render on 3190"));
