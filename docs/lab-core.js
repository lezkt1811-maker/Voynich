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
    lines.forEach((line, li) => line.words.forEach((w, wi) => {
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

  // Keeps only the fields the lab knows about, with a default for each.
  // Throws a readable message for anything malformed.
  function cleanFolio(f) {
    if (!f || typeof f !== "object") throw new Error("A folio record must be an object.");
    const folio = String(f.folio || "").trim();
    if (!folio) throw new Error("Each folio record needs a folio identifier, such as f78r.");
    const confidence = CONFIDENCE.includes(f.confidence) ? f.confidence : "low";
    const status = STATUS.includes(f.status) ? f.status : "unreviewed";
    const text = (k) => String(f[k] == null ? "" : f[k]);
    const related = Array.isArray(f.related) ? f.related.filter((r) => r && r.folio && r.reason).map((r) => ({ folio: String(r.folio), reason: String(r.reason) })) : [];
    return {
      id: String(f.id || newId("folio")),
      folio, section: text("section"), transcription: text("transcription"),
      illustration: text("illustration"), botany: text("botany"), figures: text("figures"), astronomy: text("astronomy"),
      interpretation: text("interpretation"), alternatives: text("alternatives"),
      evidenceFor: text("evidenceFor"), evidenceAgainst: text("evidenceAgainst"), sources: text("sources"),
      confidence, status, related, notes: text("notes"),
      dateAdded: String(f.dateAdded || new Date().toISOString()),
      dateEdited: String(f.dateEdited || f.dateAdded || new Date().toISOString()),
    };
  }

  // Keeps only the fields the lab knows about. Source and meaning are required.
  function cleanRule(r) {
    if (!r || typeof r !== "object") throw new Error("A cipher rule must be an object.");
    const source = String(r.source || "").trim();
    const meaning = String(r.meaning || "").trim();
    if (!source) throw new Error("Each cipher rule needs an EVA source, such as daiin.");
    if (!meaning) throw new Error("Each cipher rule needs a proposed meaning.");
    const type = r.type === "word" ? "word" : "sequence";
    const category = CATEGORIES.includes(r.category) ? r.category : "Unknown";
    const confidence = CONFIDENCE.includes(r.confidence) ? r.confidence : "low";
    return {
      id: String(r.id || newId("rule")),
      type, source, meaning, category, confidence,
      explanation: String(r.explanation || ""), evidence: String(r.evidence || ""),
      folio: String(r.folio || ""), notes: String(r.notes || ""),
      dateAdded: String(r.dateAdded || new Date().toISOString()),
    };
  }

  // ---------- Import, export, validation ----------

  // Checks a backup file before anything is loaded. Returns the cleaned
  // records, or the errors found. Nothing is written by this function.
  function validateBackup(obj) {
    const errors = [];
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, errors: ["The file is not a lab backup object."] };
    if (obj.schema !== undefined && obj.schema !== SCHEMA) errors.push("Unknown backup schema " + obj.schema + "; expected " + SCHEMA + ".");
    const folios = [], rules = [];
    (Array.isArray(obj.folios) ? obj.folios : []).forEach((f, i) => {
      try { folios.push(cleanFolio(f)); } catch (e) { errors.push("folios[" + i + "]: " + e.message); }
    });
    (Array.isArray(obj.rules) ? obj.rules : []).forEach((r, i) => {
      try { rules.push(cleanRule(r)); } catch (e) { errors.push("rules[" + i + "]: " + e.message); }
    });
    if (obj.folios !== undefined && !Array.isArray(obj.folios)) errors.push("'folios' must be a list.");
    if (obj.rules !== undefined && !Array.isArray(obj.rules)) errors.push("'rules' must be a list.");
    if (errors.length) return { ok: false, errors };
    return { ok: true, data: { folios, rules } };
  }

  // Adds incoming records whose ids are not already in the library. Existing
  // records are never overwritten by this function; the caller decides on replace.
  function mergeNew(current, incoming) {
    const ids = { folios: new Set(current.folios.map((f) => f.id)), rules: new Set(current.rules.map((r) => r.id)) };
    const added = { folios: 0, rules: 0 }, skipped = { folios: 0, rules: 0 };
    const next = { folios: current.folios.slice(), rules: current.rules.slice() };
    for (const kind of ["folios", "rules"]) for (const rec of incoming[kind]) {
      if (ids[kind].has(rec.id)) { skipped[kind]++; continue; }
      ids[kind].add(rec.id); next[kind].push(rec); added[kind]++;
    }
    return { data: next, added, skipped };
  }

  function exportBackup(state) {
    return JSON.stringify({ schema: SCHEMA, exportedAt: new Date().toISOString(), folios: state.folios, rules: state.rules }, null, 2);
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

  // Summary numbers for the dashboard.
  function dashboard(state, sampleText, opts) {
    const items = state.folios.map((f) => ({ label: "Folio " + f.folio, when: f.dateEdited || f.dateAdded }))
      .concat(state.rules.map((r) => ({ label: "Rule " + r.source, when: r.dateAdded })));
    items.sort((a, b) => (a.when < b.when ? 1 : -1));
    return {
      folios: state.folios.length,
      rules: state.rules.length,
      unmapped: sampleText ? unmappedSummary(sampleText, state.rules, opts) : null,
      recent: items.slice(0, 5),
    };
  }

  const api = { CATEGORIES, CONFIDENCE, STATUS, tokenize, analyzeText, ngrams, search, applyLiteral, unmappedSummary,
    patternExplore, cleanFolio, cleanRule, validateBackup, mergeNew, exportBackup, toCSV, csvCell,
    FOLIO_COLUMNS, RULE_COLUMNS, dashboard, newId };
  if (typeof module !== "undefined") module.exports = api;
  else root.VoynichLab = api;
})(this);
