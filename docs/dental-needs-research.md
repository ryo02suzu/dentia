# 歯科カルテ作成の実態とdentiaのニーズ調査（ディープリサーチ）

> 会話→歯科SOAP下書き生成ツール「dentia」の前提検証と、開業歯科医院の本当のニーズの特定。
> 一次情報（厚労省・地方厚生局の個別指導/監査文書、療養担当規則、歯科レセコン/電子カルテベンダー資料）を重視し、各主張を3票の敵対的検証にかけた結果。

検証統計：採用 8件 / 棄却 2件 / 未検証 0件 ・ 出典 21件

---

## 結論（要約）

日本の開業歯科（保険診療中心の一般歯科）の診療録は、SOAP形式ではなく、療養担当規則第22条の様式第一号（二）に準拠した「傷病名（部位＋病名）＋処置」を中核とする構造で運用されており、これは厚労省・地方厚生局の複数の一次資料（個別指導/監査の確認事項リスト）が明確に前提としている。歯科医師法第23条・療担規則第22条はいずれも「診療に関する事項」「経過の記載」を求めるのみでSOAPは法定様式ではなく、厚労省の歯科向け文書にはSOAPという語が一度も登場しない。実態として記録はレセコン（カルテ入力＝保険請求業務と一体）に傷病名・処置コードを入力する形が中心で、経過記録（診療録第2面：症状・所見・診療方針・診療内容）や医学管理料・補綴・在宅等の「記載＝算定要件」項目は法令上必須にもかかわらず、個別指導では「記載がない・不十分・画一的（テンプレ的）」が常態的に指摘されている。したがって「SOAP形式で書いている所は少ない」という前提は正しく、dentiaのSOAP生成という出力様式そのものは保険診療の現場様式とはズレている一方、解決すべき真のペイン（経過記録・算定要件記載の個別化・保険病名の妥当性・症状詳記）は国の指導文書が裏付けており大きい。結論として、dentiaはSOAP生成を看板にするより、(1)算定要件を満たす個別化された経過記録の下書き、(2)保険病名（部位＋病名）サジェストと「レセプト病名」回避、(3)摘要欄・症状詳記の自動生成へピボットすべきで、出力フォーマットは療担規則様式／レセコン入力に寄せるのが市場適合的である。

---

## 検証済みの主要ファインディング

### 1. 開業歯科の保険診療録はSOAP形式ではなく、療担規則第22条の様式第一号（二）＝「傷病名（部位＋病名）＋処置」を中核とする構造で法令上運用されている。厚労省の歯科文書にSOAPという語は一切登場しない。
- **確度**: high ／ 3-0 unanimous across 8 merged claims
- **根拠**: 複数の厚労省/地方厚生局の一次資料（個別指導・監査の確認事項リスト、令和3〜7年度）が、診療録第1面=様式第一号(二)の1（部位・傷病名・開始/終了年月日・転帰・主訴・口腔内所見・歯式）、第2面=様式第一号(二)の2（症状・所見・診療方針・診療月日・部位・点数・負担金徴収額）への準拠を義務として確認チェック。傷病名は『部位＋病名』が基本で、P/G/C/Pul/Per等の略称のみで病態記載がないものは指導対象。歯科向けMHLW文書（shidou_kansa_02.pdf, 平成30年度版・全44頁）にはSOAPの語が0件で、求めるのは『診療の都度、診療の経過を記載する』こと。merged claims [0],[1],[7],[10],[11],[12],[18],[19]。
- **出典**:
    - https://www.mhlw.go.jp/content/001534264.pdf
    - https://www.mhlw.go.jp/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/dl/shidou_kansa_17.pdf
    - https://www.mhlw.go.jp/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/dl/shidou_kansa_02.pdf
    - https://kouseikyoku.mhlw.go.jp/kinki/gyomu/gyomu/hoken_kikan/documents/shika_2.pdf

