#!/usr/bin/env python3
"""
自前STTのチューニング計測ハーネス（合成音声・スモーク用）

目的: server.py の設定（モデル/プロンプト/デコード）を変えたときの効果を、
      dentia の評価ハーネス（eval/score.js: CER/用語誤り率/歯番・左右取り違え）で
      数値比較できるようにする。実音声が無い段階の“当て木”であり、
      臨床バリデーションの代替ではない（README 参照）。

依存: gTTS, requests（合成と送信）／ ffmpeg（webm化）／ Node（採点 eval/score.js）
使い方:
  # 1) 設定Aのサーバを立てて:
  python measure.py http://127.0.0.1:8000/transcribe small_baseline
  # 2) 設定Bのサーバに切替えて:
  python measure.py http://127.0.0.1:8000/transcribe largev3_tuned
  # → 実行ごとに hyp_<label>.json が貯まり、compare.jsonl を再生成。
  # 3) 採点（リポジトリ直下で）:
  node eval/score.js infra/faster-whisper/measure/compare.jsonl

dentia 経由（/api/transcribe）を URL に指定すれば、後処理辞書込みの実チェーンも測れる。
"""
import glob
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, "audio")


def synth_if_needed(refs):
    """references を gTTS で合成し、ffmpeg で webm(opus) 化（無ければ生成）。"""
    os.makedirs(AUDIO, exist_ok=True)
    need = [(rid, t) for rid, t in refs if not os.path.exists(os.path.join(AUDIO, rid + ".webm"))]
    if not need:
        return
    from gtts import gTTS  # 遅延 import（合成が不要なら未使用）

    for rid, text in need:
        mp3 = os.path.join(AUDIO, rid + ".mp3")
        webm = os.path.join(AUDIO, rid + ".webm")
        gTTS(text, lang="ja").save(mp3)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-c:a", "libopus", webm],
            check=True,
        )
        print(f"synth {rid}", file=sys.stderr)


def collect(url, label, refs):
    """各 webm を url へ POST し、{id, ref, hyp} を hyp_<label>.json に保存。"""
    import requests  # 遅延 import

    ref_map = dict(refs)
    out = []
    for rid, _ in refs:
        webm = os.path.join(AUDIO, rid + ".webm")
        with open(webm, "rb") as fh:
            r = requests.post(url, files={"audio": (rid + ".webm", fh, "audio/webm")}, timeout=600)
        text = r.json().get("text", "")
        out.append({"id": rid, "ref": ref_map[rid], "hyp": text})
        print(f"[{rid}] {text}", file=sys.stderr)
    with open(os.path.join(HERE, f"hyp_{label}.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=0)


def rebuild_compare():
    """貯まった hyp_*.json を 1本の compare.jsonl（ref + hyps{label:...}）へ。"""
    systems = {}
    for path in sorted(glob.glob(os.path.join(HERE, "hyp_*.json"))):
        label = os.path.basename(path)[4:-5]
        systems[label] = {x["id"]: x for x in json.load(open(path))}
    if not systems:
        return
    ids = sorted(next(iter(systems.values())).keys())
    with open(os.path.join(HERE, "compare.jsonl"), "w") as f:
        for rid in ids:
            ref = next(s[rid]["ref"] for s in systems.values() if rid in s)
            hyps = {lab: s[rid]["hyp"] for lab, s in systems.items() if rid in s}
            f.write(json.dumps({"id": rid, "ref": ref, "hyps": hyps}, ensure_ascii=False) + "\n")
    print(f"wrote compare.jsonl（systems: {', '.join(systems)}）", file=sys.stderr)


def main():
    if len(sys.argv) < 3:
        print("usage: python measure.py <transcribe_url> <label>", file=sys.stderr)
        sys.exit(2)
    url, label = sys.argv[1], sys.argv[2]
    refs = json.load(open(os.path.join(HERE, "references.json")))
    synth_if_needed(refs)
    collect(url, label, refs)
    rebuild_compare()
    print("\n採点: リポジトリ直下で → node eval/score.js infra/faster-whisper/measure/compare.jsonl", file=sys.stderr)


if __name__ == "__main__":
    main()
