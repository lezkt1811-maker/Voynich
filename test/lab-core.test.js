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

// ---------- Stage 2 ----------

test("plant medicinal claims need a source and a kind; the appearance stays separate", () => {
  assert.throws(() => L.cleanPlant({ folio: "f1r", medicinalClaims: [{ claim: "helps X" }] }), /needs its source/);
  const p = L.cleanPlant({ folio: "f1r", root: "thick", identification: "maybe sage", medicinalClaims: [{ claim: "c", source: "s", kind: "made up" }] });
  assert.strictEqual(p.root, "thick");
  assert.strictEqual(p.identification, "maybe sage");
  assert.strictEqual(p.medicinalClaims[0].kind, "hypothesis");
});

test("symbols default to a hypothesis association and an 'other' kind", () => {
  assert.throws(() => L.cleanSymbol({ folios: ["f1r"] }), /needs a name/);
  const s = L.cleanSymbol({ name: "sun", kind: "celestial", association: "seen", folios: ["f70v", "", " f71r "] });
  assert.strictEqual(s.association, "hypothesis");
  assert.deepStrictEqual(s.folios, ["f70v", "f71r"]);
});

test("translations need the exact passage and an interpretation, and keep the rules used", () => {
  assert.throws(() => L.cleanTranslation({ interpretation: "x" }), /exact EVA passage/);
  assert.throws(() => L.cleanTranslation({ passage: "daiin" }), /Write the interpretation/);
  const t = L.cleanTranslation({ passage: "daiin", interpretation: "a leaf?", rules: ["r1", "", "r1"] });
  assert.deepStrictEqual(t.rules, ["r1", "r1"]);
});

test("rulesUsed lists only the rules that produced output, in first-use order", () => {
  const rules = [
    { id: "a", type: "word", source: "daiin", meaning: "leaf" },
    { id: "b", type: "sequence", source: "ch", meaning: "root" },
    { id: "c", type: "sequence", source: "zz", meaning: "never" },
  ];
  assert.deepStrictEqual(L.rulesUsed("chedy daiin chol", rules), ["b", "a"]);
});

test("hypotheses cannot be revealed before their predictions are locked", () => {
  const h = L.cleanHypothesis({ statement: "s", blindFolios: ["f75r"], predictions: "" });
  assert.throws(() => L.revealBlind(h), /Lock your predictions/);
  assert.throws(() => L.lockPredictions(h), /Write your predictions/);
  const locked = L.lockPredictions({ ...h, predictions: "red hair near stars" }, "2026-01-01T00:00:00.000Z");
  assert.strictEqual(locked.predictionsLockedAt, "2026-01-01T00:00:00.000Z");
  assert.throws(() => L.lockPredictions(locked), /already locked/);
  assert.strictEqual(L.revealBlind(locked, "2026-01-02T00:00:00.000Z").revealedAt, "2026-01-02T00:00:00.000Z");
});

test("a folio stays hidden until every hypothesis that blinds it is revealed", () => {
  const h1 = { blindFolios: ["f75r"], revealedAt: null };
  const h2 = { blindFolios: ["f75r", "f76r"], revealedAt: "x" };
  assert.ok(L.hiddenFolioIds([h1, h2]).has("f75r"));
  assert.ok(!L.hiddenFolioIds([h2]).has("f75r"));
  assert.ok(!L.hiddenFolioIds([h2]).has("f76r"));
});

test("the report does not show drawing descriptions of folios still under blind test", () => {
  const state = L.emptyState();
  state.folios.push(L.cleanFolio({ folio: "f75r", illustration: "SECRET DRAWING", transcription: "daiin" }));
  state.folios.push(L.cleanFolio({ folio: "f76r", illustration: "visible drawing" }));
  state.hypotheses.push(L.cleanHypothesis({ statement: "h", blindFolios: ["f75r"] }));
  const report = L.buildReport(state);
  assert.ok(!report.includes("SECRET DRAWING"));
  assert.ok(report.includes("visible drawing"));
  assert.ok(report.includes("daiin"));
  assert.match(report, /has not been deciphered/);
  const revealed = { ...state, hypotheses: [{ ...state.hypotheses[0], revealedAt: "2026-01-02" }] };
  assert.ok(L.buildReport(revealed).includes("SECRET DRAWING"));
});

