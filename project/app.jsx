/* dentia — 歯科専用AIカルテ下書き生成（デモ用プロトタイプ） */
const { useState, useRef, useEffect, useCallback } = React;

/* ---------- color themes (teal cool family) ---------- */
const THEMES = {
  clear: { label:"クリアティール", vars:{
    "--primary":"#0E9AA7","--primary-dark":"#0B7C87","--primary-deep":"#0A5E68",
    "--primary-tint":"#E8F6F7","--primary-soft":"#D4ECEE","--bg":"#F2F7F8" } },
  deep: { label:"ディープティール", vars:{
    "--primary":"#127C86","--primary-dark":"#0B5C66","--primary-deep":"#083F47",
    "--primary-tint":"#E6F1F2","--primary-soft":"#CADFE2","--bg":"#EEF3F4" } },
  azure: { label:"ティール×ブルー", vars:{
    "--primary":"#1496BD","--primary-dark":"#0F77A0","--primary-deep":"#0B5A7C",
    "--primary-tint":"#E7F4F9","--primary-soft":"#CDE8F1","--bg":"#F1F7FA" } },
};

/* ---------- SOAP block meta (constant) ---------- */
const BLOCKS = [
  { key:"S", en:"Subjective", jp:"主訴・問診", color:"#0E9AA7", deep:"#0A6B73", tint:"rgba(14,154,167,.13)" },
  { key:"O", en:"Objective",  jp:"口腔内所見", color:"#3A7FC4", deep:"#2C5F94", tint:"rgba(58,127,196,.13)" },
  { key:"A", en:"Assessment", jp:"評価・診断", color:"#5E6BC4", deep:"#454F96", tint:"rgba(94,107,196,.13)" },
  { key:"P", en:"Plan",       jp:"治療計画",   color:"#2BA17A", deep:"#1F7A5C", tint:"rgba(43,161,122,.13)" },
];

/* ---------- 処置別テンプレート ---------- */
const TEMPLATES = [
  { id:"first",  label:"初診",            tag:"First",  time:"4.2" },
  { id:"recall", label:"再診",            tag:"Recall", time:"3.6" },
  { id:"spt",    label:"メンテナンス(SPT)", tag:"SPT",    time:"3.9" },
  { id:"pros",   label:"補綴",            tag:"Pros",   time:"4.0" },
  { id:"endo",   label:"根管治療",         tag:"Endo",   time:"4.4" },
];

