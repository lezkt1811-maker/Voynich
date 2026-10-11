const test = require("node:test");
const assert = require("node:assert");
const DATA = require("../docs/data.js");
const R = require("../docs/reader.js");

test("parses IVTFF lines and strips markup", () => {
  const lines = R.parseTranscription("<f78r>\n<f78r.1,@P0> qokedy.shedy,<->daiin{x} <!comment>[ch:sh]ol\n# note");
  assert.deepStrictEqual(lines, [{ locus: "f78r.1,@P0", words: ["qokedy", "shedy", "daiin", "chol"] }]);
});

test("decomposes affixes around a known stem", () => {
  const data = { ...DATA, evaWords: { k: { gloss: "herb" } } };
  const w = R.annotateWord("qokedy", data);
  assert.deepStrictEqual(w.parts.map((p) => p.gloss), ["(example) 'in / into'", "herb", "(example) noun ending"]);
});

test("bathing folios always carry the safety and disclaimer notes", () => {
  const r = R.read("shedy daiin", { folio: "f78r", hair: ["black"], zodiac: "leo" }, DATA);
  assert.match(r.section, /balneological/);
  assert.ok(r.notes.includes(R.DISCLAIMER));
  assert.ok(r.notes.includes(R.BATH_NOTE));
  assert.ok(r.notes.includes(R.MEDICAL_NOTE));
  assert.strictEqual(r.humors[0].humor, "melancholic");
  assert.strictEqual(r.zodiac.season, "midsummer");
});

test("non-bathing folio has no bath note", () => {
  const r = R.read("daiin", { folio: "f72v3" }, DATA);
  assert.strictEqual(r.section, "zodiac");
  assert.ok(!r.notes.includes(R.BATH_NOTE));
});

test("held-out test scores only words new to the test folio", () => {
  const data = { ...DATA, evaPrefixes: {}, evaSuffixes: {}, evaWords: { daiin: { gloss: "a" }, ol: { gloss: "b" } } };
  const r = R.heldOutTest("daiin chedy", "daiin ol okal", data);
  assert.deepStrictEqual(r.newWords, { known: 1, total: 2, percent: 50, unread: ["okal"] });
  assert.strictEqual(r.test.percent, 67);
  assert.strictEqual(r.fingerprint, R.cipherFingerprint(data));
});

test("hair consistency counts context matches and blind matches", () => {
  const rows = R.hairConsistency([
    { folio: "f78r", hair: "black", contextHumor: "melancholic", blind: true },
    { folio: "f79v", hair: "Black", contextHumor: "choleric", blind: false },
    { folio: "f80r", hair: "black" },
    { folio: "f80r", hair: "red", contextHumor: "choleric", blind: true },
  ], DATA);
  const black = rows.find((r) => r.hair === "black");
  assert.strictEqual(black.seen, 3);
  assert.strictEqual(black.withContext, 2);
  assert.strictEqual(black.matches, 1);
  assert.strictEqual(black.blindMatches, 1);
  assert.deepStrictEqual(black.folios, ["f78r", "f79v", "f80r"]);
});

test("analysis prompt carries the framework and the safety rules", () => {
  const p = R.analysisPrompt(DATA, "f78r", "green pools");
  assert.match(p, /folio f78r/);
  assert.match(p, /black = melancholic/);
  assert.match(p, /never present anything as a translation/);
  assert.match(p, /Never give medical advice/);
  assert.match(p, /never write a passage, recipe, or message to readers/);
  assert.match(p, /say what a plant or water is used for/);
});

test("normalizeAnalysis keeps known fields and tolerates junk", () => {
  const a = R.normalizeAnalysis({ summary: "s", figures: [{ hairColour: "red", extra: 1 }], plants: "nope", zodiac: null });
  assert.strictEqual(a.summary, "s");
  assert.deepStrictEqual(a.figures[0], { position: null, hairColour: "red", humorUnderFramework: null, pose: null, details: null });
  assert.deepStrictEqual(a.plants, []);
  assert.strictEqual(a.zodiac.sign, null);
  assert.deepStrictEqual(R.normalizeAnalysis(null).questions, []);
});

test("every theory has a known evidence status and a source", () => {
  const ok = ["supported", "partly", "open", "contested", "unverified", "unsupported"];
  assert.ok(DATA.theories.length > 0);
  for (const t of DATA.theories) {
    assert.ok(ok.includes(t.status), t.claim);
    assert.ok(t.source && t.evidence, t.claim);
  }
  assert.match(DATA.theorySafety, /houseplants/);
});
