// Default tables for the reading framework. Everything here is the user's
// speculative interpretation of an undeciphered manuscript, not established
// scholarship and not medical guidance. Edit freely; the page can also load
// a replacement mapping file you export from it.
(function (root) {
  const DATA = {
    // Hair colour -> humor, per the user's rules. Black was given fully
    // (melancholic, cool, dry). For red and blonde only hot/cold was given, so
    // the humor and moisture below are defaults to confirm or change.
    hairHumors: {
      black:  { humor: "melancholic", qualities: ["cold", "dry"],   source: "user" },
      red:    { humor: "choleric",    qualities: ["hot", "dry"],    source: "user said hot; choleric/dry is a default" },
      blonde: { humor: "phlegmatic",  qualities: ["cold", "moist"], source: "user said cold; phlegmatic/moist is a default" },
      brown:  { humor: "sanguine",    qualities: ["hot", "moist"],  source: "default, not yet set by user" },
    },

    // Zodiac -> growing season. Dates are modern tropical sun-sign ranges;
    // a 15th-century Julian calendar sits roughly 9 days earlier.
    // Folios are the usual identifications of the zodiac roundels; Capricorn
    // and Aquarius have no surviving page.
    zodiac: {
      aries:       { dates: "Mar 21 - Apr 19", season: "early spring", element: "fire",  folios: ["f70v2", "f71r"] },
      taurus:      { dates: "Apr 20 - May 20", season: "mid spring",   element: "earth", folios: ["f71v", "f72r1"] },
      gemini:      { dates: "May 21 - Jun 20", season: "late spring",  element: "air",   folios: ["f72r2"] },
      cancer:      { dates: "Jun 21 - Jul 22", season: "early summer", element: "water", folios: ["f72r3"] },
      leo:         { dates: "Jul 23 - Aug 22", season: "midsummer",    element: "fire",  folios: ["f72v3"] },
      virgo:       { dates: "Aug 23 - Sep 22", season: "late summer",  element: "earth", folios: ["f72v2"] },
      libra:       { dates: "Sep 23 - Oct 22", season: "early autumn", element: "air",   folios: ["f72v1"] },
      scorpio:     { dates: "Oct 23 - Nov 21", season: "mid autumn",   element: "water", folios: ["f73r"] },
      sagittarius: { dates: "Nov 22 - Dec 21", season: "late autumn",  element: "fire",  folios: ["f73v"] },
      capricorn:   { dates: "Dec 22 - Jan 19", season: "early winter", element: "earth", folios: [] },
      aquarius:    { dates: "Jan 20 - Feb 18", season: "midwinter",    element: "air",   folios: [] },
      pisces:      { dates: "Feb 19 - Mar 20", season: "late winter",  element: "water", folios: ["f70v1"] },
    },

    // Remedy categories the user's reading has named so far.
    remedyCategories: {
      fertility:     "to help conceive",
      contraception: "to prevent or end pregnancy",
      fibroids:      "to clear fibroids",
      cysts:         "to clear cysts",
      cramps:        "cramp relief",
    },

    // EVA -> meaning. The user's own cipher goes here. The entries below are
    // EXAMPLES that show the format only; they are not the user's cipher and
    // not a translation.
    evaWords: {
      daiin:  { gloss: "(example) leaf", category: null,        example: true },
      chedy:  { gloss: "(example) root", category: null,        example: true },
      qokedy: { gloss: "(example) water/bath", category: null,  example: true },
      shedy:  { gloss: "(example) womb", category: "fertility", example: true },
    },
    evaPrefixes: {
      qo: { gloss: "(example) 'in / into'", example: true },
    },
    evaSuffixes: {
      edy: { gloss: "(example) noun ending", example: true },
      aiin: { gloss: "(example) plural", example: true },
    },

    // Section notes. Balneological ("bathing") pages run roughly f75r-f84v.
    sections: [
      { name: "zodiac",       from: "f70v", to: "f73v" },
      { name: "balneological (bathing pools)", from: "f75r", to: "f84v" },
    ],
  };

  if (typeof module !== "undefined") module.exports = DATA;
  else root.VOYNICH_DATA = DATA;
})(this);