test("word lengths and position frequencies are counted from the text", () => {
  const dist = L.wordLengthDistribution("ab cd efg", { conventions: false });
  assert.deepStrictEqual(dist, [{ length: 2, count: 2 }, { length: 3, count: 1 }]);
  const pos = L.positionFrequencies("ab ac", { conventions: false }, 2);
  assert.strictEqual(pos.start[1][0].text, "a");
  assert.strictEqual(pos.start[1][0].count, 2);
  assert.strictEqual(pos.end[1].find((e) => e.text === "c").count, 1);
});

test("token n-grams repeat across words and carry locations", () => {
  const g = L.tokenNgrams("daiin chedy daiin chedy", 2, { conventions: false });
  assert.strictEqual(g[0].text, "daiin chedy");
  assert.strictEqual(g[0].count, 2);
  assert.deepStrictEqual(g[0].locations[1], { line: 0, locus: null, index: 2 });
});

test("passage comparison reports shared words and says it is not a translation", () => {
  const c = L.compareTexts("daiin chedy", "daiin shedy", { conventions: false });
  assert.strictEqual(c.sharedWords, 1);
  assert.ok(c.jaccard > 0 && c.jaccard < 1);
  assert.match(c.note, /do not show/);
});

test("cross-folio search finds a sequence in every saved folio, tagged by folio", () => {
  const folios = [L.cleanFolio({ folio: "f1r", transcription: "daiin" }), L.cleanFolio({ folio: "f2r", transcription: "chedy daiin" })];
  const hits = L.crossFolioSearch(folios, "daiin", { conventions: false });
  assert.deepStrictEqual(hits.map((h) => h.folio), ["f1r", "f2r"]);
});

test("merging adds new records of every kind and keeps existing ones", () => {
  const current = L.emptyState();
  current.plants.push(L.cleanPlant({ id: "p1", folio: "f1r" }));
  const incoming = L.emptyState();
  incoming.plants.push(L.cleanPlant({ id: "p1", folio: "changed" }), L.cleanPlant({ id: "p2", folio: "f2r" }));
  incoming.hypotheses.push(L.cleanHypothesis({ id: "h1", statement: "s" }));
  const m = L.mergeNew(current, incoming);
  assert.strictEqual(m.added.plants, 1);
  assert.strictEqual(m.skipped.plants, 1);
  assert.strictEqual(m.added.hypotheses, 1);
  assert.strictEqual(m.data.plants.find((p) => p.id === "p1").folio, "f1r");
});

test("a backup from before stage 2 imports cleanly with the new kinds empty", () => {
  const v = L.validateBackup({ schema: 1, folios: [{ folio: "f1r" }], rules: [] });
  assert.strictEqual(v.ok, true);
  assert.deepStrictEqual(v.data.hypotheses, []);
  const bad = L.validateBackup({ hypotheses: [{ predictions: "x" }], plants: "nope" });
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.errors.length, 2);
});

test("the stage 2 export round-trips every kind of record", () => {
  const state = L.emptyState();
  state.symbols.push(L.cleanSymbol({ name: "sun", folios: ["f70v"] }));
  state.translations.push(L.cleanTranslation({ passage: "daiin", interpretation: "x" }));
  const back = L.validateBackup(JSON.parse(L.exportBackup(state)));
  assert.strictEqual(back.ok, true);
  assert.strictEqual(back.data.symbols[0].name, "sun");
  assert.strictEqual(back.data.translations[0].passage, "daiin");
});

test("folio photos are kept only as embedded image data; anything else is dropped", () => {
  const ok = L.cleanFolio({ folio: "f1r", photo: "data:image/jpeg;base64,AAAA" });
  assert.strictEqual(ok.photo, "data:image/jpeg;base64,AAAA");
  assert.strictEqual(L.cleanFolio({ folio: "f1r", photo: "https://example.com/x.jpg" }).photo, "");
  assert.strictEqual(L.cleanFolio({ folio: "f1r", photo: "data:text/html;base64,AAAA" }).photo, "");
});