### 2. 歯科の診療録記載は法律で義務付けられているが、SOExなどの特定様式は法定されていない。歯科医師法第23条第1項が『診療に関する事項』の遅滞ない記載を、第2項が5年間の保存義務を、療担規則第22条が様式第一号への記載を定める。
- **確度**: high ／ 3-0 unanimous
- **根拠**: 歯科医師法第23条第1項『診療をしたときは、遅滞なく診療に関する事項を診療録に記載しなければならない』、第2項で5年間の保存義務（勤務医→施設管理者、その他→当該歯科医師）。療担規則第22条は見出し『診療録の記載』で『様式第一号又はこれに準ずる様式の診療録に…必要な事項を記載』を保険医に義務付け。いずれもSOAPを要求せず、様式や記載項目は省令に委任。merged claims [14],[15],[16]。法令は現行・安定。
- **出典**:
    - https://hourei.net/law/323AC0000000202
    - https://ja.wikibooks.org/wiki/%E4%BF%9D%E9%99%BA%E5%8C%BB%E7%99%82%E6%A9%9F%E9%96%A2%E5%8F%8A%E3%81%B3%E4%BF%9D%E9%99%BA%E5%8C%BB%E7%99%82%E9%A4%8A%E6%8B%85%E5%BD%93%E8%A6%8F%E5%89%87

### 3. 歯科の実態ではレセコンでのカルテ入力が保険請求業務と一体で運用され、レセコンで作成した診療録は印刷＋署名/記名押印して初めて法的な診療録となる（入力のみでは診療録不存在と判断され得る）。
- **確度**: high ／ 3-0 unanimous
- **根拠**: 近畿厚生局『保険診療（歯科）の理解のために』は、歯科では診療録作成にレセコンを用いる場合が多く、入力後に紙印刷し署名/記名押印して初めて診療録となる（入力のみで未印刷なら診療録が存在しないと判断され得る）と明記。GC Dentalの教育資料はレセコンを『カルテ入力』『レセプト作成』『レセプト総括の補助』等、保険医療費を得る作業を効率化するソフトと位置づけ、カルテ入力＝保険請求業務一体と説明。merged claims [0],[22]。
- **出典**:
    - https://kouseikyoku.mhlw.go.jp/kinki/gyomu/gyomu/hoken_kikan/documents/shika_2.pdf
    - https://www.gc.dental/japan/member/hoken/chap04/contents0409

### 4. 経過記録・算定要件記載は保険診療上も必須だが、個別指導では『記載がない・不十分・画一的（テンプレ的）』が常態的に指摘される。これはAIによる症例個別化された下書き生成の明確な需要余地を示す。
- **確度**: high ／ 3-0 unanimous
- **根拠**: 診療録第2面（症状・所見・診療方針・診療内容等）の『記載がない/不十分/画一的』は個別指導の標準的指摘で、令和7年度版MHLW文書では同フレーズ『画一的に記載/記載が不十分』が30〜40箇所以上に反復出現。近畿厚生局H29個別指導指摘事項は第2面で症状・所見・検査結果（歯周病検査・電気的根管長測定等）・画像診断所見・医学管理内容・診療方針（訪問診療計画）・診療内容の記載不備を具体列挙。歯科疾患管理料は1回目に基本状況（全身状態・基礎疾患・服薬・生活習慣）・口腔状態・検査要点・治療方針を、2回目以降は管理の要点を記載することが算定要件で、画一的記載は『個々の症例に応じて』改めるよう指導。merged claims [8],[9],[21]。
- **出典**:
    - https://www.mhlw.go.jp/content/001534264.pdf
    - https://www.mhlw.go.jp/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/dl/shidou_kansa_17.pdf
    - https://kouseikyoku.mhlw.go.jp/kinki/iryo_shido/000068920.pdf
    - https://www.mhlw.go.jp/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/dl/shidou_kansa_02.pdf

### 5. 医学管理料・在宅・処置・補綴等の多くの診療報酬項目は、指導内容・治療計画・実施内容の要点を診療録に記載しなければ算定できない（記載＝算定要件）。これがdentiaの最有力ユースケース：算定要件を満たす個別化された記載の自動下書き。
- **確度**: high ／ 3-0 unanimous
- **根拠**: 『指導内容、治療計画等の診療録への記載など、算定要件を満たしていなければ算定できない』。歯科疾患管理料は管理計画について患者へ説明した内容の要点記載が、補綴時診断料は製作予定部位・欠損部の状態・補綴物名称・設計等の要点記載が必須。記載＝請求の根拠であり、記載不備は返還指摘対象。merged claims [9],[20]。
- **出典**:
    - https://www.mhlw.go.jp/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/dl/shidou_kansa_02.pdf
    - https://www.mhlw.go.jp/content/001534264.pdf

