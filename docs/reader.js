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


  // Short fingerprint of the cipher rules, so two runs can be checked for
  // having used exactly the same rules.
  function cipherFingerprint(data) {
    const json = JSON.stringify([data.evaWords, data.evaPrefixes, data.evaSuffixes]);
    let h = 2166136261;
    for (let i = 0; i < json.length; i++) { h ^= json.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  function coverageOf(lines) {
    let known = 0, total = 0;
    for (const l of lines) for (const w of l.words) {
      total++;
      if (w.parts.every((p) => p.gloss !== "?")) known++;
    }
    return { known, total };
  }

  // Held-out test: the cipher is built on a development folio, then the same
  // fixed rules are applied to a folio that was not used to build it. The
  // telling number is how many words that appear only in the test folio the
  // rules can still read.
  function heldOutTest(devText, testText, data) {
    const ann = (t) => parseTranscription(t).map((l) => ({ locus: l.locus, words: l.words.map((w) => annotateWord(w, data)) }));
    const dev = ann(devText), test = ann(testText);
    const devWords = new Set(dev.flatMap((l) => l.words.map((w) => w.word)));
    const fresh = new Map();
    for (const l of test) for (const w of l.words) if (!devWords.has(w.word)) fresh.set(w.word, w);
    const freshKnown = [...fresh.values()].filter((w) => w.parts.every((p) => p.gloss !== "?")).length;
    const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
    const devCov = coverageOf(dev), testCov = coverageOf(test);
    return {
      fingerprint: cipherFingerprint(data),
      dev: { ...devCov, percent: pct(devCov.known, devCov.total) },
      test: { ...testCov, percent: pct(testCov.known, testCov.total) },
      newWords: { known: freshKnown, total: fresh.size, percent: pct(freshKnown, fresh.size),
        unread: [...fresh.values()].filter((w) => w.parts.some((p) => p.gloss === "?")).map((w) => w.word) },
      testLines: test,
      notes: [DISCLAIMER, "Coverage only says the rules produce a gloss. Whether the glosses make sense as text is a separate check you have to read for."],
    };
  }

  // Hair-colour log. Each observation: { folio, figure, hair, contextHumor, blind }
  // contextHumor is what the surrounding page suggests on its own (a symbol, a
  // plant, a zodiac sign), left blank when nothing does. blind means it was
  // noted before looking up what the rule predicts.
  function hairConsistency(observations, data) {
    const byHair = {};
    for (const o of observations) {
      const hair = String(o.hair || "").toLowerCase();
      if (!hair) continue;
      const rule = data.hairHumors[hair];
      const t = byHair[hair] || (byHair[hair] = { hair, predicted: rule ? rule.humor : "unmapped", seen: 0, withContext: 0, matches: 0, blindWithContext: 0, blindMatches: 0, folios: new Set() });
      t.seen++;
      if (o.folio) t.folios.add(o.folio);
      const ctx = String(o.contextHumor || "").toLowerCase();
      if (!ctx) continue;
      const hit = rule && ctx === rule.humor;
      t.withContext++; if (hit) t.matches++;
      if (o.blind) { t.blindWithContext++; if (hit) t.blindMatches++; }
    }
    return Object.values(byHair).map((t) => ({ ...t, folios: [...t.folios] }));
  }


  // Prompt for analysing an uploaded photo of a manuscript page. Asks for
  // what is visible first, then the user's framework applied on top, with
  // both kept apart.
  function analysisPrompt(data, folio, note) {
    const hair = Object.entries(data.hairHumors).map(([h, v]) => `${h} = ${v.humor} (${v.qualities.join(", ")})`).join("; ");
    const zod = Object.entries(data.zodiac).map(([z, v]) => `${z} = ${v.season}`).join("; ");
    return [
      "The attached image is a photo of a page of the Voynich Manuscript (Beinecke MS 408)" + (folio ? `, said to be folio ${folio}` : "") + ".",
      note ? "The researcher's note: " + note : "",
      "Describe it in as much detail as the image allows, for an ongoing hobby investigation. Separate what is visible from interpretation.",
      "Then apply the researcher's own speculative framework, labelled as such: hair colour gives a humor (" + hair + "); a zodiac sign gives the season a plant grows (" + zod + "); plants may relate to women's reproductive-health themes (fertility, contraception, fibroids, cysts, cramps).",
      "Rules: the manuscript is undeciphered, so never present anything as a translation, and never write a passage, recipe, or message to readers. Never give medical advice, say what a plant or water is used for, or say anything cures anything. A plant's theme is a label under the framework only, not a claim about its effect. If hair is uncoloured or the colour is unclear, say so rather than guessing. Transcribe visible script in EVA only where you can actually read the glyphs, otherwise null.",
      "Reply with only a JSON object of this shape:",
      JSON.stringify({
        summary: "2-3 sentence overview",
        section: "herbal | astronomical | zodiac | balneological | cosmological | pharmaceutical | recipes | unknown",
        layout: "how the page is laid out: text blocks, drawings, borders, damage",
        figures: [{ position: "where on the page", hairColour: "black | red | blonde | brown | uncoloured | unclear", humorUnderFramework: "humor or null", pose: "what the figure is doing", details: "crowns, objects, tubes, gestures" }],
        plants: [{ description: "leaves, roots, flowers, colours", themeUnderFramework: "fertility | contraception | fibroids | cysts | cramps | none", reasoning: "why, under the framework" }],
        water: "colour of pools or vessels, pipes, flow direction, or null",
        zodiac: { sign: "sign or null", evidence: "what shows it", seasonUnderFramework: "season or null" },
        visibleText: { eva: "EVA transcription of legible words or null", notes: "labels, paragraph count, legibility" },
        colours: ["pigments used on the page"],
        questions: ["things worth checking next in the investigation"],
        confidence: "low | medium | high, with a reason",
      }),
    ].filter(Boolean).join("\n\n");
  }

  // Make a model reply safe to render: known fields only, arrays as arrays.
  function normalizeAnalysis(a) {
    a = a && typeof a === "object" ? a : {};
    const str = (v) => (v == null ? null : String(v));
    const arr = (v) => (Array.isArray(v) ? v : []);
    return {
      summary: str(a.summary), section: str(a.section), layout: str(a.layout), water: str(a.water), confidence: str(a.confidence),
      figures: arr(a.figures).map((f) => ({ position: str(f && f.position), hairColour: str(f && f.hairColour), humorUnderFramework: str(f && f.humorUnderFramework), pose: str(f && f.pose), details: str(f && f.details) })),
      plants: arr(a.plants).map((p) => ({ description: str(p && p.description), themeUnderFramework: str(p && p.themeUnderFramework), reasoning: str(p && p.reasoning) })),
      zodiac: { sign: str(a.zodiac && a.zodiac.sign), evidence: str(a.zodiac && a.zodiac.evidence), seasonUnderFramework: str(a.zodiac && a.zodiac.seasonUnderFramework) },
      visibleText: { eva: str(a.visibleText && a.visibleText.eva), notes: str(a.visibleText && a.visibleText.notes) },
      colours: arr(a.colours).map(String),
      questions: arr(a.questions).map(String),
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

  const api = { analysisPrompt, normalizeAnalysis, read, formatText, heldOutTest, hairConsistency, cipherFingerprint, parseTranscription, annotateWord, sectionOf, DISCLAIMER, MEDICAL_NOTE, BATH_NOTE };
  if (typeof module !== "undefined") module.exports = api;
  else root.VoynichReader = api;
})(this);
