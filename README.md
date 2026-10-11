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

Tests: `node --test test/*.test.js`
