---
marp: true
title: dentia 提案資料
paginate: true
theme: default
---

<!--
Marp形式スライド（Markdown → スライド/PDF）。
変換: https://marp.app/ に貼る / VS Code拡張 / CLI:
  npx @marp-team/marp-cli docs/sales-deck.md --pdf --allow-local-files
【構成】Medimo提案資料(53P)の章立て・流れを参考に、歯科・dentia向けに再現。
【正直さ】
 - 効果の数値・料金・会社情報は [仮]/[記入] のプレースホルダ（創作しない）。
 - 導入実績・顧客数・導入事例・お客様の声・メディア掲載は未確定 → 「No Image」枠＋
   「※イメージ/想定/今後掲載」で明示。
 - 写真箇所は「No Image」。実UI画像は ../project/screenshots/ を使用。
 - Medimo固有の事実（45分削減・80%・400施設・亀田/兵庫医大・専用機器SmartPaste等）は
   dentiaの実績として転用しない。dentiaは専用機器不要・コピペ/QR転記。
-->

<style>
h1,h2{color:#0B7C87;} h3{color:#0A5E68;} strong{color:#0A5E68;}
section{font-family:"Noto Sans CJK JP","Hiragino Kaku Gothic ProN","Yu Gothic","Zen Kaku Gothic New",sans-serif;}
section.lead{text-align:center;}
table{font-size:0.78em;}
.cols{display:flex;gap:16px;font-size:0.7em;}
.box{flex:1;background:#F2F7F8;border:1px solid #D4ECEE;border-radius:10px;padding:13px;}
.note{color:#4A636B;font-size:0.66em;}
.kpi{display:flex;gap:16px;text-align:center;}
.kpi>div{flex:1;background:#E8F6F7;border:1px solid #D4ECEE;border-radius:12px;padding:16px;}
.kpi b{color:#0B7C87;font-size:1.5em;}
.flow{display:flex;align-items:center;gap:8px;font-size:0.7em;flex-wrap:wrap;}
.flow .s{background:#E8F6F7;border:1px solid #D4ECEE;border-radius:10px;padding:10px 12px;flex:1;text-align:center;}
.flow .a{color:#0E9AA7;font-weight:700;}
.noimg{display:flex;align-items:center;justify-content:center;background:#EDF2F3;border:2px dashed #B9CDD2;border-radius:12px;color:#8AA0A6;font-weight:700;letter-spacing:.05em;min-height:190px;}
.sec{font-family:"Outfit",sans-serif;color:#0E9AA7;font-size:0.9em;letter-spacing:.12em;}
.feat{display:flex;gap:12px;font-size:0.66em;}
.feat>div{flex:1;background:#fff;border:1px solid #D4ECEE;border-radius:10px;padding:12px;}
.feat .n{color:#0E9AA7;font-family:"Outfit",sans-serif;font-weight:700;}
.feat b{color:#0A5E68;}
</style>

<!-- _class: lead -->
<!-- _paginate: false -->

<span class="sec">DENTAL AI CHARTING</span>

# dentia（デンティア）
## 歯科専用 AIカルテ下書き生成

**「カルテ入力の時間を、患者と向き合う時間に。」**

歯科診療における歯科医師と患者の会話を、AIで文字起こし・要約し、
カルテ作成業務をラクにするサービスです。

---

## 目次

<div class="cols" style="font-size:0.9em">
<div>

1. dentia とは
2. 歯科現場の欠かせない相棒に
3. dentia の使い方
4. 他の方法との比較

</div>
<div>

5. 料金プラン
6. ご契約後の流れ・サポート
7. 活用シーン・導入事例
8. よくあるご質問・データの取り扱い
9. 会社概要・お問い合わせ

</div>
</div>

---

<!-- _class: lead -->

<span class="sec">01</span>
# dentia とは

### CONCEPT
**歯科医師が、目の前の患者さんに集中できる時間を創出します。**

---

## こんなお悩みはありませんか？

- 診療をしながらカルテを作成するのが大変
- カルテを書くために残業している
- もっと患者さんと向き合って診療をしたい
- 歯式・歯科検査・処置など、歯科特有の記載に手間がかかる
- 記録の書き方・質が、人によってばらつく
- 受付・助手・歯科衛生士の記録の負担が大きい

---

## dentia 活用の3つの効果

<div class="kpi">
<div>入力時間の削減<br><b>[仮] 分/日</b><br><span class="note">録音 → 数秒で下書き</span></div>
<div>疲労感の軽減<br><b>[仮]</b><br><span class="note">後回しの入力をなくす</span></div>
<div>患者満足度の向上<br><b>[仮] %</b><br><span class="note">画面より会話へ</span></div>
</div>

<br><span class="note">※ 効果は導入環境により異なります。数値は自院での実測値を記入してください（本資料は未記入）。</span>

---

## 導入によって見込めるインパクト（診療の視点）

<div class="flow">
<div class="s">ながら入力が<br>無くなる</div><span class="a">→</span>
<div class="s">患者と<br>向き合える</div><span class="a">→</span>
<div class="s">患者満足度の<br>向上</div>
</div>
<br>
<div class="flow">
<div class="s">診療中の<br>入力時間削減</div><span class="a">→</span>
<div class="s">待ち時間の<br>減少</div><span class="a">→</span>
<div class="s">疲労感の<br>減少</div>
</div>
<br>
<div class="flow">
<div class="s">診療後の<br>入力時間削減</div><span class="a">→</span>
<div class="s">残業時間の<br>減少</div>
</div>

<br><span class="note">直接的影響 → アウトカム</span>

---

## 導入によって見込めるインパクト（経営の視点）

| 直接的な影響 | 期待できるアウトカム |
|---|---|
| 診療の合間の入力時間削減 → 回転の改善 | **売上機会の改善** |
| 診療後の入力時間削減 → 残業の減少 | **残業代の削減** |
| 人手に頼らない記録補助 | スタッフ採用・教育の**固定費抑制** |

<span class="note">※ 一般的に見込まれる効果の整理です。効果を保証するものではありません。</span>

---

## 導入によって見込めるインパクト（その他）

| 直接的な影響 | 期待できるアウトカム |
|---|---|
| カルテの質が均一になる（SOAP構造化） | 他のドクターが一目で背景を理解 → **引き継ぎコストの減少** |
| カルテの記載負担がなくなる | 非常勤の先生・スタッフが**働きやすくなる** |
| 歯式単位で整理 | **個別指導でも説明しやすい**記載粒度 |

---

<!-- _class: lead -->

<span class="sec">02</span>
# 歯科現場の欠かせない相棒に

---

## 導入実績

<div class="noimg">No Image（累計診療件数 / 導入医院数）</div>

<span class="note">※ 現在ベータ版。導入実績は今後掲載します。本ページはイメージです。</span>

---

## お客様の声

<div class="cols">
<div class="box"><b>No Image</b><br><br>「[ 導入いただいた歯科医院のコメントを掲載予定 ]」<br><br><span class="note">[ 医院名・院長名 ] ／ ※イメージ</span></div>
<div class="box"><b>No Image</b><br><br>「[ 導入いただいた歯科医院のコメントを掲載予定 ]」<br><br><span class="note">[ 医院名・院長名 ] ／ ※イメージ</span></div>
</div>

<br><span class="note">※ ベータ導入後、実際の声を掲載します。</span>

---

## 歯科のあらゆる場面に

<div class="cols" style="font-size:0.85em">
<div>

- 一般歯科（保険診療）
- 予防・歯周治療（SPT）
- 補綴

</div>
<div>

- 根管治療（歯内療法）
- 小児歯科
- 自費カウンセリング・訪問診療

</div>
</div>

> 歯科の保険診療から自費・訪問まで、**記録が重い場面ほど**効果を発揮します。

---

## メディア・発信

<div class="noimg">No Image（メディア掲載 / 発信実績）</div>

<span class="note">※ 今後、歯科メディア（WHITE CROSS等）・スタディグループでの発信を掲載予定。</span>

---

<!-- _class: lead -->

<span class="sec">03</span>
# dentia の使い方

---

## 患者さんとの会話から、カルテ原稿を作成

<div class="flow">
<div class="s">診療前：<br>録音開始</div><span class="a">→</span>
<div class="s">歯科用語での<br>文字起こし</div><span class="a">→</span>
<div class="s">AIがSOAP形式に<br>自動要約</div><span class="a">→</span>
<div class="s">数秒でSOAP完成<br>カルテへ転記</div>
</div>

<br>

診療前に録音開始 → 診療終了時に停止するだけ。録音が使えない時は**手入力**でもOK。

---

## セットアップは不要（専用機器いりません）

<div class="flow">
<div class="s">ブラウザを<br>開く</div><span class="a">→</span>
<div class="s">ログイン</div><span class="a">→</span>
<div class="s">マイクボタンで<br>録音開始</div>
</div>

<br>

- **専用マイク・受信機・専用デバイスは不要**
- お手元の **PC・タブレット・スマホ** のブラウザだけ
- インストール不要

> 「すぐ始められて、機器の費用もかからない」——これが dentia の入りやすさです。

---

## dentia の4つの特徴

<div class="feat">
<div><span class="n">01</span><br><b>歯科用語の文字起こし</b><br><br>歯式・歯科検査・処置名など、歯科特有の用語に最適化（継続強化）。</div>
<div><span class="n">02</span><br><b>処置別テンプレート</b><br><br>初診（全顎）/再診/SPT/補綴/根管治療で書き分け。個別指導も意識した記載。</div>
<div><span class="n">03</span><br><b>歯式単位のSOAP自動生成</b><br><br>所見を歯番ごとに構造化。数秒でSOAP下書きが完成。</div>
<div><span class="n">04</span><br><b>コピペ＋QRで転記</b><br><br>専用機器なしで、カルテ/レセコンへ転記。オンプレはQRで対応。</div>
</div>

---

![bg right:50% fit](../project/screenshots/01-rec.png)

## 画面イメージ

- 左：**入力**（録音 / 手入力・テンプレ選択）
- 右：**生成結果**（S / O / A / P）
- 生成時間を表示・「コピー」「QRで転記」

<span class="note">PC・タブレット・スマホのブラウザで動作。</span>

---

## 生成例①（初診：会話 → 歯科SOAP）

<div class="cols">
<div class="box">
<b>診療の会話（入力）</b><br><br>
医師：今日はどうされましたか？<br>
患者：右下の奥歯が、冷たいものでしみるんです。3日前から。<br>
医師：温かいものは？じっとしていて痛みは？<br>
患者：温かいのは平気です。ズキズキはないですね。
</div>
<div class="box">
<b>生成されたSOAP下書き（出力）</b><br><br>
<b>S</b>：右下臼歯部の冷水痛、3日前から。温熱痛・自発痛なし。<br>
<b>O</b>：#46 深在性う蝕、冷水痛(+)、打診痛(-)、EPT生活反応(+)。<br>
<b>A</b>：#46 C3疑い、可逆性〜不可逆性歯髄炎を鑑別中（要確認）。<br>
<b>P</b>：X-P・口腔内写真を記録。抜髄を検討、次回より根管治療。
</div>
</div>

<br><span class="note">※ A（評価・診断）は断定を避けた表現。最終確認は歯科医師が行う前提。</span>

---

## 生成例②（根管治療：歯式単位の構造化）

<div class="cols">
<div class="box">
<b>診療の会話（入力）</b><br><br>
医師：左下の奥歯がズキズキ痛むんですね。夜眠れない？<br>
患者：はい、夜になると特にうずきます。痛み止めを飲んでます。<br>
医師：（診査）36番、打診痛プラス、根尖部圧痛プラス、EPTマイナス…
</div>
<div class="box">
<b>生成されたSOAP下書き（出力）</b><br><br>
<b>S</b>：#36の自発痛・夜間痛、鎮痛剤服用中。<br>
<b>O</b>：<br>#36：打診痛(+)、根尖部圧痛(+)、EPT(-)、X-Pで根尖部透過像<br>
<b>A</b>：#36 急性根尖性歯周炎、失活歯。感染根管治療の適応。<br>
<b>P</b>：感染根管治療を開始。EMR後に拡大洗浄、次回 根管貼薬。
</div>
</div>

<br><span class="note">汎用のSOAPには無い「歯式単位の整理」が、歯科専用 dentia の核です。</span>

---

## カルテへの転記（専用機器なし）

| カルテ／レセコン | 転記方法 |
|---|---|
| クラウド型（ネット接続あり） | **コピー＆ペースト**（PCで貼り付け） |
| オンプレ型（閉域・スキャナあり） | **QRコード**を読み取って転記（ネット非経由） |
| （将来）特定ベンダー連携 | API連携 ※今後対応予定 |

> Medimoのような専用中継機は不要。**コピペ／QR**でどの環境でも使えます。

---

<!-- _class: lead -->

<span class="sec">04</span>
# 他の方法との比較

---

## 他のAIカルテ（汎用）との比較

| | 汎用AIカルテ | **dentia（歯科専用）** |
|---|---|---|
| 対象 | 内科〜多科の総合 | **歯科に特化** |
| 歯科用語の精度 | 汎用 | **歯科用語に最適化（継続強化）** |
| 歯式・処置別 | 一般的なSOAP | **歯式単位の構造化・処置別テンプレ** |
| 専用機器 | 専用マイク等が要る場合も | **不要（ブラウザ・スマホ）** |
| 料金 | — | **[仮] 円〜** |

<span class="note">※ 当社調べ。事実を保証するものではありません。</span>

---

## 人手（採用）との比較

| 週6日・常勤1名想定 | **dentia** | スタッフ採用 |
|---|---|---|
| 月額 | **[仮] 円〜** | 人件費（高） |
| 教育期間 | **不要** | 必要 |
| 教育コスト | **なし** | 採用・教育コスト |
| 稼働の安定 | **時間を選ばず利用** | 勤務時間・休暇・退職 |
| カルテ記録 | ◯ | ◯ |
| 受付などの対人業務 | ✕ | ◯ |

<span class="note">※ 自社調べ。人手不足の中で「採れない人材の代替」としての価値を想定。</span>

---

<!-- _class: lead -->

<span class="sec">05</span>
# 料金プラン

---

## 料金プラン（仮）

| プラン | 月額 | 内容 |
|---|---|---|
| [プラン名] | [仮] 円 | [医院単位・録音回数など] |
| [プラン名] | [仮] 円 | [上位プラン内容] |

初期費用：[仮] 円　／　最低利用期間：[記入]　／　録音時間：[記入]

<span class="note">※ 医院単位の定額を想定（保険診療の実情に合わせて）。価格は決定後に記入してください。</span>

---

## 備品費用：かかりません

- **専用マイク・延長ケーブル・専用中継機（SmartPaste相当）は不要**
- お手元の **PC / タブレット / スマホ** でそのまま利用
- 追加の備品購入・初期工事は原則不要

> 「機器を買わずに、すぐ始められる」——導入のハードルを下げます。

---

## 🎁 ベータ版：20院限定 無料モニター募集

- **利用料は無料**でお試しいただけます（ベータ期間中）
- お願いするのは **改善のためのフィードバック**だけ
- いただいた声を**機能改良に反映**します

> 「歯科のための AIカルテ」を、現場の先生と一緒に育てます。

---

<!-- _class: lead -->

<span class="sec">06</span>
# ご契約後の流れ・サポート

---

## ご導入の流れ

<div class="flow">
<div class="s">❶ オンライン説明<br>・お申し込み</div><span class="a">→</span>
<div class="s">❷ アカウント作成<br>・初期設定</div><span class="a">→</span>
<div class="s">❸ 患者同意・院内掲示<br>の準備</div><span class="a">→</span>
<div class="s">❹ 利用開始<br>・フォロー</div>
</div>

<br>

- ❶製品デモ ❷お申し込み ❸初期設定（アカウント作成）
- ❹院内掲示・同意文のテンプレをご用意し、運用をサポート

---

## サポート体制 / お支払い

**サポート**
- 導入時のオンライン説明
- メール／チャットでのお問い合わせ対応（[サポート時間を記入]）

**お支払い**
- [請求方法・サイクルを記入]（ベータ期間は無料）

---

## 利用環境と設備

| | クラウド型カルテ | オンプレ型カルテ |
|---|---|---|
| 必要な設備 | **ネット接続PC＋ブラウザ**のみ | スマホ／タブレット＋スキャナ |
| 転記 | **コピー＆ペースト** | **QRコード**（ネット非経由） |
| 専用機器 | 不要 | 不要 |

<span class="note">環境を問わずセットアップ簡単 ＆ すぐにご利用スタート。</span>

---

## カルテへの転送方法 比較

| | クラウド型 | オンプレ型（QR） |
|---|---|---|
| 起動 | ブラウザでdentiaを開く | スマホ/タブレットでdentia |
| 転送方法 | 生成結果を**コピー&ペースト** | 生成結果を**QR化→スキャナで読取** |
| 設定・別機器 | 不要 | スキャナ（既設のものでも可） |
| ネット経由 | する | **しない（閉域でも安全）** |

---

<!-- _class: lead -->

<span class="sec">07</span>
# 活用シーン・導入事例

---

## 効果的な運用のコツ① 受付・助手と連携

| | 診療前 | 診療中 | 診療後 |
|---|---|---|---|
| 医師 | — | 録音開始→いつも通り診療→停止 | 下書きを確認・修正 |
| 受付/助手 | 録音の院内掲示を確認 | — | コピペ／QRでカルテへ転記 |
| 患者 | 掲示を確認 | いつも通り | — |

---

## 効果的な運用のコツ② 歯科衛生士・SPT

| | 予診/SPT前 | 中 | 後 |
|---|---|---|---|
| 歯科医師 | — | — | 記録を確認 |
| 歯科衛生士 | 録音の説明 | 録音→SC/SRP/TBI/SPTを実施 | 停止→下書きを確認・転記 |
| 患者 | 掲示を確認 | いつも通り | — |

<span class="note">※ 衛生士記録モード（SOAPIE）は今後対応予定。</span>

---

## 効果的な運用のコツ③ 訪問診療

| | 診療前 | 診療中 | 診療後 |
|---|---|---|---|
| 歯科医師 | 録音の旨を患者へ伝える | 録音→診療→停止 | （移動中でも）下書きを確認 |
| 患者 | — | いつも通り | — |
| 事務 | — | — | カルテへ転記 |

> スマホだけで完結＝**専用機器不要のdentiaが最も活きる**場面です。

---

## 導入事例①（想定）

| 医院タイプ | 一般歯科（保険中心） |
|---|---|
| **悩み** | 診療後のカルテ入力で残業。記載のばらつき。 |
| **解決（期待）** | 録音→数秒で下書き。SOAP構造化で記載が均一に。 |

<div class="noimg" style="min-height:90px">No Image（医院・先生の写真）</div>

<span class="note">※ 本事例は想定（イメージ）です。実際の導入事例はベータ運用後に掲載します。</span>

---

## 導入事例②（想定）

| 医院タイプ | 予防・SPT中心の医院 |
|---|---|
| **悩み** | 歯科衛生士の記録負担が大きい。人手不足。 |
| **解決（期待）** | 録音から記録の下書き。衛生士の記録時間を短縮。 |

<div class="noimg" style="min-height:90px">No Image（医院・スタッフの写真）</div>

<span class="note">※ 本事例は想定（イメージ）です。</span>

---

## 導入事例③（想定）

| 医院タイプ | 自費・訪問に注力する医院 |
|---|---|
| **悩み** | カウンセリング・訪問の記録が大変。説明と同意の記録を残したい。 |
| **解決（期待）** | 会話から記録を下書き。スマホだけで完結。 |

<div class="noimg" style="min-height:90px">No Image（診療・訪問の写真）</div>

<span class="note">※ 本事例は想定（イメージ）です。</span>

---

<!-- _class: lead -->

<span class="sec">08</span>
# よくあるご質問・データの取り扱い

---

## よくあるご質問

**Q1. iPhone（スマホ）で利用できますか？**　A. はい、利用可能です。

**Q2. 電子カルテ・レセコンと連携できますか？**　A. コピペ／QRに対応。API連携は今後（特定ベンダーから）対応予定です。

**Q3. 歯科の専門用語・固有名詞を追加できますか？**　A. 歯科用語の補正に対応。誤変換のフィードバックで継続強化します。

**Q4. 生成された内容はそのまま使えますか？**　A. 「下書き」です。歯科医師が確認・加筆して確定してください。

---

## データの取り扱い（安心への配慮）

- **ログイン制**＋**医院単位のデータ分離**（他院・他人のカルテは見えない設計）
- 録音した**音声はサーバーに保存せず、処理後に破棄**
- 通信は **HTTPS** で暗号化／AIに送ったデータは**学習に使われない設定**
- 文字起こし・生成のため、データは外部AIサービス（海外を含む）で処理。**患者同意は医院が取得**する運用
- **A（評価・診断）は断定を避け、最終確認は歯科医師**が行う前提

<span class="note">※ 暗号化強化・監査ログ・各種ガイドライン（3省2ガイドライン）準拠・ISMS等は継続的に整備しています。</span>

---

<!-- _class: lead -->

<span class="sec">09</span>
# 会社概要・お問い合わせ

---

## 会社概要

| | |
|---|---|
| サービス名 | dentia（デンティア） |
| 提供 | [会社名・屋号を記入] |
| 所在地 | [所在地を記入] |
| 設立 | [記入] |
| 事業内容 | 歯科向けAIカルテ下書き生成サービスの開発・提供 |
| お問い合わせ | [メール / 電話 / URL を記入] |

---

## チーム・監修

<div class="cols">
<div class="box"><b>No Image</b><br><br>[ 代表 ／ 開発 ]<br><span class="note">[ 略歴を記入 ]</span></div>
<div class="box"><b>No Image</b><br><br>[ 臨床監修（歯科医師） ]<br><span class="note">[ 略歴を記入 ]</span></div>
</div>

<br><span class="note">※ 歯科医師の臨床監修のもと開発しています（体制は確定後に記載）。</span>

---

<!-- _class: lead -->
<!-- _paginate: false -->

<span class="sec">DENTAL AI CHARTING</span>

# まずは無料でお試しください

**dentia — 歯科専用 AIカルテ下書き生成**

20院限定 無料モニター募集中
デモ／お問い合わせ：[連絡先・URLを記入]

> 「カルテ入力の時間を、患者と向き合う時間に。」
