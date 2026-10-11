// Voynich Cipher Lab: the logic behind the lab page. Pure functions only, so
// they can be tested in Node. Everything here is computation on the text the
// user supplies, or the user's own records. Nothing is treated as a
// translation, and no rule is applied unless the user defined it.
// Works in the browser (window.VoynichLab) and in Node (require).
(function (root) {
  const R = typeof require === "function" ? require("./reader.js") : root.VoynichReader;

  const CATEGORIES = ["Botanical", "Anatomy", "Menstrual cycle", "Reproductive health", "Astrology",
    "Seasonal timing", "Water or bathing", "Alchemy", "Unknown", "Other"];
  const CONFIDENCE = ["low", "medium", "high"];
  const STATUS = ["unreviewed", "in progress", "tested", "rejected"];
  const SYMBOL_KINDS = ["zodiac", "celestial", "diagram", "numerical", "other"];
  const ASSOCIATIONS = ["visible", "documented", "hypothesis"];
  const CLAIM_KINDS = ["historical claim", "modern claim", "hypothesis"];
  const HYP_STATUS = ["untested", "under investigation", "supported by test", "not supported by test"];
  // Every kind of record the backup file holds, in the order they are listed.
  const KINDS = ["folios", "rules", "plants", "symbols", "translations", "hypotheses"];
  // Folio fields that describe what is drawn on the page. A blind test hides these.
  const VISUAL_FOLIO_FIELDS = ["illustration", "botany", "figures", "astronomy"];
  const PLANT_VISUAL_FIELDS = ["illustration", "root", "stem", "leaf", "flowerFruit"];
  const SCHEMA = 1;

  // ---------- Text analysis ----------

  // Splits the transcription into lines of words. With conventions on, IVTFF
  // markup is stripped with the same rules the reader uses. With them off,
  // the raw text is split only on whitespace and dots/commas, so the markup is
  // counted as the user wrote it.
  function tokenize(text, opts) {
    const o = opts || {};
    if (o.conventions !== false) return R.parseTranscription(text);
    const lines = [];
    for (const raw of String(text).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const words = line.split(/[\s.,]+/).filter(Boolean);
      if (words.length) lines.push({ locus: null, words });
    }
    return lines;
  }

  // The character stream the counts are taken from. Separators are included
  // only when the user asks for them.
  function separatorOf(opts) {
    if (opts && opts.punct) return ".";
    if (opts && opts.spaces) return " ";
    return "";
  }

  function countBy(items, keyFn) {
    const m = new Map();
    for (const it of items) { const k = keyFn(it); m.set(k, (m.get(k) || 0) + 1); }
    return m;
  }
  function sortedEntries(map, limit) {
    return [...map.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, limit || Infinity)
      .map(([text, count]) => ({ text, count }));
  }

  // Counts for the text as entered. Returns numbers and tables only.
  function analyzeText(text, opts) {
    const lines = tokenize(text, opts);
    const words = lines.flatMap((l) => l.words);
    const sep = separatorOf(opts);
    const stream = words.join(sep);
    const chars = [...stream];
    const wordCounts = countBy(words, (w) => w);
    const repeatedWords = sortedEntries(wordCounts).filter((e) => e.count > 1);
    const first = countBy(words, (w) => w[0]);
    const last = countBy(words, (w) => w[w.length - 1]);
    return {
      characters: chars.length,
      words: words.length,
      tokens: words.length + (sep === "." ? Math.max(0, words.length - 1) : 0),
      uniqueCharacters: new Set(chars).size,
      charFrequency: sortedEntries(countBy(chars, (c) => (c === " " ? "[space]" : c))),
      wordFrequency: sortedEntries(wordCounts, 50),
      repeatedWords: repeatedWords.slice(0, 50),
      firstChar: sortedEntries(first, 20),
      lastChar: sortedEntries(last, 20),
      prefixes: affixCounts(words, 3, true),
      suffixes: affixCounts(words, 3, false),
      normalized: lines.map((l) => (l.locus ? l.locus + "  " : "") + l.words.join(" ")).join("\n"),
    };
  }

  // Counts of the first (or last) 1..maxLen characters of words longer than that length.
  function affixCounts(words, maxLen, atStart) {
    const out = {};
    for (let n = 1; n <= maxLen; n++) {
      const m = countBy(words.filter((w) => w.length > n), (w) => (atStart ? w.slice(0, n) : w.slice(-n)));
      out[n] = sortedEntries(m, 15);
    }
    return out;
  }

  // Character n-grams inside words, with where each one occurs. Only grams
  // that occur at least twice are returned. These are computational
  // observations, not meanings.
  function ngrams(text, n, opts) {
    const lines = tokenize(text, opts);
    const found = new Map();
    lines.forEach((line, li) => line.words.forEach((w) => {
      for (let p = 0; p + n <= w.length; p++) {
        const g = w.slice(p, p + n);
        if (!found.has(g)) found.set(g, { text: g, count: 0, locations: [] });
        const e = found.get(g);
        e.count++;
        if (e.locations.length < 50) e.locations.push({ line: li, locus: line.locus, word: w, position: p });
      }
    }));
    return [...found.values()].filter((e) => e.count > 1).sort((a, b) => b.count - a.count || (a.text < b.text ? -1 : 1));
  }

  // Every occurrence of a query, with the word it sits in. Matches are
  // substrings unless wholeWord is set.
  function search(text, query, opts) {
    const q = String(query || "");
    if (!q) return [];
    const whole = !!(opts && opts.wholeWord);
    const lines = tokenize(text, opts);
    const hits = [];
    lines.forEach((line, li) => line.words.forEach((w, wi) => {
      if (whole ? w === q : w.includes(q)) hits.push({ line: li, locus: line.locus, wordIndex: wi, word: w });
    }));
    return hits;
  }

  // Word-length distribution: how many words have each length.
  function wordLengthDistribution(text, opts) {
    const words = tokenize(text, opts).flatMap((l) => l.words);
    const m = countBy(words, (w) => w.length);
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([length, count]) => ({ length, count }));
  }

  // Which characters occur at each position counted from the start and from
  // the end of words, for positions 1..maxPos.
  function positionFrequencies(text, opts, maxPos) {
    const n = maxPos || 3;
    const words = tokenize(text, opts).flatMap((l) => l.words);
    const start = {}, end = {};
    for (let p = 1; p <= n; p++) {
      const long = words.filter((w) => w.length >= p);
      start[p] = sortedEntries(countBy(long, (w) => w[p - 1]), 10);
      end[p] = sortedEntries(countBy(long, (w) => w[w.length - p]), 10);
    }
    return { start, end };
  }

  // Runs of n consecutive words, within each line, with where they occur.
  function tokenNgrams(text, n, opts) {
    const lines = tokenize(text, opts);
    const found = new Map();
    lines.forEach((line, li) => {
      for (let i = 0; i + n <= line.words.length; i++) {
        const g = line.words.slice(i, i + n).join(" ");
        if (!found.has(g)) found.set(g, { text: g, count: 0, locations: [] });
        const e = found.get(g);
        e.count++;
        if (e.locations.length < 50) e.locations.push({ line: li, locus: line.locus, index: i });
      }
    });
    return [...found.values()].filter((e) => e.count > 1).sort((a, b) => b.count - a.count || (a.text < b.text ? -1 : 1));
  }

  // Compares two passages by the words and word pairs they share. Shared
  // vocabulary is a computational observation. It does not show that the two
  // passages mean the same thing.
  function compareTexts(a, b, opts) {
    const wa = tokenize(a, opts).flatMap((l) => l.words);
    const wb = tokenize(b, opts).flatMap((l) => l.words);
    const sa = new Set(wa), sb = new Set(wb);
    const shared = [...sa].filter((w) => sb.has(w));
    const union = new Set([...sa, ...sb]).size;
    const pairs = (ws) => new Set(ws.slice(1).map((w, i) => ws[i] + " " + w));
    const pa = pairs(wa), pb = pairs(wb);
    const sharedPairs = [...pa].filter((x) => pb.has(x));
    return {
      wordsA: wa.length, wordsB: wb.length, distinctA: sa.size, distinctB: sb.size,
      sharedWords: shared.length, jaccard: union ? shared.length / union : 0,
      sharedWordList: shared.slice(0, 50), sharedPairs: sharedPairs.slice(0, 50),
      note: "Computational observation only. Shared words do not show that the passages mean the same thing.",
    };
  }

  // Searches the transcriptions of several folio records for one sequence.
  function crossFolioSearch(folios, query, opts) {
    const hits = [];
    for (const f of folios) for (const h of search(f.transcription, query, opts)) hits.push({ folio: f.folio, id: f.id, ...h });
    return hits;
  }

  // ---------- Mode A: literal substitution ----------

  // Applies only the rules the user defined. A whole-word rule replaces a
  // token it matches exactly. Otherwise the token is scanned left to right,
  // and sequence rules replace the pieces they match. Characters no rule
  // covers are kept and flagged as unmapped. Each piece records the rule that
  // produced it, so the output can be traced back to the rules.
  // priority: "longest" (default) tries the longest sequence rule first;
  // "listed" uses the order the rules were entered.
  function applyLiteral(text, rules, opts) {
    const priority = (opts && opts.priority) || "longest";
    const lines = tokenize(text, opts);
    const usable = (rules || []).filter((r) => r && r.source && r.meaning);
    const whole = usable.filter((r) => r.type === "word");
    let seq = usable.filter((r) => r.type !== "word");
    if (priority === "longest") seq = seq.slice().sort((a, b) => b.source.length - a.source.length);
    return lines.map((line) => ({
      locus: line.locus,
      tokens: line.words.map((token) => mapToken(token, whole, seq)),
    }));
  }

  function mapToken(token, whole, seq) {
    const exact = whole.find((r) => r.source === token);
    if (exact) return { token, pieces: [{ text: token, rule: exact.id, meaning: exact.meaning }], unmapped: 0 };
    const pieces = [];
    let unmapped = "";
    const flush = () => { if (unmapped) { pieces.push({ text: unmapped, rule: null, meaning: null }); unmapped = ""; } };
    let i = 0;
    while (i < token.length) {
      const hit = seq.find((r) => token.startsWith(r.source, i));
      if (hit) {
        flush();
        pieces.push({ text: hit.source, rule: hit.id, meaning: hit.meaning });
        i += hit.source.length;
      } else {
        unmapped += token[i];
        i++;
      }
    }
    flush();
    const unmappedCount = pieces.filter((p) => !p.rule).reduce((n, p) => n + p.text.length, 0);
    return { token, pieces, unmapped: unmappedCount };
  }

  // Counts tokens the current rules leave completely or partly unmapped.
  function unmappedSummary(text, rules, opts) {
    const out = applyLiteral(text, rules, opts);
    let tokens = 0, untouched = 0, partial = 0;
    for (const line of out) for (const t of line.tokens) {
      tokens++;
      if (t.pieces.every((p) => !p.rule)) untouched++;
      else if (t.unmapped) partial++;
    }
    return { tokens, untouched, partial };
  }

  // The rule ids that actually produced output for a passage, in first-use order.
  function rulesUsed(text, rules, opts) {
    const ids = [];
    for (const line of applyLiteral(text, rules, opts)) for (const t of line.tokens) for (const p of t.pieces) {
      if (p.rule && !ids.includes(p.rule)) ids.push(p.rule);
    }
    return ids;
  }

  // ---------- Mode B: pattern exploration ----------

  // Shows recurring sequences with counts and locations. Carries no meanings.
  function patternExplore(text, opts) {
    const o = opts || {};
    const sizes = o.sizes || [2, 3, 4];
    const result = {};
    for (const n of sizes) result[n] = ngrams(text, n, o).slice(0, 25);
    return { note: "Computational observations only. A recurring sequence is not a translation.", sizes: result };
  }

  // ---------- Records ----------

  function newId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }
  const str = (v) => (v == null ? "" : String(v));
  const strList = (v) => (Array.isArray(v) ? v.map((x) => str(x).trim()).filter(Boolean) : []);
  const nowIso = () => new Date().toISOString();

  // Keeps only the fields the lab knows about, with a default for each.
  // Throws a readable message for anything malformed.
  function cleanFolio(f) {
    if (!f || typeof f !== "object") throw new Error("A folio record must be an object.");
    const folio = str(f.folio).trim();
    if (!folio) throw new Error("Each folio record needs a folio identifier, such as f78r.");
    const related = Array.isArray(f.related) ? f.related.filter((r) => r && r.folio && r.reason).map((r) => ({ folio: str(r.folio), reason: str(r.reason) })) : [];
    const rec = {
      id: str(f.id) || newId("folio"), folio,
      confidence: CONFIDENCE.includes(f.confidence) ? f.confidence : "low",
      status: STATUS.includes(f.status) ? f.status : "unreviewed",
      related,
      dateAdded: str(f.dateAdded) || nowIso(), dateEdited: str(f.dateEdited) || str(f.dateAdded) || nowIso(),
    };
    for (const k of ["section", "transcription", "illustration", "botany", "figures", "astronomy", "interpretation",
      "alternatives", "evidenceFor", "evidenceAgainst", "sources", "notes"]) rec[k] = str(f[k]);
    return rec;
  }

  // Keeps only the fields the lab knows about. Source and meaning are required.
  function cleanRule(r) {
    if (!r || typeof r !== "object") throw new Error("A cipher rule must be an object.");
    const source = str(r.source).trim();
    const meaning = str(r.meaning).trim();
    if (!source) throw new Error("Each cipher rule needs an EVA source, such as daiin.");
    if (!meaning) throw new Error("Each cipher rule needs a proposed meaning.");
    return {
      id: str(r.id) || newId("rule"),
      type: r.type === "word" ? "word" : "sequence", source, meaning,
      category: CATEGORIES.includes(r.category) ? r.category : "Unknown",
      confidence: CONFIDENCE.includes(r.confidence) ? r.confidence : "low",
      explanation: str(r.explanation), evidence: str(r.evidence), folio: str(r.folio), notes: str(r.notes),
      dateAdded: str(r.dateAdded) || nowIso(),
    };
  }

  // A plant's appearance, its proposed identification, and any medicinal
  // claim are stored in separate fields. Every medicinal claim needs a source,
  // and the lab does not write treatment advice.
  function cleanPlant(p) {
    if (!p || typeof p !== "object") throw new Error("A plant record must be an object.");
    const folio = str(p.folio).trim();
    if (!folio) throw new Error("Each plant record needs a folio identifier.");
    const medicinalClaims = (Array.isArray(p.medicinalClaims) ? p.medicinalClaims : []).map((c) => {
      const claim = str(c && c.claim).trim();
      if (!claim) return null;
      const source = str(c.source).trim();
      if (!source) throw new Error("A medicinal claim needs its source. Write 'none found' if you have not located one.");
      return { claim, source, kind: CLAIM_KINDS.includes(c.kind) ? c.kind : "hypothesis" };
    }).filter(Boolean);
    const rec = {
      id: str(p.id) || newId("plant"), folio, medicinalClaims,
      confidence: CONFIDENCE.includes(p.confidence) ? p.confidence : "low",
      dateAdded: str(p.dateAdded) || nowIso(), dateEdited: str(p.dateEdited) || str(p.dateAdded) || nowIso(),
    };
    for (const k of ["illustration", "root", "stem", "leaf", "flowerFruit", "identification", "alternatives", "references", "notes"]) rec[k] = str(p[k]);
    return rec;
  }

  // A symbol (zodiac sign, star, diagram, number pattern) linked to folios.
  // The association says whether it is visible, documented, or a hypothesis.
  function cleanSymbol(s) {
    if (!s || typeof s !== "object") throw new Error("A symbol record must be an object.");
    const name = str(s.name).trim();
    if (!name) throw new Error("Each symbol needs a name.");
    return {
      id: str(s.id) || newId("symbol"), name,
      kind: SYMBOL_KINDS.includes(s.kind) ? s.kind : "other",
      association: ASSOCIATIONS.includes(s.association) ? s.association : "hypothesis",
      folios: strList(s.folios), description: str(s.description), notes: str(s.notes),
      dateAdded: str(s.dateAdded) || nowIso(),
    };
  }

  // A proposed translation of one exact passage. It is always labelled as a
  // hypothesis, and it keeps the rule ids used to produce it.
  function cleanTranslation(t) {
    if (!t || typeof t !== "object") throw new Error("A translation record must be an object.");
    const passage = str(t.passage);
    if (!passage.trim()) throw new Error("Each translation needs the exact EVA passage it translates.");
    const interpretation = str(t.interpretation).trim();
    if (!interpretation) throw new Error("Write the interpretation. It will be labelled as a hypothesis.");
    return {
      id: str(t.id) || newId("translation"), passage, folio: str(t.folio), rules: strList(t.rules),
      interpretation, alternatives: str(t.alternatives),
      confidence: CONFIDENCE.includes(t.confidence) ? t.confidence : "low",
      evidenceFor: str(t.evidenceFor), evidenceAgainst: str(t.evidenceAgainst),
      dateAdded: str(t.dateAdded) || nowIso(),
    };
  }

  // A research hypothesis. Predictions are locked before any blind folio is
  // revealed, so the comparison cannot be written after seeing the answer.
  function cleanHypothesis(h) {
    if (!h || typeof h !== "object") throw new Error("A hypothesis record must be an object.");
    const statement = str(h.statement).trim();
    if (!statement) throw new Error("Each hypothesis needs a statement.");
    return {
      id: str(h.id) || newId("hyp"), statement,
      status: HYP_STATUS.includes(h.status) ? h.status : "untested",
      confidence: CONFIDENCE.includes(h.confidence) ? h.confidence : "low",
      folios: strList(h.folios), blindFolios: strList(h.blindFolios),
      predictions: str(h.predictions), predictionsLockedAt: h.predictionsLockedAt ? str(h.predictionsLockedAt) : null,
      revealedAt: h.revealedAt ? str(h.revealedAt) : null,
      supporting: str(h.supporting), contradicting: str(h.contradicting), testResults: str(h.testResults), notes: str(h.notes),
      dateAdded: str(h.dateAdded) || nowIso(), dateEdited: str(h.dateEdited) || str(h.dateAdded) || nowIso(),
    };
  }

  // ---------- Blind testing ----------

  // Locks the predictions. After this the predictions text cannot be edited.
  function lockPredictions(h, at) {
    if (h.predictionsLockedAt) throw new Error("These predictions are already locked.");
    if (!h.predictions.trim()) throw new Error("Write your predictions before locking them.");
    return { ...h, predictionsLockedAt: at || nowIso() };
  }

  // Reveals the blind folios. Only allowed after the predictions are locked.
  function revealBlind(h, at) {
    if (!h.predictionsLockedAt) throw new Error("Lock your predictions before revealing the blind folios.");
    if (!h.blindFolios.length) throw new Error("This hypothesis has no blind folios to reveal.");
    return { ...h, revealedAt: at || nowIso() };
  }

  // Folio identifiers whose drawing descriptions are hidden right now. A folio
  // stays hidden while any hypothesis that blinds it has not been revealed.
  function hiddenFolioIds(hypotheses) {
    const hidden = new Set();
    for (const h of hypotheses || []) {
      if (h.revealedAt) continue;
      for (const f of h.blindFolios) hidden.add(f);
    }
    return hidden;
  }

  // ---------- Import, export, validation ----------

  const CLEANERS = { folios: cleanFolio, rules: cleanRule, plants: cleanPlant, symbols: cleanSymbol, translations: cleanTranslation, hypotheses: cleanHypothesis };

  function emptyState() {
    const s = {};
    for (const k of KINDS) s[k] = [];
    return s;
  }

  // Fills in any list a caller left out, so older state objects still work.
  function withDefaults(state) {
    const s = { ...emptyState(), ...(state || {}) };
    for (const k of KINDS) if (!Array.isArray(s[k])) s[k] = [];
    return s;
  }

  // Checks a backup file before anything is loaded. Returns the cleaned
  // records, or the errors found. Nothing is written by this function. Kinds
  // missing from an older backup are read as empty.
  function validateBackup(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, errors: ["The file is not a lab backup object."] };
    const errors = [];
    if (obj.schema !== undefined && obj.schema !== SCHEMA) errors.push("Unknown backup schema " + obj.schema + "; expected " + SCHEMA + ".");
    const data = emptyState();
    for (const kind of KINDS) {
      if (obj[kind] === undefined) continue;
      if (!Array.isArray(obj[kind])) { errors.push("'" + kind + "' must be a list."); continue; }
      obj[kind].forEach((rec, i) => {
        try { data[kind].push(CLEANERS[kind](rec)); } catch (e) { errors.push(kind + "[" + i + "]: " + e.message); }
      });
    }
    if (errors.length) return { ok: false, errors };
    return { ok: true, data };
  }

  // Adds incoming records whose ids are not already in the library. Existing
  // records are never overwritten by this function; the caller decides on replace.
  function mergeNew(current, incoming) {
    const next = {}, added = {}, skipped = {};
    for (const kind of KINDS) {
      const existing = current[kind] || [];
      const have = new Set(existing.map((r) => r.id));
      next[kind] = existing.slice();
      added[kind] = 0; skipped[kind] = 0;
      for (const rec of incoming[kind] || []) {
        if (have.has(rec.id)) { skipped[kind]++; continue; }
        have.add(rec.id); next[kind].push(rec); added[kind]++;
      }
    }
    return { data: next, added, skipped };
  }

  function exportBackup(state) {
    const out = { schema: SCHEMA, exportedAt: nowIso() };
    for (const k of KINDS) out[k] = state[k] || [];
    return JSON.stringify(out, null, 2);
  }

  // Cells that start with a formula character are prefixed so spreadsheets
  // do not run them.
  function csvCell(v) {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function toCSV(rows, columns) {
    return [columns.join(",")].concat(rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))).join("\r\n") + "\r\n";
  }
  const FOLIO_COLUMNS = ["folio", "section", "transcription", "illustration", "botany", "figures", "astronomy",
    "interpretation", "alternatives", "evidenceFor", "evidenceAgainst", "sources", "confidence", "status", "notes", "dateAdded", "dateEdited"];
  const RULE_COLUMNS = ["source", "type", "meaning", "category", "confidence", "explanation", "evidence", "folio", "notes", "dateAdded"];

  // The research report as plain text. Every item carries a tag saying what
  // kind of statement it is. Drawing descriptions of folios still hidden by a
  // blind test are left out, so the report cannot bias a test in progress.
  function buildReport(input, opts) {
    const state = withDefaults(input);
    const hidden = hiddenFolioIds(state.hypotheses);
    const L = [];
    const add = (...lines) => L.push(...lines);
    add("VOYNICH CIPHER LAB: RESEARCH REPORT", "Generated " + nowIso(), "",
      "The Voynich Manuscript has not been deciphered. Nothing below is a translation.",
      "Tags: [OBSERVED] text or description you entered; [COMPUTED] counts from the text;",
      "[RULE] output of your literal cipher rules; [HYPOTHESIS] your proposal; [CLAIM] an outside claim, with its source.", "");
    add("== FOLIOS ==");
    for (const f of state.folios) {
      add("", "[OBSERVED] " + f.folio + (f.section ? " (" + f.section + ")" : ""));
      if (f.transcription) add("  EVA: " + f.transcription.replace(/\n/g, " / "));
      if (hidden.has(f.folio)) add("  Drawing descriptions hidden by a blind test until it is revealed.");
      else for (const k of VISUAL_FOLIO_FIELDS) if (f[k]) add("  [OBSERVED] " + k + ": " + f[k]);
      if (f.interpretation) add("  [HYPOTHESIS] " + f.interpretation);
      if (f.alternatives) add("  [HYPOTHESIS] alternatives: " + f.alternatives);
      if (f.evidenceFor) add("  Evidence for: " + f.evidenceFor);
      if (f.evidenceAgainst) add("  Evidence against: " + f.evidenceAgainst);
      if (f.sources) add("  Sources: " + f.sources);
      add("  Confidence: " + f.confidence + "; status: " + f.status);
      for (const r of f.related) add("  Related to " + r.folio + ": " + r.reason + " (your reason, not a proven link)");
    }
    add("", "== CIPHER RULES ==");
    for (const r of state.rules) add("[HYPOTHESIS] " + r.source + " = " + r.meaning + " (" + r.type + ", " + r.category + ", confidence " + r.confidence + ")" + (r.folio ? " from " + r.folio : ""));
    add("", "== PLANTS ==");
    for (const p of state.plants) {
      add("", "[OBSERVED] " + p.folio);
      if (hidden.has(p.folio)) add("  Appearance hidden by a blind test until it is revealed.");
      else for (const k of PLANT_VISUAL_FIELDS) if (p[k]) add("  [OBSERVED] " + k + ": " + p[k]);
      if (p.identification) add("  [HYPOTHESIS] possible identification: " + p.identification);
      if (p.alternatives) add("  [HYPOTHESIS] alternatives: " + p.alternatives);
      for (const c of p.medicinalClaims) add("  [CLAIM] (" + c.kind + ") " + c.claim + " Source: " + c.source);
      add("  Confidence: " + p.confidence);
    }
    add("", "== SYMBOLS ==");
    for (const s of state.symbols) {
      const hide = s.folios.some((f) => hidden.has(f));
      add("", "[" + s.association.toUpperCase() + "] " + s.name + " (" + s.kind + ") in " + (s.folios.join(", ") || "no folio"));
      if (s.description && !hide) add("  " + s.description);
      if (hide) add("  Description hidden by a blind test until it is revealed.");
    }
    add("", "== TRANSLATIONS (HYPOTHESES ONLY) ==");
    for (const t of state.translations) {
      add("", "[HYPOTHESIS] passage: " + t.passage.replace(/\n/g, " / "));
      if (t.rules.length) add("  Rules used: " + t.rules.join(", "));
      add("  Interpretation: " + t.interpretation, "  Confidence: " + t.confidence);
      if (t.alternatives) add("  Alternatives: " + t.alternatives);
      if (t.evidenceFor) add("  Evidence for: " + t.evidenceFor);
      if (t.evidenceAgainst) add("  Evidence against: " + t.evidenceAgainst);
    }
    add("", "== HYPOTHESES ==");
    for (const h of state.hypotheses) {
      add("", "[HYPOTHESIS] " + h.statement, "  Status: " + h.status + "; confidence: " + h.confidence);
      if (h.predictionsLockedAt) add("  Predictions locked " + h.predictionsLockedAt + ":", "  " + h.predictions.replace(/\n/g, " / "));
      else add("  Predictions not yet locked (" + (h.predictions ? "draft" : "none") + ").");
      if (h.blindFolios.length) add("  Blind folios: " + h.blindFolios.join(", ") + (h.revealedAt ? " (revealed " + h.revealedAt + ")" : " (not yet revealed)"));
      if (h.supporting) add("  Supporting observations: " + h.supporting);
      if (h.contradicting) add("  Contradicting observations: " + h.contradicting);
      if (h.testResults) add("  Test results: " + h.testResults);
    }
    add("", "== LIMITS ==",
      "Only the text entered in this lab was analysed. No complete corpus is loaded.",
      "Repeated sequences and shared vocabulary are computational observations, not translations.",
      "Confidence and status are your own ratings.");
    return L.join("\n") + "\n";
  }

  // Summary numbers for the dashboard.
  function dashboard(input, sampleText, opts) {
    const state = withDefaults(input);
    const items = []
      .concat(state.folios.map((f) => ({ label: "Folio " + f.folio, when: f.dateEdited || f.dateAdded })))
      .concat(state.rules.map((r) => ({ label: "Rule " + r.source, when: r.dateAdded })))
      .concat(state.plants.map((p) => ({ label: "Plant on " + p.folio, when: p.dateEdited || p.dateAdded })))
      .concat(state.symbols.map((s) => ({ label: "Symbol " + s.name, when: s.dateAdded })))
      .concat(state.translations.map((t) => ({ label: "Translation of " + t.passage.slice(0, 24), when: t.dateAdded })))
      .concat(state.hypotheses.map((h) => ({ label: "Hypothesis " + h.statement.slice(0, 32), when: h.dateEdited || h.dateAdded })));
    items.sort((a, b) => (a.when < b.when ? 1 : -1));
    return {
      folios: state.folios.length,
      rules: state.rules.length,
      plants: state.plants.length,
      symbols: state.symbols.length,
      translations: state.translations.length,
      hypotheses: state.hypotheses.length,
      unmapped: sampleText ? unmappedSummary(sampleText, state.rules, opts) : null,
      recent: items.slice(0, 5),
    };
  }

  const api = {
    CATEGORIES, CONFIDENCE, STATUS, SYMBOL_KINDS, ASSOCIATIONS, CLAIM_KINDS, HYP_STATUS, KINDS, VISUAL_FOLIO_FIELDS, PLANT_VISUAL_FIELDS,
    tokenize, analyzeText, ngrams, search, applyLiteral, unmappedSummary, rulesUsed, patternExplore,
    wordLengthDistribution, positionFrequencies, tokenNgrams, compareTexts, crossFolioSearch,
    cleanFolio, cleanRule, cleanPlant, cleanSymbol, cleanTranslation, cleanHypothesis,
    lockPredictions, revealBlind, hiddenFolioIds, emptyState,
    validateBackup, mergeNew, exportBackup, toCSV, csvCell, FOLIO_COLUMNS, RULE_COLUMNS,
    buildReport, dashboard, newId,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.VoynichLab = api;
})(this);
