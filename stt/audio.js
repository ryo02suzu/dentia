/**
 * 音声フォーマット変換（メモリ完結・ディスクに残さない）
 *
 * ブラウザの MediaRecorder は webm/opus（iOS は mp4/aac）を送ってくる（index.html）。
 * 国産STT API や自前STT が wav/PCM を要求する場合に、ここで 16kHz mono wav へ変換する。
 *  - ffmpeg を stdin→stdout で使い、一時ファイルを作らない（医療データを残さない＝§7）。
 *  - ffmpeg が無い環境では元バッファをそのまま返す（pass-through・警告のみ）。
 *    → openai プロバイダは webm をそのまま受けられるので変換不要。変換が必須なエンジンは
 *      自分で needsWav を見て扱う。
 */

const { spawn } = require("child_process");

let _ffmpegChecked = false;
let _ffmpegAvailable = false;

/** ffmpeg が使えるか（初回だけ実プロセスで確認しキャッシュ） */
function ffmpegAvailable() {
  if (_ffmpegChecked) return _ffmpegAvailable;
  _ffmpegChecked = true;
  try {
    const { status } = require("child_process").spawnSync("ffmpeg", ["-version"], {
      stdio: "ignore",
    });
    _ffmpegAvailable = status === 0;
  } catch {
    _ffmpegAvailable = false;
  }
  if (!_ffmpegAvailable) {
    console.warn("[audio] ffmpeg が見つかりません。音声変換はスキップ（pass-through）します。");
  }
  return _ffmpegAvailable;
}

/**
 * 任意の音声バッファを 16kHz mono の wav(PCM s16le) に変換する。
 * ffmpeg 不在時は入力バッファをそのまま返す。
 * @param {Buffer} input
 * @returns {Promise<{ buffer: Buffer, converted: boolean, contentType: string }>}
 */
function toWav16kMono(input) {
  if (!ffmpegAvailable()) {
    return Promise.resolve({ buffer: input, converted: false, contentType: "application/octet-stream" });
  }
  return new Promise((resolve, reject) => {
    // -i pipe:0（stdin）→ wav を pipe:1（stdout）へ。入力コンテナは ffmpeg が自動判定。
    const args = ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-ac", "1", "-ar", "16000", "-f", "wav", "pipe:1"];
    const ff = spawn("ffmpeg", args);
    const out = [];
    const errs = [];
    ff.stdout.on("data", (d) => out.push(d));
    ff.stderr.on("data", (d) => errs.push(d));
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code === 0) {
        resolve({ buffer: Buffer.concat(out), converted: true, contentType: "audio/wav" });
      } else {
        reject(new Error(`ffmpeg 変換失敗 (code ${code}): ${Buffer.concat(errs).toString().slice(0, 300)}`));
      }
    });
    ff.stdin.on("error", () => {}); // EPIPE（ffmpeg側が先に閉じた等）を握りつぶす
    ff.stdin.end(input);
  });
}

module.exports = { toWav16kMono, ffmpegAvailable };
