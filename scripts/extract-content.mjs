// Pulls the content that was hardcoded inside public/v25-template.html out into
// plain JSON so the new React pages have a real single source of truth.
//
// The template declares them as `this.NAME = <literal>;` inside a class body.
// We slice each literal out by brace matching and eval it in isolation - they
// are pure data literals, no identifiers, so this is safe and exact.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const src = await fs.readFile(path.join(process.cwd(), 'public', 'v25-template.html'), 'utf8');

function sliceLiteral(name) {
  const key = `this.${name} = `;
  const start = src.indexOf(key);
  if (start < 0) return null;
  let i = start + key.length;
  const open = src[i];
  const close = open === '[' ? ']' : '}';
  let depth = 0, inStr = null, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (inStr) { if (c === inStr) inStr = null; continue; }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start + key.length, i);
}

// MAIN_EVENTS / STOPS / WORKS / PRODUCTS / GALLERY are deliberately not listed:
// those already come from the database through /api/site-data/*, and their
// literals here are only frozen fallbacks wrapped in expressions.
const NAMES = [
  'TEAM', 'PARTNERS', 'PARTNER_FILES', 'NEWS', 'ARTICLES',
  'AUDIENCES', 'CATEGORIES', 'DIFF', 'DIVISIONS', 'EXTRAS',
  'PODS', 'RUNOFSHOW', 'TILTS', 'WORKTABS',
];
// Only ever eval something that still looks like a pure data literal. When the
// brace matcher mis-parses (a regex or an apostrophe it read as a quote) the
// slice runs on into the template's class body - evaluating THAT starts the
// runtime's timers and node then never exits, which is exactly what hung the
// first attempt at this script.
const CODE = /\bfunction\b|=>|\bsetInterval\b|\bsetTimeout\b|\bnew [A-Z]|\bdocument\b|\bwindow\b/;

const out = {};
for (const n of NAMES) {
  const lit = sliceLiteral(n);
  if (!lit) { console.log(`-- ${n}: not found`); continue; }
  if (lit.length > 200_000) { console.log(`!! ${n}: slice ran away (${lit.length} chars) - skipped`); continue; }
  if (CODE.test(lit)) { console.log(`!! ${n}: slice contains code, not data - skipped`); continue; }
  try {
    // eslint-disable-next-line no-eval
    const val = (0, eval)(`(${lit})`);
    out[n] = val;
    const size = Array.isArray(val) ? `${val.length} items` : `${Object.keys(val).length} keys`;
    console.log(`ok ${n}: ${size}`);
  } catch (e) {
    console.log(`!! ${n}: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Content corrections, applied here so the emitted data file is already right
// rather than needing a hand edit afterwards.
//
// 1. MC Paps and Sauti Moto are removed from the site entirely - the working
//    relationships ended, so they come out of the crew, the partner wall, and
//    any prose that names them.
// 2. Everyone on the partner wall is an investor except PPP TV Kenya, which is
//    the one genuine partner. Roles and copy are relabelled to match.
// ---------------------------------------------------------------------------

const DROP = /mc\s*paps|sauti\s*moto/i;
const TRUE_PARTNER = 'PPP TV Kenya';

function scrub(node) {
  if (typeof node === 'string') {
    // Sentences that only exist to name a dropped person get cut at the clause.
    return node
      .replace(/,?\s*opened by MC Paps/gi, '')
      .replace(/MC Paps warmed up the hall before the first performances,\s*and the crowd/gi, 'The crowd')
      .replace(/MC PAPS\s*(?:·|•|\|)?\s*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  if (Array.isArray(node)) return node.map(scrub).filter((v) => !(typeof v === 'string' && DROP.test(v)));
  if (node && typeof node === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(node)) o[k] = scrub(v);
    return o;
  }
  return node;
}

function relabel(role, name) {
  if (name === TRUE_PARTNER) return role;
  return String(role || '').replace(/\bPartner\b/g, 'Investor').replace(/\bPartners\b/g, 'Investors');
}

if (out.TEAM) {
  const before = out.TEAM.length;
  out.TEAM = out.TEAM.filter((m) => !DROP.test(m.name || '')).map(scrub);
  console.log(`\nTEAM: dropped ${before - out.TEAM.length} (MC Paps)`);
}

if (out.PARTNERS) {
  const before = out.PARTNERS.length;
  out.PARTNERS = out.PARTNERS
    .filter((p) => !DROP.test(p.name || ''))
    .map((p) => ({ ...scrub(p), role: relabel(p.role, p.name), tier: p.name === TRUE_PARTNER ? 'partner' : 'investor' }));
  console.log(`PARTNERS: dropped ${before - out.PARTNERS.length} (Sauti Moto), ${out.PARTNERS.filter((p) => p.tier === 'investor').length} relabelled investor`);
}

if (out.PARTNER_FILES) {
  for (const k of Object.keys(out.PARTNER_FILES)) {
    if (DROP.test(k)) { delete out.PARTNER_FILES[k]; continue; }
    out.PARTNER_FILES[k] = scrub(out.PARTNER_FILES[k]);
  }
}

// Every remaining section: drop the departed names out of prose, and move
// "For partners, X is ..." copy to investor language for everyone but PPP TV.
for (const key of Object.keys(out)) {
  if (key === 'PARTNERS') continue; // already handled, keeps its tier field
  out[key] = JSON.parse(
    JSON.stringify(scrub(out[key]))
      .replace(/For partners,/g, 'For investors,')
      .replace(/\bpartnership opportunities\b/gi, 'investment opportunities'),
  );
}

const leftover = JSON.stringify(out).match(/mc\s*paps|sauti\s*moto/gi);
if (leftover) {
  console.log(`\n!! ${leftover.length} reference(s) still present: ${[...new Set(leftover)].join(', ')}`);
  process.exitCode = 1;
}

// Written outside the repo on purpose: this tree is read-only to shell
// processes here, so the JSON is staged in the temp dir and the real data
// module is authored from it.
const dest = process.env.EXTRACT_OUT || '/tmp/ugt-extracted.json';
await fs.writeFile(dest, JSON.stringify(out, null, 2));
console.log(`\nwrote ${dest}`);
// hard exit: if any evaluated literal ever leaves a handle open, do not hang
process.exit(0);
