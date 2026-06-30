/**
 * 依存ゼロの軽量テストランナー（Node標準 assert のみ）
 *
 *   実行: node test/run.js
 *   - 失敗が1件でもあれば exit 1。全て通れば exit 0。
 *   - 各テストは [PASS]/[FAIL] を出力し、最後に合計を表示する。
 *
 * 対象: STT 移行（docs/stt-migration-plan.md）の各モジュール。
 *   1. stt/postprocess.js  applyDictionary（辞書置換の代表ケース）
 *   2. stt/index.js        transcribe のフォールバック（ENGINES差し替え→復元）
 *   3. eval/score.js       cer/wer/scorePair（あれば。未統合なら skip）
 *   4. stt/llmNormalize.js normalize のフェイルオープン（あれば。キー無しで素通り）
 *
 * 注意:
 *   - 「あれば require」方針。まだ親が統合していないモジュール（eval/score.js 等）は
 *     ファイルが無い／読込失敗なら [SKIP] と表示してテスト自体は続行する。
 *   - llmNormalize はキー無し fail-open のみ検証し、実APIは絶対に呼ばない。
 *   - node -c test/run.js で構文確認可（実行は他ファイルの統合状況次第で一部 SKIP しうる）。
 */

"use strict";

const assert = require("assert");
const path = require("path");

// ------------------------------------------------------------------ //
// 最小テストフレームワーク
// ------------------------------------------------------------------ //
let pass = 0;
let fail = 0;
let skip = 0;

/** 同期/非同期どちらの本体も受ける。例外なし=PASS、例外=FAIL。 */
async function test(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    fail++;
    console.log(`[FAIL] ${name}`);
    console.log(`       → ${err && err.message ? err.message : err}`);
  }
}

/** 依存モジュールが未統合のときにテスト群ごと飛ばす。 */
function skipGroup(name, reason) {
  skip++;
  console.log(`[SKIP] ${name} （${reason}）`);
}

/** あれば require、無ければ null（未統合モジュールをスキップ判定するため）。 */
function tryRequire(rel) {
  try {
    return require(path.join("..", rel));
  } catch (err) {
    // モジュール本体が見つからない場合のみ「未統合」とみなす。
    // それ以外（依存の読込エラー等）は原因を表示しつつ null 扱い。
    if (err && err.code === "MODULE_NOT_FOUND") return null;
    console.log(`       → require("${rel}") で例外: ${err && err.message}`);
    return null;
  }
}

// ------------------------------------------------------------------ //
// 1) stt/postprocess.js : applyDictionary（辞書置換の代表ケース）
// ------------------------------------------------------------------ //
async function testPostprocess() {
  const mod = tryRequire("stt/postprocess.js");
  if (!mod || typeof mod.applyDictionary !== "function") {
    return skipGroup("stt/postprocess.js applyDictionary", "未統合 or applyDictionary 不在");
  }
  const apply = mod.applyDictionary;

  // カタカナ読み → 英略語
  await test("applyDictionary: イーピーティー → EPT", () => {
    assert.strictEqual(apply("イーピーティー陽性"), "EPT陽性");
  });

  // プロービング値の表記統一（PD Nmm）
  await test("applyDictionary: プロービング4ミリ → PD 4mm", () => {
    assert.strictEqual(apply("プロービング4ミリ"), "PD 4mm");
  });

  // 歯式記号の統一（数字は触らない）
  await test("applyDictionary: シャープ46 → #46", () => {
    assert.strictEqual(apply("シャープ46"), "#46");
  });

  // BOP
  await test("applyDictionary: ビーオーピー → BOP", () => {
    assert.strictEqual(apply("ビーオーピー陽性"), "BOP陽性");
  });

  // SRP
  await test("applyDictionary: エスアールピー → SRP", () => {
    assert.strictEqual(apply("エスアールピー実施"), "SRP実施");
  });

  // v1 追加ルール（誤変換の訂正）
  await test("applyDictionary: ガッタパッチャ → ガッタパーチャ", () => {
    assert.strictEqual(apply("根管をガッタパッチャで充填"), "根管をガッタパーチャで充填");
  });
  await test("applyDictionary: バツズイ → 抜髄", () => {
    assert.strictEqual(apply("麻酔下でバツズイを実施"), "麻酔下で抜髄を実施");
  });
  await test("applyDictionary: 根管帳測定 → 根管長測定", () => {
    assert.strictEqual(apply("EMRで根管帳測定"), "EMRで根管長測定");
  });
  await test("applyDictionary: 打診痛プラス → 打診痛(+)", () => {
    assert.strictEqual(apply("打診痛プラス"), "打診痛(+)");
  });

  // v1 誤爆ガード（通常会話・別文脈は壊さない）
  await test("applyDictionary[誤爆防止]: バツイチ/罰 は変えない", () => {
    assert.strictEqual(apply("バツイチの友人に罰が当たる"), "バツイチの友人に罰が当たる");
  });
  await test("applyDictionary[誤爆防止]: プラス思考 は変えない", () => {
    assert.strictEqual(apply("プラス思考でいきましょう"), "プラス思考でいきましょう");
  });
  await test("applyDictionary[誤爆防止]: 通帳の測定 は変えない", () => {
    assert.strictEqual(apply("銀行の通帳を記帳して身長を測定する"), "銀行の通帳を記帳して身長を測定する");
  });

  // 空・falsy はそのまま返す（破壊しない）
  await test("applyDictionary: 空文字はそのまま", () => {
    assert.strictEqual(apply(""), "");
  });
}

