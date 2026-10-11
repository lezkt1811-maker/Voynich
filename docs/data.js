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


    // Theories from the online conversation, each with where it came from and
    // how well it holds up. status: supported | partly | open | contested |
    // unverified | unsupported.
    theories: [
      { claim: "Menstrual blood in moon water grows new plants with no seed.",
        source: "TikTok videos, Oct 2026", status: "unsupported",
        evidence: "Every plant comes from a seed, spore or cutting; spontaneous generation was disproved in the 1860s. In the videos the plants are cuttings that rooted in the water. Green growth that appears on its own is algae or mould from spores in the air." },
      { claim: "Blood made 'hair' grow on the roots.",
        source: "TikTok videos, Oct 2026", status: "unsupported",
        evidence: "Those are root hairs. Every plant grows them to take up water, and cuttings rooted in water show them very clearly." },
      { claim: "Menstrual blood works as plant fertiliser.",
        source: "TikTok videos, Oct 2026", status: "partly",
        evidence: "Blood holds nitrogen and iron, and dried blood meal is a real garden fertiliser. Diluted fresh blood in water also feeds bacteria and starts to smell within days." },
      { claim: "The Voynich is a guide by women for creating life from menstrual blood.",
        source: "TikTok theory, Oct 2026", status: "unverified",
        evidence: "The text is undeciphered, so no reading of it supports or rules this out. The idea comes from the pictures and from the videos above, not from the text." },
      { claim: "The bathing pages show wombs, fallopian tubes and ovaries.",
        source: "TikTok; also proposed by some researchers", status: "open",
        evidence: "A long-standing interpretation of the tubes and pools, alongside others: medieval spa and bath books, sacred wells, or the flow of fluids in the body. Nothing in the manuscript confirms any one of them." },
      { claim: "'When women give their blood back to the earth...' is a Hopi prophecy.",
        source: "Widely shared online", status: "unverified",
        evidence: "No published Hopi source for the saying has been traced. It circulates online without a citation." },
      { claim: "Regulus is the red star, the heart of Leo.",
        source: "TikTok mythology video", status: "partly",
        evidence: "Regulus is the brightest star in Leo and was called the lion's heart (Cor Leonis). It is blue-white, not red. The red 'heart' star is Antares, in Scorpius. The Blue Star Kachina comes from retellings of Hopi prophecy, mainly Frank Waters' 'Book of the Hopi' (1963)." },
      { claim: "A goddess-worshipping matriarchal Europe was ended by invaders from the steppe.",
        source: "TikTok creator's book project", status: "contested",
        evidence: "Large migrations from the steppe around 3000 BCE are well supported by ancient DNA. That earlier Europe was a matriarchy is Marija Gimbutas' theory, and most archaeologists dispute it." },
      { claim: "Menstrual blood contains regenerative stem cells.",
        source: "TikTok creator", status: "supported",
        evidence: "Menstrual blood-derived stem cells have been studied since 2007 and look promising. The research is early and no treatment based on them is approved." },
      { claim: "The womb is fully replaced every three weeks.",
        source: "TikTok creator", status: "partly",
        evidence: "The womb's lining (endometrium) sheds and regrows about once a cycle, typically 21 to 35 days. The womb itself is not replaced." },
      { claim: "The moon's pull on water affects how seeds germinate and grow.",
        source: "Moon-gardening book cited by the creator", status: "contested",
        evidence: "Planting by the moon is an old folk practice. Studies are mixed, and the moon's tidal pull on something as small as a seed or a pot is far too weak to matter." },
      { claim: "A seed held in your mouth grows a plant that supplies what your body lacks.",
        source: "Moon-gardening book cited by the creator", status: "unsupported",
        evidence: "No study shows a plant changing its nutrients to match the person whose saliva touched the seed." },
      { claim: "The manuscript has been tested and is genuine.",
        source: "TikTok creator", status: "supported",
        evidence: "Its vellum was radiocarbon-dated to 1404-1438 (University of Arizona, 2009), and most scholars accept it as a genuine 15th-century book. Whether its text holds a real language or code is still unknown." },
    ],
    theorySafety: "If you try this, use it only to fertilise houseplants. Don't drink it or bathe in it: water with blood in it grows bacteria fast and can cause infections.",

    // Section notes. Balneological ("bathing") pages run roughly f75r-f84v.
    sections: [
      { name: "zodiac",       from: "f70v", to: "f73v" },
      { name: "balneological (bathing pools)", from: "f75r", to: "f84v" },
    ],
  };

  if (typeof module !== "undefined") module.exports = DATA;
  else root.VOYNICH_DATA = DATA;
})(this);
