# 自前STT チューニング計測ハーネス（合成音声・スモーク用）

`server.py` の設定（モデル／プロンプト／デコード）を変えたときの効果を、dentia の評価ハーネス
（`eval/score.js`：CER・歯科用語誤り率・歯番/左右取り違え）で**数値比較**するための小道具です。

> ⚠️ これは **gTTS の合成音声**を使う“当て木”であり、**臨床バリデーションの代替ではありません。**
> 真の臨床精度は、同意済みの**実際の歯科診療音声**での評価と fine-tuning が必要です（`docs/stt-migration-plan.md` §4,§5,§9）。
> 合成音声は文頭の立ち上がりが歪みやすく（例: 「上→腸」「下→霜」）、実音声より不利に出る面もあります。

## 依存
- Python: `gTTS`, `requests`（`infra/faster-whisper` の venv に追加: `pip install gTTS requests`）
- `ffmpeg`（webm 化）
- Node（採点は `eval/score.js`）

## 使い方
```bash
# 設定A のサーバを立てて測定
WHISPER_MODEL=small DEVICE=cpu python ../server.py &      # 例
python measure.py http://127.0.0.1:8000/transcribe small_baseline

# 設定B（推奨・臨床寄り）へ切替えて測定
WHISPER_MODEL=large-v3 DEVICE=cpu CONDITION_PREV=false python ../server.py &
python measure.py http://127.0.0.1:8000/transcribe largev3_tuned

# 採点（リポジトリ直下で）
node eval/score.js infra/faster-whisper/measure/compare.jsonl
```
- 実行ごとに `hyp_<label>.json` が貯まり、`compare.jsonl` を自動再生成 → システム横並び比較。
- URL に dentia の `/api/transcribe` を指定すれば、**後処理辞書込みの実チェーン**も測れる。
- `references.json` を編集すれば測定文を差し替え可能（初診/再診/SPT/補綴/根管をバランス良く）。

## 測定実績（CPU・int8・8文）

参考までに、本ハーネスで測ったチューニング効果（合成音声・CPU）:

| 指標 | `small`（既定設定） | `large-v3` + チューニング |
|---|---|---|
| CER（文字誤り率） | 11.4% | **1.6%** |
| WER（語誤り率） | 60.0% | **20.0%** |
| 歯科用語 F1 | 100% | 100% |
| 左右取り違え | 0% | 0% |

チューニング内容：モデルを `large-v3` に、`condition_on_previous_text=false`・`temperature=0`・
VAD・幻聴抑制閾値、歯科語彙を厚めにした `INITIAL_PROMPT`（すべて `server.py` の環境変数で調整可）。

残差（WER 20%）の主因は文頭方向語（上/下）の合成音声起因の崩れで、実音声では低減が見込まれる。
`#46` 等の歯式・材料名・術式略語は本セットでは十分にストレスできていないため、
**実音声での評価と fine-tuning が臨床到達の本丸**である点に注意。
