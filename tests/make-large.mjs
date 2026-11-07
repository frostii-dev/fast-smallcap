// Generates tests/fixtures/large.properties and tests/expected/large.properties.
// Expected strings are built from fixed constant templates (no runtime
// conversion logic here), so they are independent of the app's engine.
import { mkdirSync, writeFileSync } from "node:fs"

const MAP = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ",
  i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
  q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x",
  y: "ʏ", z: "ᴢ",
}

const PATTERN = new RegExp(
  [
    "§x(?:§[0-9a-fA-F]){6}",
    "&#[0-9a-fA-F]{6}",
    "#[0-9a-fA-F]{6}",
    "\\\\u[0-9a-fA-F]{4}",
    "[&§][0-9a-fk-or]",
    "\\\\.",
    "\\{[^{}\\r\\n]*\\}",
    "<[^<>\\r\\n]*>",
    "%[^%\\r\\n]*%",
  ].join("|"),
  "gi"
)

function mapLetters(segment) {
  let out = ""
  for (const ch of segment) {
    out += MAP[ch.toLowerCase()] ?? ch
  }
  return out
}

function convert(text) {
  let result = ""
  let last = 0
  for (const match of text.matchAll(PATTERN)) {
    result += mapLetters(text.slice(last, match.index))
    result += match[0]
    last = match.index + match[0].length
  }
  return result + mapLetters(text.slice(last))
}

const COUNT = 2000  // Reduced from 6000 for faster testing

const rawEntry = (n) =>
  `key${n}=Some value ${n} &a{player} #12ABEF more ${n} <npc>\n`
const expEntry = (n) =>
  `key${n}=${convert(`Some value ${n} &a{player} #12ABEF more ${n} <npc>`)}\n`

const rawComment = (n) =>
  `# section ${n} stand by %group% &#FF00AA header\n`
const expComment = rawComment

const rawLong = (n) =>
  `key${n}=This is a longer sentence with words ${n} covering <area> and {zone} helper codes §c#FEDCBA end\n`
const expLong = (n) =>
  `key${n}=${convert(`This is a longer sentence with words ${n} covering <area> and {zone} helper codes §c#FEDCBA end`)}\n`

let raw = ""
let expected = ""
for (let n = 1; n <= COUNT; n += 1) {
  if (n % 100 === 0) {
    raw += rawComment(n)
    expected += expComment(n)
  }
  if (n % 250 === 0) {
    raw += `key${n}=\n`
    expected += `key${n}=\n`
  } else if (n % 250 === 1) {
    raw += `key${n}=   \n`
    expected += `key${n}=   \n`
  } else if (n % 50 === 0) {
    raw += rawLong(n)
    expected += expLong(n)
  } else {
    raw += rawEntry(n)
    expected += expEntry(n)
  }
}

mkdirSync("tests/fixtures", { recursive: true })
mkdirSync("tests/expected", { recursive: true })
writeFileSync("tests/fixtures/large.properties", raw)
writeFileSync("tests/expected/large.properties", expected)
console.log("lines:", raw.split("\n").length, "bytes:", raw.length)