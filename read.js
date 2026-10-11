#!/usr/bin/env node
// Usage:
//   node read.js <eva-file|-> [--folio f78r] [--zodiac leo] [--hair black,red] [--map cipher.json] [--json]
//   node read.js <dev-eva-file> --test-on <held-out-eva-file> [--map cipher.json] [--json]
//   node read.js --hair-log observations.json [--map cipher.json] [--json]
const fs = require("fs");
const DATA = require("./docs/data.js");
const R = require("./docs/reader.js");

const VALUED = ["folio", "zodiac", "hair", "map", "test-on", "hair-log"];
const opts = {}, positional = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith("--") && VALUED.includes(a.slice(2))) opts[a.slice(2)] = args[++i];
  else if (a === "--json") opts.json = true;
  else positional.push(a);
}
const usage = () => { console.error(fs.readFileSync(__filename, "utf8").split("\n").slice(1, 5).map((l) => l.replace(/^\/\/ ?/, "")).join("\n")); process.exit(1); };

const data = { ...DATA };
if (opts.map) {
  const m = JSON.parse(fs.readFileSync(opts.map, "utf8"));
  for (const k of ["evaWords", "evaPrefixes", "evaSuffixes", "hairHumors", "remedyCategories"]) if (m[k]) data[k] = m[k];
}
const readIn = (f) => fs.readFileSync(f === "-" ? 0 : f, "utf8");
const print = (obj, text) => console.log(opts.json ? JSON.stringify(obj, null, 2) : text);

if (opts["hair-log"]) {
  const rows = R.hairConsistency(JSON.parse(readIn(opts["hair-log"])), data);
  print(rows, ["HAIR-COLOUR CONSISTENCY (speculative framework)"].concat(rows.map((r) =>
    `${r.hair} -> ${r.predicted}: seen ${r.seen}, context agrees ${r.matches}/${r.withContext}, blind ${r.blindMatches}/${r.blindWithContext}`)).join("\n"));
} else if (opts["test-on"]) {
  if (!positional[0]) usage();
  const r = R.heldOutTest(readIn(positional[0]), readIn(opts["test-on"]), data);
  delete r.testLines;
  print(r, [
    `HELD-OUT TEST, cipher ${r.fingerprint}`,
    ...r.notes.map((n) => "  ! " + n),
    `Development folio: ${r.dev.known}/${r.dev.total} words read (${r.dev.percent}%)`,
    `Held-out folio:    ${r.test.known}/${r.test.total} words read (${r.test.percent}%)`,
    `Words new to the held-out folio: ${r.newWords.known}/${r.newWords.total} read (${r.newWords.percent}%)`,
    r.newWords.unread.length ? "Unread: " + r.newWords.unread.join(" ") : "",
  ].join("\n"));
} else {
  if (!positional[0]) usage();
  const result = R.read(readIn(positional[0]), { folio: opts.folio, zodiac: opts.zodiac, hair: (opts.hair || "").split(",").filter(Boolean) }, data);
  print(result, R.formatText(result));
}