### 6. 保険病名の妥当性（『レセプト病名』回避、長期『疑い』病名・重複病名の整理、部位＋病名・転帰の構造化）が国の指導文書で明示の問題点であり、保険病名サジェスト＋病名整理がdentiaの第2の有力ユースケース。
- **確度**: high ／ 3-0 unanimous（関連2claimは1-2で棄却＝過大主張だが本finding自体は別の一次引用で強固）
- **根拠**: 『歯科医学的に診断根拠のない、いわゆるレセプト病名』『長期にわたる疑いの傷病名』『重複/類似の傷病名』が個別指導の指摘項目。診断の都度、医学的に妥当適切な傷病名を、慢性/急性・部位/左右の区別、開始/終了年月日、転帰とともに記載し病名を逐一整理することが要求。傷病名の付与・整理は反復的・規則的タスクでAIサジェストと相性が良い。merged claims [1],[13],[19]。
- **出典**:
    - https://www.mhlw.go.jp/content/001534264.pdf
    - https://www.mhlw.go.jp/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/dl/shidou_kansa_17.pdf
    - https://kouseikyoku.mhlw.go.jp/kinki/gyomu/gyomu/hoken_kikan/documents/shika_2.pdf

### 7. ナラティブ/経過記録は保険請求の根拠であり、レセプトの傷病名等のみで説明不十分な場合は摘要欄・症状詳記で客観的事実中心に補う必要がある＝経過記録の自動生成・症状詳記は個別指導/監査対策として実需がある。
- **確度**: high ／ 3-0 unanimous
- **根拠**: 近畿厚生局文書：『レセプト上の傷病名等のみで診療内容の説明が不十分と思われる場合は、請求点数の高低に関わらず、摘要欄や症状詳記で補う必要がある』。ベンダー（メディア）も『この記載内容こそが、保険請求の根拠で指導対策の要』と訴求。症状詳記/摘要は自由記載のため、会話→下書き生成の価値が最も明確に出る場面。merged claims [2],[6]。
- **出典**:
    - https://kouseikyoku.mhlw.go.jp/kinki/gyomu/gyomu/hoken_kikan/documents/shika_2.pdf
    - https://www.media-inc.co.jp/product/ecw/soap.html

### 8. 歯科特化のAI/SOAP記録支援は既に競合として存在する（オプテックOpt.one3＝AI型電子カルテ、SOAP-AI・病名候補表示、SOAP+IE式歯科衛生士業務記録；メディアはSOAPを電子カルテ標準と訴求）。ただし方式はテンプレ/メニュー選択型が中心で、会話→自動生成型は手薄。
- **確度**: high ／ 3-0 unanimous
- **根拠**: オプテックOpt.one3は『AI型電子カルテ』を標榜し、SOAP-AIによるカルテ作成支援・病名候補表示（正しい請求向け）を提供。同社『業界初のSOAP式歯科衛生士業務記録』はSOAP+IE形式でメニュー項目選択により記録簿を自動作成・実施内容を自動文章化（テンプレ/サンプル文提示型）。メディアはSOAPを電子カルテ時代の標準形式と位置づけ製品でSOAP入力を推進。競合の自動化はテンプレ/メニュー選択ベースで、会話音声→自由文NLGの自動生成はdentiaの差別化余地。merged claims [3],[4],[5],[17]。
- **出典**:
    - https://ssl.opt-net.jp/ai/
    - https://ssl.opt-net.jp/eiseishi-gyomu.php
    - https://ssl.opt-net.jp/soap.php
    - https://www.media-inc.co.jp/product/ecw/soap.html

---

## 留意点・限界（caveats）

