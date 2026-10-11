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