/* per-template SOAP text [S,O,A,P] + sample conversation */
const DATA = {
  first: {
    convo:`医師：今日はどうされましたか？
患者：3日前から右下の奥歯が、冷たいものを飲むとしみるんです。
医師：温かいものはいかがですか？
患者：温かいのは平気です。じっとしているとズキズキする痛みはないですね。
医師：しみるのは何秒くらい続きますか？
患者：すぐ治まります。でも食事のたびに気になって。
医師：わかりました。では右下を拝見しますね。`,
    soap:[
      "右下の奥歯が冷たいものでしみる、3日前から。温かいものは平気で、自発痛なし。食事中にしみて気になるとのこと。",
      "#46に深在性う蝕を認める。冷水痛(+)、打診痛(-)、根尖部圧痛(-)。EPTで生活反応(+)。歯肉に発赤・腫脹なし。",
      "#46 C3疑い、急性歯髄炎の可能性。冷水痛陽性・打診痛陰性より、可逆性〜不可逆性歯髄炎を鑑別中。",
      "#46 抜髄処置を検討。本日は鎮痛・経過観察とし、次回より根管治療を予定。デンタルX-P・口腔内写真を記録、治療方針を説明し同意取得。",
    ],
  },
  recall: {
    convo:`医師：その後、右下の歯の調子はいかがですか？
患者：前回治療してもらってから、痛みはだいぶ楽になりました。
医師：噛んだときの違和感はありますか？
患者：少しだけ、噛むと変な感じが残っています。
医師：わかりました。お薬を詰めた部分を確認しますね。`,
    soap:[
      "前回の根管治療後、#46の痛みは軽減。咬合時の違和感が少し残るが、自発痛・冷温水痛はなし。",
      "#46 仮封（テック）脱離なし。打診痛(±)、根管内排膿(-)、根尖部圧痛(-)。歯肉腫脹なし。",
      "#46 根管治療の経過良好。根尖部炎症は軽快傾向で、根管充填へ移行可能と判断。",
      "#46 根管貼薬を継続し、次回 根管充填(RCF)を予定。経過良好であれば支台築造のうえ補綴へ移行。",
    ],
  },
  spt: {
    convo:`医師：本日は定期メンテナンスですね。気になるところはありますか？
患者：特に痛みはないですが、歯磨きのとき時々血が出ます。
医師：では歯ぐきの状態を検査して、お掃除していきますね。
患者：お願いします。`,
    soap:[
      "定期メンテナンスで来院。自覚的な痛みはなし。ブラッシング時の出血が時々あるとのこと。",
      "全顎PCR 18%。プロービングで#16近心・#36遠心に4mm以上のポケット残存、BOP(+)部位散在。縁下歯石の軽度沈着あり。",
      "歯周組織は概ね安定。SPT（サポーティブペリオドンタルセラピー）の継続が妥当。残存ポケット部に限局的な再SRPを検討。",
      "スケーリング・PMTCを実施。#16・#36にSRP予定。TBI（ブラッシング指導）を強化し、次回は3ヶ月後にリコール設定。",
    ],
  },
  pros: {
    convo:`医師：今日はどうされましたか？
患者：右下にかぶせていた銀歯が、昨日食事中に取れてしまって。
医師：痛みはありますか？
患者：痛みはないんですが、噛みにくくて困っています。
医師：では取れた部分を確認しますね。`,
    soap:[
      "右下のクラウンが脱離した主訴で来院。自発痛・冷温水痛はないが咬みにくいとのこと。",
      "#46 旧FMC脱離。支台歯に二次う蝕(-)、マージン適合不良を認める。対合歯の挺出なし、咬合関係は保たれている。",
      "#46 補綴物脱離。支台歯は保存可能で、再補綴の適応と判断。",
      "#46 支台歯形成・印象採得を行い、フルジルコニアクラウンを製作。次回セット予定、咬合・コンタクトを確認。",
    ],
  },
  endo: {
    convo:`医師：今日はどうされましたか？
患者：左下の奥歯がズキズキ痛くて、昨夜は眠れませんでした。
医師：温かいものでも痛みますか？
患者：はい、夜になると特にうずきます。痛み止めを飲んでいます。
医師：では神経の状態を調べますね。`,
    soap:[
      "#36の自発痛・咬合痛で来院。夜間痛あり、鎮痛剤を服用中。温熱刺激で疼痛増強の訴え。",
      "#36 打診痛(+)、根尖部圧痛(+)。EPT反応(-)で失活歯。デンタルX-Pで根尖部に透過像を認める。",
      "#36 急性根尖性歯周炎、失活歯。感染根管治療の適応。",
      "#36 感染根管治療を開始。根管長測定(EMR)後、機械的・化学的拡大洗浄を実施。次回 根管貼薬を予定、消炎を確認。",
    ],
  },
};