// ------------------------------------------------------------------ //
// 2) stt/index.js : transcribe のフォールバック（ENGINES差し替え→復元）
// ------------------------------------------------------------------ //
async function testIndexFallback() {
  const mod = tryRequire("stt/index.js");
  if (!mod || typeof mod.transcribe !== "function" || !mod.ENGINES) {
    return skipGroup("stt/index.js transcribe フォールバック", "未統合 or transcribe/ENGINES 不在");
  }
  const { transcribe, ENGINES } = mod;

  // 元のエンジン定義を退避（テスト後に必ず復元する）。
  const saved = { ...ENGINES };
  const savedProvider = process.env.STT_PROVIDER;
  const savedFallback = process.env.STT_FALLBACK;

  // ENGINES のキーを今のテスト用差し替えに合わせて掃除するヘルパ。
  function setEngines(map) {
    for (const k of Object.keys(ENGINES)) delete ENGINES[k];
    Object.assign(ENGINES, map);
  }

  try {
    // --- 主エンジン失敗 → 予備成功 → 後処理適用 ---
    await test("transcribe: 主失敗→予備成功で予備の結果を後処理して返す", async () => {
      let primaryCalled = false;
      let backupCalled = false;
      setEngines({
        primary: async () => {
          primaryCalled = true;
          const e = new Error("primary down");
          e.status = 502;
          throw e;
        },
        // 予備は辞書で置換される生テキストを返す（後処理適用を確認するため）。
        backup: async () => {
          backupCalled = true;
          return { text: "イーピーティー陽性" };
        },
      });
      process.env.STT_PROVIDER = "primary";
      process.env.STT_FALLBACK = "backup";

      const out = await transcribe(Buffer.from([0]), { filename: "a.webm", mime: "audio/webm" });
      assert.ok(primaryCalled, "主エンジンが呼ばれていない");
      assert.ok(backupCalled, "予備エンジンが呼ばれていない");
      assert.strictEqual(out.provider, "backup", "採用プロバイダが予備でない");
      // 後処理（applyDictionary）が効いて EPT に正規化されていること。
      assert.strictEqual(out.text, "EPT陽性", "予備結果に後処理が適用されていない");
    });

    // --- 主エンジンが空文字 → 予備へフォールバック ---
    await test("transcribe: 主が空文字→予備へフォールバック", async () => {
      let backupCalled = false;
      setEngines({
        primary: async () => ({ text: "   " }), // 空白のみ=認識失敗扱い
        backup: async () => {
          backupCalled = true;
          return { text: "シャープ46" };
        },
      });
      process.env.STT_PROVIDER = "primary";
      process.env.STT_FALLBACK = "backup";

      const out = await transcribe(Buffer.from([0]), {});
      assert.ok(backupCalled, "空文字でフォールバックしていない");
      assert.strictEqual(out.provider, "backup");
      assert.strictEqual(out.text, "#46", "後処理が適用されていない");
    });

    // --- 全滅: 最後の例外を投げる ---
    await test("transcribe: 全エンジン失敗なら throw", async () => {
      setEngines({
        primary: async () => {
          const e = new Error("p down");
          e.status = 502;
          throw e;
        },
        backup: async () => {
          const e = new Error("b down");
          e.status = 503;
          throw e;
        },
      });
      process.env.STT_PROVIDER = "primary";
      process.env.STT_FALLBACK = "backup";

      await assert.rejects(
        () => transcribe(Buffer.from([0]), {}),
        (e) => e instanceof Error
      );
    });
  } finally {
    // 何があっても ENGINES と環境変数を元へ戻す（他テストへの汚染防止）。
    setEngines(saved);
    if (savedProvider === undefined) delete process.env.STT_PROVIDER;
    else process.env.STT_PROVIDER = savedProvider;
    if (savedFallback === undefined) delete process.env.STT_FALLBACK;
    else process.env.STT_FALLBACK = savedFallback;
  }
}

