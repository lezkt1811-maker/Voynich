# Voynich

A set of tools for a personal, speculative investigation of the Voynich
Manuscript. The manuscript has never been deciphered. Nothing these tools
produce is a translation, and nothing they produce is medical advice.

The repository holds two browser pages and a command-line reader:

| File | What it is |
| --- | --- |
| `docs/index.html` | **Pool Reader.** Applies your cipher, hair-colour humors and zodiac seasons to one folio, line by line. |
| `docs/lab.html` | **Cipher Lab.** A workbench for testing your cipher, recording folios, plants, symbols, translations and hypotheses, and running blind tests. |
| `read.js` | The same reader as a command-line tool. |
| `docs/data.js`, `docs/reader.js` | The framework tables and the reading logic shared by the pages and the command line. |
| `docs/lab-core.js` | The logic behind the Cipher Lab (analysis, validation, backups, reports). |
| `test/` | Automated tests for the reader and the lab logic. |

Both pages are plain HTML, CSS and JavaScript. There is no server, no account,
no paid API and no build step. They can be opened from disk or published with
GitHub Pages.

## Quick start

Open a page in a browser:

- `docs/lab.html` for the Cipher Lab (the main research tool).
- `docs/index.html` for the Pool Reader.

To publish on GitHub Pages, enable Pages for the repository with the `docs/`
folder as the source. The lab then lives at `/lab.html` on that site.

Command line, from the repository root (needs Node.js 18 or later):

```sh
node read.js folio.txt --folio f78r --zodiac pisces --hair black,red
node read.js folio.txt --map my-cipher.json --json
node read.js dev-folio.txt --test-on held-out-folio.txt --map my-cipher.json
node read.js --hair-log observations.json
```

## The framework

The reader applies one person's speculative framework. These are the rules it
uses; change them in `docs/data.js` or in your own cipher file.

- **Hair colour → humor.** Black is melancholic (cold, dry). Red runs hot and
  blonde runs cold. Their full humors (choleric, phlegmatic) are defaults to
  confirm.
- **Zodiac → season.** Each zodiac roundel (f70v–f73v) marks the time of year a
  plant grows. Capricorn and Aquarius have no surviving page.
- **EVA → remedy themes.** Your EVA cipher maps words and affixes to glosses,
  some tagged with a reproductive-health theme: fertility, contraception,
  fibroids, cysts, cramps. These are labels in the game, not medical claims.
- **Bathing pools.** Folios f75r–f84v are flagged, and every reading of them
  carries a safety note. Bathing in water that contains blood, or in standing
  green water, is an infection risk and cures nothing.

The EVA entries shipped in `docs/data.js` are format examples only. Replace
them with your own cipher.

## Pool Reader (`docs/index.html`)

Paste a folio's EVA (plain or IVTFF), pick the zodiac sign and the figures' hair
colours, and edit your cipher as JSON on the page. The reading shows which
rules produced each word and how many words the cipher covers.

The page also has:

- **Investigation log.** Upload photos of manuscript pages on the published
  claude.ai page. Claude describes what is visible, then applies the framework,
  labelled as interpretation. This section needs that page; a plain local copy
  hides it.
- **Theories and evidence.** Claims from the online conversation around the
  manuscript, each with its source and how well it holds up. They live in
  `theories` in `docs/data.js`.
- **Held-out folio test.** Build the cipher on one folio, then apply the same
  fixed rules to a folio you did not use. What matters is how many words that
  appear only in the held-out folio the rules can still read. Each run prints a
  cipher code; a different code means the rules changed.
- **Hair-colour log.** For each figure, record the hair colour, what the page
  suggests on its own, and whether you wrote that down before checking the rule
  ("blind"). Blind agreements count most.

## Cipher Lab (`docs/lab.html`)

The lab keeps three things apart: the manuscript text, the rules you propose,
and your hypotheses. Every output shows what it is.

- **Dashboard.** Counts of records, untouched tokens for the text you are
  working on, and recent edits.
- **EVA Analyzer.** Character, word and token counts, frequencies, repeated
  words, first and last characters, prefixes and suffixes, search, and repeated
  sequences with their locations. The text you paste is never changed. Options
  control whether IVTFF markup, spaces and dots count.
- **Cipher Builder.** Your rules: an EVA source, a proposed meaning, a category,
  a confidence level, the folio it came from, an explanation, supporting
  evidence and notes.
  - *Mode A* applies only your rules. Each piece of output names the rule that
    produced it, and anything uncovered is flagged.
  - *Mode B* lists repeated sequences and attaches no meanings.
  - Sequence priority is either longest rule first or the order you entered them.
