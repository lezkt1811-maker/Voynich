# Voynich

A small reader for a personal, speculative interpretation of the Voynich
Manuscript. The manuscript has never been deciphered. Nothing this tool prints
is a translation, and nothing it prints is medical advice.

## The framework

- **Hair colour → humor.** Black is melancholic (cold, dry). Red runs hot,
  blonde runs cold; their full humors (choleric, phlegmatic) are defaults to
  confirm.
- **Zodiac → season.** Each zodiac roundel (f70v–f73v) marks the time of year a
  plant grows. Capricorn and Aquarius have no surviving page.
- **EVA → remedy themes.** Your EVA cipher maps words and affixes to glosses,
  some tagged with a reproductive-health theme: fertility, contraception,
  fibroids, cysts, cramps.
- **Bathing pools.** Folios f75r–f84v are flagged, and every reading of them
  carries a safety note: bathing in water that contains blood, or in standing
  green water, is an infection risk and cures nothing.

The EVA entries shipped in `docs/data.js` are format examples only. Replace
them with your own cipher.

## Use it

Web page: open `docs/index.html` in a browser. Paste a folio's EVA (plain or
IVTFF), pick the zodiac sign and the figures' hair colours, and edit your
cipher as JSON on the page.

Command line:

```sh
node read.js folio.txt --folio f78r --zodiac pisces --hair black,red
node read.js folio.txt --map my-cipher.json --json
```

## Investigation log

On the published page you can upload photos of manuscript pages. Each photo is
saved, and Claude describes what is visible (figures, hair colour, plants,
pools, zodiac, any legible EVA) and then applies the framework, labelled as
interpretation. Figures can be sent to the hair-colour log and legible EVA to
the reader. This needs the claude.ai page; a plain local copy of
`docs/index.html` hides the section.

## Theories and evidence

The page lists claims from the online conversation around the manuscript (the
menstrual blood and moon water videos and the ideas around them), each with its
source and how well it holds up. They live in `theories` in `docs/data.js`.

## Test the cipher

Held-out folio test: build the cipher on one folio, then apply the same fixed
rules to a folio you did not use. The number that matters is how many words
that appear only in the held-out folio the rules can still read. Each run
prints a cipher code; a different code means the rules changed.

```sh
node read.js dev-folio.txt --test-on held-out-folio.txt --map my-cipher.json
```

Hair-colour log: for each figure, record the hair colour and what the
surrounding page suggests on its own, and whether you noted that before
checking the rule ("blind"). The page keeps this log; the CLI reads a JSON
array of `{folio, figure, hair, contextHumor, blind}`:

```sh
node read.js --hair-log observations.json
```

## Cipher Lab

`docs/lab.html` is a separate workbench for testing your own EVA cipher. It
keeps the manuscript text, your rules, and your hypotheses apart.

- **EVA Analyzer:** counts, frequencies, repeats, affixes, search, n-grams.
- **Cipher Builder:** your rules, applied literally, with the rule shown for each piece. A pattern view attaches no meanings.
- **Folio Explorer:** observation, hypothesis and evidence against kept in separate fields.
- **Botany:** plant appearance, possible identification, and medicinal claims. Each claim needs a source, and the lab gives no treatment advice.
- **Symbols:** zodiac signs, stars and diagrams, each marked visible, documented or hypothesis.
- **Patterns:** word lengths, position frequencies, word runs, passage comparison, and search across saved folios.
- **Translate:** the exact passage, the literal output, and your interpretation. Several competing hypotheses per passage are allowed.
- **Hypotheses:** blind testing. Blind folios hide their drawing descriptions. Predictions must be locked before the reveal.
- **Data:** JSON backup and import, CSV exports, and a text report that leaves out hidden descriptions.

Everything is saved in your browser only, so download a backup from the Data
section. The logic is in `docs/lab-core.js` and is tested in
`test/lab-core.test.js`.

Tests: `node --test test/*.test.js`