// ------------------------------------------------------------------ //
// 3) eval/score.js : cer/wer/scorePair（あれば。未統合なら SKIP）
// ------------------------------------------------------------------ //
async function testScore() {
  const mod = tryRequire("eval/score.js");
  if (!mod) {
    return skipGroup("eval/score.js cer/wer/scorePair", "未統合（ファイル不在）");
  }

  // CER: ref="abc", hyp="abd" は 1編集（c→d）/ 参照長3 = 1/3。
  // 実装は { rate, dist, refLen } を返す（rate が誤り率）。命名揺れに耐えるため
  // 数値で返る実装にも、オブジェクトで返る実装にも対応して rate を取り出す。
  const rateOf = (v) => (typeof v === "number" ? v : v && typeof v.rate === "number" ? v.rate : NaN);
  if (typeof mod.cer === "function") {
    await test("score.cer: abc vs abd = 1/3", () => {
      const v = rateOf(mod.cer("abc", "abd"));
      assert.ok(Math.abs(v - 1 / 3) < 1e-9, `期待 1/3, 実際 ${v}`);
    });
    await test("score.cer: 完全一致は 0", () => {
      assert.strictEqual(rateOf(mod.cer("#46 EPT陽性", "#46 EPT陽性")), 0);
    });
  } else {
    skipGroup("eval/score.js cer", "cer 不在");
  }

  // WER: ref="a b c", hyp="a b d" は 1語置換 / 3語 = 1/3。
  if (typeof mod.wer === "function") {
    await test("score.wer: 'a b c' vs 'a b d' = 1/3", () => {
      const v = rateOf(mod.wer("a b c", "a b d"));
      assert.ok(Math.abs(v - 1 / 3) < 1e-9, `期待 1/3, 実際 ${v}`);
    });
  } else {
    skipGroup("eval/score.js wer", "wer 不在");
  }

  // scorePair: ペアを採点して指標オブジェクトを返す想定。
  // 歯番取り違え（#46→#36）が1件カウントされること。
  if (typeof mod.scorePair === "function") {
    await test("score.scorePair: cer を含む指標を返す", () => {
      const r = mod.scorePair("abc", "abd");
      assert.ok(r && typeof r === "object", "オブジェクトを返していない");
      assert.ok(r.cer != null, "cer 指標がない");
      const c = rateOf(r.cer);
      assert.ok(Math.abs(c - 1 / 3) < 1e-9, `cer 期待 1/3, 実際 ${c}`);
    });

    await test("score.scorePair: 歯番取り違え(#46→#36)を1件カウント", () => {
      const r = mod.scorePair("#46 を抜髄", "#36 を抜髄");
      // 実装は tooth を多重集合統計 { tp, missing, extra, errRate, ... } で返す。
      // #46→#36 は「正解#46を取りこぼし(missing=1)・余分な#36(extra=1)」= 取り違え1件。
      // 命名揺れに耐えるため、専用フィールドが無ければ tooth.missing / tooth.errRate から拾う。
      const t = r.tooth;
      assert.ok(t != null, "歯番指標(tooth)が見当たらない");
      const mix =
        r.toothMix != null ? r.toothMix
        : r.toothConfusion != null ? r.toothConfusion
        : r.toothSwap != null ? r.toothSwap
        : r.swap != null ? r.swap
        : (t && typeof t.missing === "number") ? t.missing
        : null;
      assert.ok(mix != null, "歯番取り違えカウント用フィールドが見当たらない");
      assert.strictEqual(Number(mix), 1, `取り違え件数 期待 1, 実際 ${mix}`);
      // 取り違えがあれば errRate は 0 ではない（取りこぼし率 > 0）。
      if (t && typeof t.errRate === "number") {
        assert.ok(t.errRate > 0, `歯番 errRate 期待 >0, 実際 ${t.errRate}`);
      }
    });
  } else {
    skipGroup("eval/score.js scorePair", "scorePair 不在");
  }
}

// ------------------------------------------------------------------ //
// 4) stt/llmNormalize.js : normalize のフェイルオープン（あれば）
//    ANTHROPIC_API_KEY を一時的に消すと入力がそのまま返る（=API未呼出）。
// ------------------------------------------------------------------ //
async function testLlmNormalizeFailOpen() {
  const mod = tryRequire("stt/llmNormalize.js");
  if (!mod || typeof mod.normalize !== "function") {
    return skipGroup("stt/llmNormalize.js normalize フェイルオープン", "未統合 or normalize 不在");
  }

  const savedKey = process.env.ANTHROPIC_API_KEY;
  try {
    // キーを消す = fail-open。API呼び出しは発生しないはず（入力素通り）。
    delete process.env.ANTHROPIC_API_KEY;

    await test("normalize: キー無しなら入力をそのまま返す", async () => {
      const input = "イーピーティー陽性、#46 を抜髄";
      const out = await mod.normalize(input, {});
      assert.strictEqual(out, input, "キー無しで入力が改変された");
    });

    await test("normalize: 空文字はそのまま返す", async () => {
      const out = await mod.normalize("", {});
      assert.strictEqual(out, "");
    });
  } finally {
    if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = savedKey;
  }
}

// ------------------------------------------------------------------ //
// 実行
// ------------------------------------------------------------------ //
async function main() {
  console.log("=== dentia STT テスト ===");
  await testPostprocess();
  await testIndexFallback();
  await testScore();
  await testLlmNormalizeFailOpen();

  console.log("---------------------------------");
  console.log(`合計: ${pass} pass, ${fail} fail, ${skip} skip`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  // テストランナー自体の予期せぬ例外も失敗扱いにする。
  console.error("テストランナーで予期せぬエラー:", err);
  process.exit(1);
});