/* ---------- icons ---------- */
const Ico = {
  tooth:(p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3.2c-2.1-1.6-4.6-1.6-6 0-1.6 1.8-1.3 5 .1 9.1.6 1.8.8 3.6 1 5.2.2 1.6.4 3 1.4 3 1.1 0 1.2-1.6 1.5-3.2.1-.7.6-1.2 1-1.2s.9.5 1 1.2c.3 1.6.4 3.2 1.5 3.2 1 0 1.2-1.4 1.4-3 .2-1.6.4-3.4 1-5.2 1.4-4.1 1.7-7.3.1-9.1-1.4-1.6-3.9-1.6-6 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>),
  spark:(p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3.5l1.7 4.6 4.8 1.7-4.8 1.7L12 16.1l-1.7-4.6-4.8-1.7 4.8-1.7L12 3.5Z" fill="currentColor"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" fill="currentColor" opacity=".85"/></svg>),
  copy:(p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="8.5" y="8.5" width="11" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.7"/><path d="M5.5 15.5h-1A1.5 1.5 0 0 1 3 14V4.5A1.5 1.5 0 0 1 4.5 3H14a1.5 1.5 0 0 1 1.5 1.5v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>),
  link:(p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9.5 14.5l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M13 7l1.2-1.2a3.4 3.4 0 0 1 4.8 4.8L17.8 11.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M11 17l-1.2 1.2a3.4 3.4 0 0 1-4.8-4.8L6.2 12.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  lock:(p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" stroke="currentColor" strokeWidth="1.7"/><path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" stroke="currentColor" strokeWidth="1.7"/></svg>),
  check:(p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  doc:(p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M6 3h7.5L19 8.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M13 3v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M8.5 13h7M8.5 16.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  pen:(p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 20h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M6 14.5l8-8 3 3-8 8H6v-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>),
  mic:(p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M6 11a6 6 0 0 0 12 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 17v4M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  clock:(p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  layers:(p)=>(<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3.5l8.5 4.2-8.5 4.2-8.5-4.2L12 3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>),
};

const fmtTime = (s)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const WAVE_H = [16,30,22,38,26,34,18,30,24,40,20,32,16,28,22,36,24,30,18,34,26,38,20,30,16];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme":"clear",
  "fontScale":16,
  "density":"ゆったり"
}/*EDITMODE-END*/;

function App(){
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const PRINT = typeof window!=="undefined" && window.__PRINT__;

  const [tmpl, setTmpl] = useState("first");
  const [convo, setConvo] = useState(DATA.first.convo);
  const [memo, setMemo] = useState("");
  const [inputMode, setInputMode] = useState("paste"); // paste | record
  const [recState, setRecState] = useState("idle");    // idle | recording | transcribing
  const [recSec, setRecSec] = useState(0);

  const [phase, setPhase] = useState(PRINT?"done":"idle"); // idle | loading | done
  const [revealed, setRevealed] = useState(PRINT?BLOCKS.length-1:-1);
  const [typed, setTyped] = useState(PRINT?DATA.first.soap:["","","",""]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [genTime, setGenTime] = useState(PRINT?"4.2":null);
  const [toast, setToast] = useState(null);

  const timers = useRef([]);
  const recTimer = useRef(null);
  const dataRef = useRef(DATA.first);

  /* theme + scale */
  useEffect(()=>{
    const th = THEMES[t.theme] || THEMES.clear;
    Object.entries(th.vars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
    document.documentElement.style.setProperty("--header-grad-a", th.vars["--primary"]);
    document.documentElement.style.setProperty("--header-grad-b", th.vars["--primary-dark"]);
  },[t.theme]);
  useEffect(()=>{
    document.documentElement.style.setProperty("--fs", (t.fontScale||16)+"px");
    document.documentElement.style.setProperty("--pad-scale", t.density==="コンパクト"?"0.78":t.density==="標準"?"0.9":"1");
  },[t.fontScale, t.density]);

  const clearTimers = ()=>{ timers.current.forEach(clearTimeout); timers.current=[]; };
  useEffect(()=>()=>{ clearTimers(); clearInterval(recTimer.current); },[]);
  const push = (fn,ms)=>timers.current.push(setTimeout(fn,ms));

  const showToast = (msg)=>{ setToast(msg); push(()=>setToast(null), 2000); };

  /* switch template → swap sample conversation + reset result */
  const pickTemplate = (id)=>{
    setTmpl(id);
    setConvo(DATA[id].convo);
    setPhase("idle"); setGenTime(null); setRevealed(-1); setActiveIdx(-1); setTyped(["","","",""]);
    clearTimers();
  };

  /* ---------- record flow (visual only) ---------- */
  const toggleRecord = ()=>{
    if(recState==="idle"){
      setRecState("recording"); setRecSec(0);
      recTimer.current = setInterval(()=>setRecSec(s=>s+1), 1000);
    } else if(recState==="recording"){
      clearInterval(recTimer.current);
      setRecState("transcribing");
      push(()=>{
        setConvo(dataRef.current.convo);
        setRecState("idle");
        setInputMode("paste");
        showToast("文字起こしが完了しました");
      }, 2100);
    }
  };
  useEffect(()=>{ dataRef.current = DATA[tmpl]; },[tmpl]);

  /* ---------- generation ---------- */
  const runGeneration = useCallback(()=>{
    clearTimers();
    setInputMode("paste");
    setPhase("loading"); setGenTime(null);
    setRevealed(-1); setActiveIdx(-1); setTyped(["","","",""]);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const soap = dataRef.current.soap;
    const tinfo = TEMPLATES.find(x=>x.id===tmpl);

    push(()=>{
      setPhase("done");
      setGenTime(tinfo? tinfo.time : "4.2");
      streamBlock(0);
    }, reduce?400:1700);

    function streamBlock(i){
      if(i>=BLOCKS.length){ setActiveIdx(-1); return; }
      setRevealed(i); setActiveIdx(i);
      const full = soap[i];
      if(reduce){
        setTyped(prev=>{ const n=[...prev]; n[i]=full; return n; });
        push(()=>streamBlock(i+1), 200);
        return;
      }
      let c=0;
      const step = ()=>{
        c += (full.length>60?2:1);
        if(c>full.length) c=full.length;
        setTyped(prev=>{ const n=[...prev]; n[i]=full.slice(0,c); return n; });
        if(c<full.length){ push(step, 15); }
        else { push(()=>streamBlock(i+1), 340); }
      };
      push(step, 240);
    }
  },[tmpl]);

  const copyAll = ()=>{
    const soap = dataRef.current.soap;
    const txt = BLOCKS.map((b,i)=>`【${b.key}】${b.jp}\n${soap[i]}`).join("\n\n");
    if(navigator.clipboard) navigator.clipboard.writeText(txt).catch(()=>{});
    showToast("SOAPカルテをコピーしました");
  };
  const pasteEMR = ()=> showToast("レセコンへ転記しました（デモ）");

  const canGen = convo.trim().length>0 && phase!=="loading" && recState==="idle";
  const live = phase==="done";
  const curTmpl = TEMPLATES.find(x=>x.id===tmpl);

  return (
    <div className="page">
      {/* topbar */}
      <header className="topbar">
        <div className="brand">
          <span className="mark"><Ico.tooth stroke="#fff"/></span>
          <span className="word">dent<b>ia</b></span>
          <span className="beta latin">BETA</span>
          <span className="spec"><Ico.tooth stroke="currentColor"/> 歯科専用AIカルテ</span>
        </div>
        <div className="topbar-right">
          <span className="who">
            <span className="avatar">DC</span>
            <span>田中デンタルクリニック</span>
          </span>
        </div>
      </header>

      {/* hero */}
      <section className="hero">
        <h1>カルテ入力の時間を、<span className="accent">患者と向き合う時間</span>に。</h1>
        <p>診療の会話を貼り付け、または録音するだけ。歯科に特化したAIが、歯式・歯周検査・処置内容を反映したSOAP形式のカルテ下書きを生成します。</p>
      </section>

      {/* work area */}
      <div className="work">
        {/* LEFT — input */}
        <section>
          <div className="col-head">
            <span className="step">1</span>
            <h2>入力</h2>
            <span className="hint">貼り付け / 録音 → 生成</span>
          </div>
          <div className="panel">
            {/* tabs */}
            <div className="tabs">
              <button className={"tab"+(inputMode==="paste"?" on":"")} onClick={()=>setInputMode("paste")}>
                <Ico.doc stroke="currentColor"/> 会話を貼り付け
              </button>
              <button className={"tab"+(inputMode==="record"?" on":"")} onClick={()=>setInputMode("record")}>
                {recState==="recording" ? <span className="rdot"></span> : <Ico.mic stroke="currentColor"/>}
                録音して入力
              </button>
            </div>

            <div className="in-body">
              {inputMode==="paste" && (
                <React.Fragment>
                  <label className="field-label" htmlFor="convo">
                    診療の会話を貼り付け <span className="req">必須</span>
                  </label>
                  <textarea id="convo" className="ta" value={convo}
                    onChange={e=>setConvo(e.target.value)} placeholder={DATA.first.convo}/>
                  <div className="meta-row">
                    <span className="priv"><Ico.lock stroke="currentColor"/> 入力内容は診療目的にのみ利用されます</span>
                    <span>{convo.length} 文字</span>
                  </div>
                </React.Fragment>
              )}

              {inputMode==="record" && (
                <div className="rec-wrap">
                  {recState==="idle" && (
                    <React.Fragment>
                      <button className="mic-btn" onClick={toggleRecord}><Ico.mic stroke="#fff"/></button>
                      <div className="rec-hint">タップして録音を開始</div>
                      <div className="rec-sub">診療中の会話をそのまま録音 → 自動で文字起こし</div>
                    </React.Fragment>
                  )}
                  {recState==="recording" && (
                    <div className="rec-live">
                      <button className="mic-btn rec" onClick={toggleRecord}><span className="mic-stop"></span></button>
                      <div className="wave">
                        {WAVE_H.map((h,i)=>(
                          <i key={i} style={{"--h":h+"px", animationDelay:(i*0.06)+"s"}}></i>
                        ))}
                      </div>
                      <div className="rec-time"><span className="live-dot"></span>{fmtTime(recSec)}</div>
                      <div className="rec-sub">録音中… もう一度タップで停止</div>
                    </div>
                  )}
                  {recState==="transcribing" && (
                    <div className="transcribe">
                      <div className="spinner"></div>
                      <div className="ttxt">文字起こし中…</div>
                      <div className="rec-sub">音声を歯科用語に対応して変換しています</div>
                    </div>
                  )}
                </div>
              )}

              {/* 補足メモ */}
              <div className="stack">
                <label className="field-label" htmlFor="memo">
                  補足メモ <span className="opt">任意・既往歴／アレルギー等</span>
                </label>
                <textarea id="memo" className="ta" value={memo}
                  onChange={e=>setMemo(e.target.value)}
                  placeholder="例）既往歴：高血圧で内服中／アレルギー：特になし／歯科的既往：#16 根管治療済み"/>
              </div>

              {/* テンプレート選択 */}
              <div className="tmpl-row">
                <div className="tmpl-label"><Ico.layers stroke="currentColor"/> カルテテンプレート（処置別）</div>
                <div className="chips">
                  {TEMPLATES.map(x=>(
                    <button key={x.id} className={"chip"+(tmpl===x.id?" on":"")} onClick={()=>pickTemplate(x.id)}>
                      {x.label}<span className="tag">{x.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="gen-row">
                <button className="btn btn-primary" onClick={runGeneration} disabled={!canGen}>
                  {phase==="loading"
                    ? <>生成中…</>
                    : <><Ico.spark fill="#fff"/> {curTmpl.label}のSOAPを生成</>}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT — result */}
        <section>
          <div className="col-head">
            <span className="step">2</span>
            <h2>生成結果</h2>
            <span className="hint">{curTmpl.label}・SOAP形式</span>
          </div>
          <div className="panel">
            <div className="res-head">
              <span className="title">
                <span className={"dot"+(live?" live":"")}></span>
                SOAPカルテ下書き
              </span>
              {phase==="done" && genTime && (
                <span className="time-badge"><Ico.clock stroke="currentColor"/> 生成時間 <b>{genTime}秒</b></span>
              )}
            </div>

            <div className="res-body">
              {phase==="idle" && (
                <div className="empty">
                  <span className="glyph"><Ico.doc stroke="currentColor"/></span>
                  <h3>ここに下書きが表示されます</h3>
                  <p>会話を入力し「SOAPを生成」を押すと、歯式・所見を反映した S・O・A・P の4ブロックを自動で書き起こします。</p>
                </div>
              )}

              {phase==="loading" && (
                <div className="loading">
                  <div className="spinner"></div>
                  <div className="ltxt">AIがカルテを生成しています…</div>
                  <div className="lsub">会話を解析し、{curTmpl.label}向けSOAPに整理しています</div>
                  <div className="lbar"><i></i></div>
                </div>
              )}

              {phase==="done" && (
                <div className="soap">
                  {BLOCKS.map((b,i)=>(
                    <div key={b.key}
                      className={"block"+(i<=revealed?" show":"")+(activeIdx===i?" active":"")}
                      style={{"--blk":b.color,"--blk-deep":b.deep,"--blk-tint":b.tint}}>
                      <div className="block-head">
                        <span className="badge">{b.key}</span>
                        <span className="labels">
                          <span className="en">{b.en}</span>
                          <span className="jp">{b.jp}</span>
                        </span>
                      </div>
                      <div className="block-body">
                        {typed[i]}
                        {activeIdx===i && typed[i].length<dataRef.current.soap[i].length && <span className="caret"></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {phase==="done" && (
              <React.Fragment>
                <div className="action-bar">
                  <button className="btn btn-emr" onClick={pasteEMR}>
                    <Ico.link stroke="currentColor"/> レセコンに転記
                  </button>
                  <button className="btn btn-ghost" onClick={copyAll}>
                    <Ico.copy stroke="currentColor"/> コピー
                  </button>
                </div>
                <div className="res-foot">
                  <Ico.check stroke="var(--p-color)"/>
                  <span>内容をご確認のうえ、加筆・修正してご利用ください。</span>
                  <span className="ai-tag">dentia AI · v0.9 β</span>
                </div>
              </React.Fragment>
            )}
          </div>
        </section>
      </div>

      {/* toast */}
      <div className={"toast"+(toast?" on":"")}>
        <Ico.check stroke="currentColor"/> {toast||""}
      </div>

      {/* tweaks */}
      <TweaksPanel>
        <TweakSection label="配色テーマ" />
        <TweakRadio label="テーマ" value={t.theme}
          options={[{value:"clear",label:"クリア"},{value:"deep",label:"ディープ"},{value:"azure",label:"ブルー"}]}
          onChange={v=>setTweak("theme", v)} />
        <TweakSection label="表示" />
        <TweakSlider label="文字サイズ" value={t.fontScale} min={14} max={19} step={1} unit="px"
          onChange={v=>setTweak("fontScale", v)} />
        <TweakRadio label="余白" value={t.density}
          options={["コンパクト","標準","ゆったり"]}
          onChange={v=>setTweak("density", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