- **Folio Explorer.** Records for each folio with separate fields for the EVA
  transcription, what is visible, botanical and figure observations, zodiac
  observations, your interpretation, alternatives, evidence for, evidence
  against, sources, confidence, status and personal notes. Each folio can carry
  a photo. Folios can be linked to one another, but each link needs a reason you
  can state.
- **Botany.** Plant records: the illustration, root, stem, leaf and flower or
  fruit; a possible identification and alternatives; references and notes.
  Medicinal claims are recorded separately, each with its source and a kind
  (historical claim, modern claim or hypothesis). The lab gives no treatment
  advice.
- **Symbols.** Zodiac signs, celestial bodies, diagrams and number patterns,
  each linked to folios and marked *visible*, *documented* or *hypothesis*.
  A symbol next to a passage does not show what the passage means.
- **Patterns.** Word-length distribution, character positions, repeated word
  runs, a comparison of two passages, and a search across every saved folio.
  Each result is labelled as a computational observation.
- **Translate.** For one exact passage: the original EVA, the literal output
  from your rules, and your interpretation. The rules used are recorded
  automatically. You can keep several competing hypotheses for the same passage.
- **Hypotheses.** A research log with blind testing:
  1. Choose the folios to blind. Their drawing descriptions and photos are
     hidden in the Folio Explorer, the report and the plant view.
  2. Write your predictions and **lock** them. Locked predictions cannot be
     edited, and the blind folios cannot be changed.
  3. Analyse the text. Then **reveal** the blind folios. Reveal is only available
     after locking, so predictions are recorded before the comparison.
  4. Record the outcome as supporting or contradicting observations and as test
     results.
- **Data.** Backups, imports, CSV exports and a text report (see below).

Every item the lab writes is tagged in the report as one of:

- `[OBSERVED]` text or a description you entered;
- `[COMPUTED]` a count from the text;
- `[RULE]` the output of your literal cipher rules;
- `[HYPOTHESIS]` your proposal;
- `[CLAIM]` an outside claim, with its source.

## Saving your work

Everything in the lab is saved in **this browser**, and only in this browser.
Clearing site data, using a private window, switching browsers or switching
devices will not show it. Download a backup regularly.

What is saved:

- Every folio, cipher rule, plant, symbol, translation and hypothesis, including
  locks and reveal times, is saved as soon as you press its save button.
- Folio photos are saved with their folio. They are resized in the browser to
  at most 1200 pixels and stored as JPEG, so each one takes up little space.
- The text you are working on in the EVA Analyzer, Cipher Builder, Patterns and
  Translate pages is kept as you type, so it is still there after a reload.
  Record forms are not kept as drafts; they are saved only when you press save.

Limits and safeguards:

- Browsers allow only a few megabytes per site. When the lab cannot save, a red
  **NOT SAVED** banner appears at the top of the page and the affected form says
  so. Everything on the page is still there until you reload. Download a backup
  and remove large photos to make room, then save again.
- If the saved data cannot be read, the lab starts empty but keeps the unreadable
  copy under a separate key in the same browser. The next save cannot overwrite
  it. Import a backup if you have one.
- Imports are checked before anything changes. Records with the same id are
  kept, not overwritten. Replacing everything asks for confirmation.

Data → **Download backup (JSON)** saves every record, including photos. Keep a
copy somewhere you control. **Research report (TXT)** writes a readable summary
with the tags above. It leaves out the descriptions of folios that a blind test
still hides. **Folios as CSV**, **Cipher rules as CSV** and **Plants as CSV**
export spreadsheet-friendly copies; cells that begin with a formula character
are neutralised.

The Pool Reader (`docs/index.html`) keeps its own cipher and hair-colour log in
its own browser storage. Those are not part of a lab backup.

## Research integrity

- The manuscript is undeciphered. Nothing here is a translation.
- A pattern, a shared word or a visual resemblance is not evidence of meaning.
  The lab records them as observations and does not turn them into findings.
- A relationship between folios needs a stated reason.
- A medicinal claim needs a source. Plant records do not recommend any use.
- Hidden blind-test material stays hidden until the predictions are locked and
  the reveal is made.
- The corpus is limited to what you enter. No complete transcription is loaded,
  and the lab says so on the pages that analyse text.

## Tests

```sh
node --test test/*.test.js
```

The tests cover the reader, the theory list, and every function in
`docs/lab-core.js`: text analysis, rule application, validation, merging,
backups, CSV escaping, the blind-test rules, and the report's hiding of
descriptions.

## Repository layout

```
docs/
  index.html        Pool Reader page
  lab.html          Cipher Lab page
  lab-core.js       Cipher Lab logic (tested in Node and the browser)
  reader.js         Reader logic
  data.js           Framework tables, theories and safety notes
read.js             Command-line reader
test/               Automated tests
README.md           This file
```
