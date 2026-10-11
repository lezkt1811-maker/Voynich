// Annotates an EVA transcription using the tables in data.js.
// Works in the browser (window.VoynichReader) and in Node (require).
(function (root) {
  const DISCLAIMER =
    "Speculative interpretation. The Voynich Manuscript is undeciphered; this " +
    "reading applies one person's personal cipher and is not a translation.";
  const MEDICAL_NOTE =
    "Remedy labels are part of the interpretive game, not medical advice. " +
    "Nothing here treats fertility, pregnancy, fibroids, cysts or cramps; see a " +
    "clinician for any of those.";
  const BATH_NOTE =
    "Bathing-pool pages: do not recreate these. Water containing blood or " +
    "standing green (algal or bacterial) water carries a real infection risk, " +
    "and no bath cures all ailments.";

  function folioKey(f) {
    const m = /^f(\d+)([rv])?/i.exec(String(f || "").trim());
    if (!m) return null;
    return Number(m[1]) * 2 + (m[2] && m[2].toLowerCase() === "v" ? 1 : 0);
  }

  function sectionOf(folio, data) {
    const k = folioKey(folio);
    if (k === null) return null;
    const s = data.sections.find((s) => k >= folioKey(s.from) && k <= folioKey(s.to));
    return s ? s.name : null;
  }

  // Accepts plain EVA or IVTFF lines like "<f78r.3,+P0> qokedy.shedy,daiin".
  function parseTranscription(text) {
    const lines = [];
    for (const raw of String(text).split(/\r?\n/)) {
      let line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      let locus = null;
      const tag = /^<([^>]+)>\s*/.exec(line);
      if (tag) {
        locus = tag[1];
        line = line.slice(tag[0].length);
        if (!line) continue; // page header such as <f78r>
      }
      line = line
        .replace(/<![^>]*>/g, "") // inline comments
        .replace(/<[^>]*>/g, " ") // paragraph / plant-break markers
        .replace(/\{[^}]*\}/g, "") // ligature / annotation braces
        .replace(/\[([^:\]]*)(:[^\]]*)?\]/g, "$1"); // alternate readings: keep first
      const words = line
        .split(/[.,\s]+/)
        .map((w) => w.replace(/[^a-z?*]/gi, "").toLowerCase())
        .filter(Boolean);
      if (words.length) lines.push({ locus, words });
    }
    return lines;
  }

  function longestMatch(word, table, atStart) {
    let best = null;
    for (const k of Object.keys(table)) {
      const hit = atStart ? word.startsWith(k) : word.endsWith(k);
      if (hit && k.length < word.length && (!best || k.length > best.length)) best = k;
    }
    return best;
  }

  function annotateWord(word, data) {
    if (data.evaWords[word]) return { word, parts: [{ eva: word, ...data.evaWords[word] }] };
    const pre = longestMatch(word, data.evaPrefixes, true);
    let rest = pre ? word.slice(pre.length) : word;
    const suf = longestMatch(rest, data.evaSuffixes, false);
    const stem = suf ? rest.slice(0, rest.length - suf.length) : rest;
    const parts = [];
    if (pre) parts.push({ eva: pre + "-", ...data.evaPrefixes[pre] });
    if (stem) parts.push(data.evaWords[stem] ? { eva: stem, ...data.evaWords[stem] } : { eva: stem, gloss: "?" });
    if (suf) parts.push({ eva: "-" + suf, ...data.evaSuffixes[suf] });
    return { word, parts };
  }

  // opts: { folio, hair: ["black", ...], zodiac: "leo" }
  function read(text, opts, data) {
    opts = opts || {};
    const section = opts.folio ? sectionOf(opts.folio, data) : null;
    const lines = parseTranscription(text).map((l) => ({
      locus: l.locus,
      words: l.words.map((w) => annotateWord(w, data)),
    }));

    const categories = new Set();
    let known = 0, total = 0, usesExamples = false;
    for (const l of lines) for (const w of l.words) {
      total++;
      if (w.parts.every((p) => p.gloss !== "?")) known++;
      for (const p of w.parts) {
        if (p.category) categories.add(p.category);
        if (p.example) usesExamples = true;
      }
    }

    const humors = (opts.hair || []).filter(Boolean).map((h) => {
      const key = h.toLowerCase();
      return { hair: key, ...(data.hairHumors[key] || { humor: "unmapped", qualities: [] }) };
    });
    const zKey = opts.zodiac ? opts.zodiac.toLowerCase() : null;
    const zodiac = zKey && data.zodiac[zKey] ? { sign: zKey, ...data.zodiac[zKey] } : null;

    const notes = [DISCLAIMER];
    if (usesExamples) notes.push("Some glosses are format examples, not your cipher yet.");
    if (categories.size) notes.push(MEDICAL_NOTE);
    if (section && section.startsWith("balneological")) notes.push(BATH_NOTE);

    return {
      folio: opts.folio || null,
      section,
      lines,
      coverage: { known, total },
      remedyCategories: [...categories].map((c) => ({ id: c, label: data.remedyCategories[c] || c })),
      humors,
      zodiac,
      notes,
    };
  }

  function formatText(r) {
    const out = [];
    out.push("SPECULATIVE READING" + (r.folio ? " of " + r.folio : "") + (r.section ? " (" + r.section + ")" : ""));
    for (const n of r.notes) out.push("  ! " + n);
    if (r.zodiac) out.push(`Season: ${r.zodiac.sign} (${r.zodiac.dates}), ${r.zodiac.season}`);
    for (const h of r.humors) out.push(`Figure, ${h.hair} hair: ${h.humor} (${h.qualities.join(", ")})`);
    for (const l of r.lines) {
      const gloss = l.words.map((w) => w.parts.map((p) => p.gloss).join("+")).join(" | ");
      out.push((l.locus ? l.locus + ": " : "") + l.words.map((w) => w.word).join(" "));
      out.push("    -> " + gloss);
    }
    if (r.remedyCategories.length)
      out.push("Remedy themes in this reading: " + r.remedyCategories.map((c) => c.label).join(", "));
    out.push(`Coverage: ${r.coverage.known}/${r.coverage.total} words mapped by the cipher`);
    return out.join("\n");
  }

  const api = { read, formatText, parseTranscription, annotateWord, sectionOf, DISCLAIMER, MEDICAL_NOTE, BATH_NOTE };
  if (typeof module !== "undefined") module.exports = api;
  else root.VoynichReader = api;
})(this);