- 出力フォーマットの含意：dentiaの「SOAP生成」という看板は、日本の保険歯科の現場様式（療担規則様式第一号＝傷病名＋処置中心、レセコン入力一体）とはズレている。SOAP自体は法定でも保険要求でもなく、厚労省歯科文書にSOAPの語は0件。一方でSOAPを『電子カルテ標準』と訴求するベンダー（メディア）や、SOAP-AI/SOAP式衛生士記録を持つベンダー（オプテック）が既に存在し、SOAPに一定の市場受容はある——ただし大学病院/電子カルテ寄りの文脈で、開業の保険診療レセコン現場ではない。/ 大学病院・歯科大学病院との違いは本データセットで一次情報による直接比較が薄く、推論にとどまる（電子カルテ採用率が高くSOAP/POS方式が比較的根付くと推測されるが未検証）。/ ペインポイントのうち、自費カウンセリング記録・訪問診療書類・歯科衛生士記録・説明同意の記録化・文書料（診断書/紹介状）といった具体的負担は、衛生士記録（オプテック）以外は本データセットでの一次情報の裏付けが弱く、優先度提案は主に『記載＝算定要件』『画一的記載の常態化』『保険病名/症状詳記』という国の指導文書ベースの強い根拠から導いた。/ 競合の市場シェア・導入実態（デンタルシステムズ/モリタ/ヨシダのAI対応、Medimo等汎用音声カルテの歯科導入率）は定量データが不足。/ 時点：MHLW確認事項リストは令和7年度(2025)版を含み現行。製品情報は取得時点のもので、AI機能は更新が速く陳腐化に注意。/ 棄却された2claim（近畿厚生局PDF, 1-2票）は『主訴・所見の不備が常態化』『レセプト病名が使われる実態』という過大/断定的表現が棄却理由で、より限定的な同趣旨の事実（finding 4・6）は別の一次引用で生存している。

---

## 未解決の問い（次に現場で確かめるべきこと）

- 開業一般歯科でのSOAP方式の実際の採用率はどの程度か、また電子カルテ普及率（vs レセコンのみ）の最新の定量データは？ 大学/歯科大学病院の電子カルテ（POS/SOAP方式）と開業医の差を一次情報で定量化できるか。
- 自費カウンセリング・審美の説明同意記録、訪問診療に伴う書類（訪問診療計画・居宅療養管理指導等）、診断書/紹介状（文書料発生）について、開業歯科医・スタッフが感じる負担の大きさと頻度を示す一次/実務データ（業界調査・現場の生の声）はあるか。
- Medimo等の汎用音声AIカルテの歯科導入実態、およびデンタルシステムズ/モリタ/ヨシダ等の主要レセコンベンダーのAI記録支援対応状況・市場シェアの定量把握。
- dentiaが会話→『療担規則様式準拠の経過記録＋保険病名サジェスト＋症状詳記』を出力する形にピボットした場合、既存レセコン/電子カルテ（オプテック等）との連携（API/入力代行）が現実的に可能か、ベンダーロックインの障壁はどの程度か。

---

## 出典一覧

- https://www.gc.dental/japan/member/hoken/chap04/contents0409
- https://kouseikyoku.mhlw.go.jp/kinki/gyomu/gyomu/hoken_kikan/documents/shika_2.pdf
- https://ssl.opt-net.jp/eiseishi-gyomu.php
- https://www.media-inc.co.jp/product/ecw/soap.html
- https://www.mhlw.go.jp/content/001534264.pdf
- https://www.mhlw.go.jp/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/dl/shidou_kansa_17.pdf
- https://service.sunsys.co.jp/media/dentistry-column/dent009
- https://note.com/kartemaker/n/nd709c5802c6e
- https://ja.wikibooks.org/wiki/%E4%BF%9D%E9%99%BA%E5%8C%BB%E7%99%82%E6%A9%9F%E9%96%A2%E5%8F%8A%E3%81%B3%E4%BF%9D%E9%99%BA%E5%8C%BB%E7%99%82%E9%A4%8A%E6%8B%85%E5%BD%93%E8%A6%8F%E5%89%87
- https://hourei.net/law/323AC0000000202
- https://aichi-hkn.jp/news/5169
- https://www.houmonshika.org/dental/labo9/
- https://www.empower-hc.com/lp/voicechart/
- https://ssl.opt-net.jp/ai/
- https://www.towa-hi-sys.co.jp/product/ai%E3%83%BB%E9%9B%BB%E5%AD%90%E3%82%AB%E3%83%AB%E3%83%86
- https://medimo.ai/
- https://medimo.ai/column/emr-dental
- https://www.kyoei-law.com/columns/1281/
- https://www.mhlw.go.jp/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/dl/shidou_kansa_02.pdf
- https://kouseikyoku.mhlw.go.jp/kinki/iryo_shido/000068920.pdf
- https://legal-conference.com/patient/informed-consent-ziyuu