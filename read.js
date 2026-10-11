#!/usr/bin/env node
// Usage: node read.js <eva-file|-> [--folio f78r] [--zodiac leo] [--hair black,red] [--map my-cipher.json] [--json]
const fs = require("fs");
const DATA = require("./docs/data.js");
const { read, formatText } = require("./docs/reader.js");

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : undefined; };
const file = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && args[i - 1] !== "--json"));
if (!file) {
  console.error("usage: node read.js <eva-file|-> [--folio f78r] [--zodiac leo] [--hair black,red] [--map cipher.json] [--json]");
  process.exit(1);
}
const data = { ...DATA };
const map = opt("map");
if (map) {
  const m = JSON.parse(fs.readFileSync(map, "utf8"));
  for (const k of ["evaWords", "evaPrefixes", "evaSuffixes", "hairHumors", "remedyCategories"]) if (m[k]) data[k] = m[k];
}
const text = fs.readFileSync(file === "-" ? 0 : file, "utf8");
const result = read(text, {
  folio: opt("folio"),
  zodiac: opt("zodiac"),
  hair: (opt("hair") || "").split(",").filter(Boolean),
}, data);
console.log(args.includes("--json") ? JSON.stringify(result, null, 2) : formatText(result));
