const test = require("node:test");
const assert = require("node:assert");
const L = require("../docs/lab-core.js");

const SAMPLE = "<f78r.1,@P0> qokedy.shedy.daiin\n<f78r.2,+P0> shedy.qokaiin.daiin";

test("analysis counts words, characters and repeats without changing the original text", () => {
  const original = "daiin.shedy daiin";
  const a = L.analyzeText(original, { conventions: false });
  assert.strictEqual(a.words, 3);
  assert.strictEqual(a.repeatedWords[0].text, "daiin");
  assert.strictEqual(a.repeatedWords[0].count, 2);
  assert.strictEqual(original, "daiin.shedy daiin"); // input is never edited
});

test("conventions off keeps IVTFF markup in the counts", () => {
  const withMarkup = L.analyzeText(SAMPLE, { conventions: false });
  const clean = L.analyzeText(SAMPLE, { conventions: true });
  assert.ok(withMarkup.words > clean.words);
  assert.ok(withMarkup.wordFrequency.some((e) => e.text.includes("<")));
  assert.ok(!clean.wordFrequency.some((e) => e.text.includes("<")));
});

test("spaces and punctuation are counted only when chosen", () => {
  const plain = L.analyzeText("ab cd", { conventions: false });
  const spaced = L.analyzeText("ab cd", { conventions: false, spaces: true });
  assert.strictEqual(plain.characters, 4);
  assert.strictEqual(spaced.characters, 5);
});

test("n-grams report counts and locations, and only repeats", () => {
  const g = L.ngrams(SAMPLE, 2);
  const daii = g.find((e) => e.text === "ai");
  assert.ok(daii && daii.count >= 2);
  assert.ok(daii.locations.every((l) => typeof l.position === "number" && l.word));
  assert.ok(g.every((e) => e.count > 1));
});

test("search finds substrings with the line and locus they sit on", () => {
  const hits = L.search(SAMPLE, "daiin");
  assert.strictEqual(hits.length, 2);
  assert.strictEqual(hits[0].locus, "f78r.1,@P0");
  assert.strictEqual(L.search(SAMPLE, "dai", { wholeWord: true }).length, 0);
});

test("literal mode applies only the rules the user defined and flags the rest", () => {
  const rules = [{ id: "r1", type: "word", source: "daiin", meaning: "leaf" }];
  const out = L.applyLiteral("daiin chedy", rules);
  assert.strictEqual(out[0].tokens[0].pieces[0].rule, "r1");
  assert.strictEqual(out[0].tokens[0].pieces[0].meaning, "leaf");
  assert.strictEqual(out[0].tokens[1].pieces[0].rule, null); // chedy is unmapped, not guessed
  assert.strictEqual(out[0].tokens[1].unmapped, 5);
});

test("sequence rules replace the pieces they match and keep the rest flagged", () => {
  const rules = [{ id: "s1", type: "sequence", source: "ed", meaning: "[ed]" }];
  const [{ tokens }] = L.applyLiteral("qokedy", rules);
  assert.deepStrictEqual(tokens[0].pieces.map((p) => p.rule), [null, "s1", null]);
  assert.strictEqual(tokens[0].unmapped, 4);
});

test("longest-first priority picks the longer of two overlapping sequence rules", () => {
  const rules = [
    { id: "short", type: "sequence", source: "o", meaning: "short" },
    { id: "long", type: "sequence", source: "ok", meaning: "long" },
  ];
  assert.strictEqual(L.applyLiteral("okal", rules, { priority: "longest" })[0].tokens[0].pieces[0].rule, "long");
  assert.strictEqual(L.applyLiteral("okal", rules, { priority: "listed" })[0].tokens[0].pieces[0].rule, "short");
});

test("unmapped summary counts untouched and partly mapped tokens", () => {
  const rules = [{ id: "r", type: "word", source: "daiin", meaning: "x" }];
  const s = L.unmappedSummary("daiin chedy shedy", rules);
  assert.deepStrictEqual(s, { tokens: 3, untouched: 2, partial: 0 });
});

test("pattern mode returns observations with no meanings attached", () => {
  const p = L.patternExplore(SAMPLE, { sizes: [2] });
  assert.match(p.note, /not a translation/);
  assert.ok(p.sizes[2].length > 0);
  assert.ok(!("meaning" in p.sizes[2][0]));
});

test("folio records need an identifier and fall back to safe defaults", () => {
  assert.throws(() => L.cleanFolio({ transcription: "x" }), /folio identifier/);
  const f = L.cleanFolio({ folio: "f78r", confidence: "certain", status: "done" });
  assert.strictEqual(f.confidence, "low");
  assert.strictEqual(f.status, "unreviewed");
});

test("related folios need a stated reason", () => {
  const f = L.cleanFolio({ folio: "f78r", related: [{ folio: "f79r" }, { folio: "f80r", reason: "same plant" }] });
  assert.deepStrictEqual(f.related, [{ folio: "f80r", reason: "same plant" }]);
});

test("cipher rules need a source and a meaning, and get a category", () => {
  assert.throws(() => L.cleanRule({ meaning: "leaf" }), /EVA source/);
  assert.throws(() => L.cleanRule({ source: "daiin" }), /proposed meaning/);
  assert.strictEqual(L.cleanRule({ source: "daiin", meaning: "leaf", category: "Made up" }).category, "Unknown");
});

test("backup validation reports bad records and writes nothing", () => {
  const bad = L.validateBackup({ folios: [{ transcription: "x" }], rules: [{ source: "a" }] });
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.errors.length, 2);
  assert.strictEqual(L.validateBackup("not an object").ok, false);
  assert.strictEqual(L.validateBackup({ schema: 99 }).ok, false);
});

test("merging a backup adds new ids and never overwrites existing ones", () => {
  const current = { folios: [{ id: "a", folio: "f1r" }], rules: [] };
  const incoming = { folios: [{ id: "a", folio: "changed" }, { id: "b", folio: "f2r" }], rules: [] };
  const m = L.mergeNew(current, incoming);
  assert.strictEqual(m.added.folios, 1);
  assert.strictEqual(m.skipped.folios, 1);
  assert.strictEqual(m.data.folios.find((f) => f.id === "a").folio, "f1r");
});

test("CSV quotes cells and neutralises spreadsheet formulas", () => {
  assert.strictEqual(L.csvCell('say "hi"'), '"say ""hi"""');
  assert.strictEqual(L.csvCell("=HYPERLINK(1)"), "\"'=HYPERLINK(1)\"");
  const csv = L.toCSV([{ source: "daiin", meaning: "leaf, green" }], ["source", "meaning"]);
  assert.strictEqual(csv, 'source,meaning\r\n"daiin","leaf, green"\r\n');
});

test("dashboard counts records and reports unmapped tokens for the sample", () => {
  const state = { folios: [L.cleanFolio({ folio: "f78r" })], rules: [L.cleanRule({ source: "daiin", meaning: "x" })] };
  const d = L.dashboard(state, "daiin chedy", { conventions: false });
  assert.strictEqual(d.folios, 1);
  assert.strictEqual(d.rules, 1);
  assert.strictEqual(d.unmapped.untouched, 1);
});
