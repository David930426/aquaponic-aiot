// One-shot: rewrite non-canonical Tailwind 4 class strings to their canonical form.
// Idempotent — safe to run multiple times.
//
// Run:  node scripts/canonicalize-tw.mjs
//
// What it does:
//   • Theme-color tokens: text-[hsl(...)] / bg-[hsl(...)] → text-foreground / bg-muted / etc.
//   • Shadow vars:        shadow-[var(--shadow-x)]       → shadow-(--shadow-x)
//   • Spacing px values:  h-[200px], w-[18px], etc.      → h-50, w-4.5 (1 unit = 0.25rem = 4px)
//   • 1px padding/border: p-[1px] / m-[1px]               → p-px / m-px
// Font-size arbitrary values (text-[13px] etc.) are kept — they don't map to a default scale.

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components"];
const EXT = new Set([".tsx", ".ts"]);

// ── 1. Color-token replacements (exact-string) ──────────────────────────────
const colorReplacements = [
  // foreground (primary text colour)
  [/\[hsl\(220_13%_13%\)\]/g, "foreground"],
  // muted-foreground (secondary/grey text)
  [/\[hsl\(220_8%_55%\)\]/g, "muted-foreground"],
  // muted (very light grey backgrounds)
  [/\[hsl\(220_9%_95%\)\]/g, "muted"],
  // secondary-foreground (darker text)
  [/\[hsl\(220_13%_20%\)\]/g, "secondary-foreground"],
  // border token
  [/\[hsl\(220_13%_91%\)\]/g, "border"],
];

// ── 2. Shadow-var syntax: shadow-[var(--shadow-x)] → shadow-(--shadow-x) ────
const shadowVarRe = /shadow-\[var\((--shadow-[a-z]+)\)\]/g;

// ── 3. Spacing px → numeric scale (1 unit = 4px). 1px → "px", others → n/4 ──
function pxToScale(px) {
  if (px === 1) return "px";
  const n = px / 4;
  if (!Number.isFinite(n) || n < 0) return null;
  // Keep nice numbers only — avoid producing junk like h-0.3333
  if (Number.isInteger(n)) return String(n);
  if (Number.isInteger(n * 2)) return n.toString(); // .5 increments
  return null;
}

// Match utility classes that take spacing values. Width, height, padding, margin,
// gap, inset, top/right/bottom/left, max-w, max-h, min-w, min-h, space-x, space-y,
// translate-x/y, etc. We also support responsive prefixes (sm: md: lg: xl: 2xl:)
// and state prefixes that come before the utility (hover: focus: dark:).
const SPACING_UTILS = [
  "h",
  "w",
  "max-h",
  "max-w",
  "min-h",
  "min-w",
  "size",
  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "ps",
  "pe",
  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "ms",
  "me",
  "gap",
  "gap-x",
  "gap-y",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "inset-x",
  "inset-y",
  "space-x",
  "space-y",
  "translate-x",
  "translate-y",
];

const utilsAlt = SPACING_UTILS.map((u) => u.replace("-", "\\-")).join("|");
const spacingPxRe = new RegExp(
  // prefixes (e.g. "sm:" or "hover:"), then optional "-" for negatives, then the utility, "-[NNpx]"
  String.raw`(^|[^A-Za-z0-9_-])((?:[a-z]+:)*-?(?:${utilsAlt}))-\[(\d+)px\]`,
  "g",
);

// Border-width arbitrary px is also worth normalizing for border-l-[3px] etc.
// (Tailwind 4 supports border-{n} for any integer width via the spacing scale.)
const borderPxRe =
  /(^|[^A-Za-z0-9_-])((?:[a-z]+:)*border(?:-[xytrbl]|-l|-r|-t|-b|-s|-e)?)-\[(\d+)px\]/g;

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      yield* walk(p);
    } else if (EXT.has(path.extname(e.name))) {
      yield p;
    }
  }
}

let touched = 0;
let total = 0;

for (const root of ROOTS) {
  for await (const file of walk(root)) {
    total++;
    let src = await fs.readFile(file, "utf8");
    const before = src;

    // 1. Colors — only replace inside [hsl(...)] arbitrary-value brackets
    for (const [pattern, token] of colorReplacements) {
      src = src.replace(pattern, token);
    }

    // 2. Shadow vars
    src = src.replace(shadowVarRe, "shadow-($1)");

    // 3. Spacing px → scale
    src = src.replace(spacingPxRe, (m, lead, util, px) => {
      const scale = pxToScale(Number(px));
      return scale === null ? m : `${lead}${util}-${scale}`;
    });

    // 4. Border px → scale (integer only)
    src = src.replace(borderPxRe, (m, lead, util, pxStr) => {
      const px = Number(pxStr);
      if (!Number.isInteger(px) || px < 0) return m;
      return `${lead}${util}-${px}`;
    });

    if (src !== before) {
      await fs.writeFile(file, src);
      touched++;
      console.log("• updated", file);
    }
  }
}

console.log(`\nDone. ${touched}/${total} files modified.`);
