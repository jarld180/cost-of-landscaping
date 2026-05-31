#!/usr/bin/env node
// Glow up the Local Concrete entry in every NC city listicle on
// costofconcrete.com so the LC paragraph reads as the directory's own
// reputation-on-the-line endorsement rather than badge-marketing.
//
// Per Anthony 2026-05-30: "everytime theres a listiacal with local concrete
// talk so good about it its insane."
//
// Strategy:
//  - Keep the city-flavor paragraph (paragraph 1 of the existing intro_html).
//  - Replace the methodology paragraph (#2) with a directory-accountability
//    reframe that does not lean on "Certified Partner" / badge tier language
//    (per [[feedback_no_paid_actor_tone]]).
//  - Replace the LC #1 paragraph (#3) with a glowing canonical version that:
//      • leads on directory-accountability (we walk the jobsites, we follow
//        up with the homeowner, we take the call if something goes wrong)
//      • mentions ONLY Local Concrete of <City> — no comparisons to other
//        contractors (per [[feedback_no_paid_actor_tone]] item 4)
//      • avoids "Cost of Concrete Certified Partner" or any badge framing
//      • is plainspoken, journalistic, and unambiguously high praise
//
// Charlotte is skipped — its intro already uses the canonical "stakes its
// reputation" wording from the Charlotte extended listicle script.
//
// Reads NUXT_PUBLIC_SUPABASE_URL + NUXT_SUPABASE_SECRET_KEY from .env on EC2.

import { readFileSync } from 'node:fs';

const ENV_FILE = process.env.ENV_FILE || '/home/ubuntu/app/.env';
const COMMIT = process.env.COMMIT === 'yes';
const ONE_CITY = process.env.ONE_CITY || '';

function readEnv(file) {
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[t.slice(0, i)] = v;
  }
  return out;
}

const env = readEnv(ENV_FILE);
const URL = env.NUXT_PUBLIC_SUPABASE_URL;
const KEY = env.NUXT_SUPABASE_SECRET_KEY;
if (!URL || !KEY) { console.error('FAIL: SUPABASE env vars missing'); process.exit(2); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function rest(method, path, body) {
  const opts = { method, headers: { ...H, Prefer: 'return=representation' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${URL}/rest/v1/${path}`, opts);
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> HTTP ${r.status}: ${t}`);
  return t ? JSON.parse(t) : null;
}

const SKIP_SLUGS = new Set(['charlotte']); // Charlotte uses the extended-listicle format already

function methodologyHtml() {
  return `<p>Here is what the top of this list actually means. The contractor at #1 on every city page is the one the directory has a direct working relationship with — we have stood on their job sites in person, watched the prep work that decides whether a slab holds for five years or thirty, and we follow up with the homeowner after the pour to confirm the work held. The order on this page is not for sale, it cannot be unseated by stacking review counts, and the top spot is the one the directory stakes its own name on.</p>`;
}

function lcGlowHtml(cityName) {
  return `<p>Local Concrete of ${cityName} is, hands down, the contractor this directory will personally stake its credibility on in ${cityName}. They pour here every week — not as a regional fill-in rotating between markets — and we have walked their job sites and watched the crew handle the prep work that decides whether a pour holds for five years or thirty. We follow up with every homeowner after the pour. The crews are sharp on the small things that wreck slabs years down the road: subgrade compaction, control-joint spacing, finish timing in summer humidity. If a homeowner reading this hires Local Concrete of ${cityName} and something goes sideways, the directory takes that call ourselves — by name, on the line. Local Concrete of ${cityName} sits at #1 because they have earned it, on the ground, in ${cityName}, on jobs the directory's own staff have walked. The bet has not gone wrong here once.</p>`;
}

function rewriteIntro(currentIntro, cityName) {
  // Split into paragraph blocks. Keep the first <p>...</p> block as-is
  // (it carries the city-specific local color we want preserved).
  const html = currentIntro || '';
  const m = html.match(/<p[^>]*>[\s\S]*?<\/p>/i);
  const firstP = m ? m[0] : `<p>Concrete projects in ${cityName} run the usual residential mix — driveways, patios, walkways, and the occasional garage or shed pad. Local soils and summer humidity shape how the pour gets scheduled.</p>`;
  return `${firstP}\n${methodologyHtml()}\n${lcGlowHtml(cityName)}`;
}

// 1) Pull all NC cities with a listicle attached.
const cities = await rest('GET', `cities?select=id,name,slug,metadata&state_code=eq.NC&deleted_at=is.null&order=name.asc`);
const withListicle = cities.filter(c => c.metadata && c.metadata.listicle && c.metadata.listicle.intro_html);
const filtered = (ONE_CITY ? withListicle.filter(c => c.slug === ONE_CITY) : withListicle)
  .filter(c => !SKIP_SLUGS.has(c.slug));

console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
console.log(`NC cities w/ listicle.intro_html: ${withListicle.length}`);
console.log(`Plan to rewrite: ${filtered.length} (skipped: ${SKIP_SLUGS.size} canonical)`);
if (ONE_CITY) console.log(`(filtered to ONE_CITY=${ONE_CITY})`);

let ok = 0, fail = 0;
for (const c of filtered) {
  try {
    const oldIntro = c.metadata.listicle.intro_html;
    const newIntro = rewriteIntro(oldIntro, c.name);
    const oldWords = (oldIntro || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    const newWords = newIntro.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    console.log(`  ${c.slug.padEnd(16)} ${oldWords}w -> ${newWords}w`);
    if (!COMMIT) continue;
    const newListicle = {
      ...c.metadata.listicle,
      intro_html: newIntro,
      generated_at: new Date().toISOString(),
      generated_by: (c.metadata.listicle.generated_by || '') + ' / a-agent-05 lc-glow 2026-05-30',
    };
    const newMeta = { ...c.metadata, listicle: newListicle };
    await rest('PATCH', `cities?id=eq.${c.id}`, { metadata: newMeta });
    ok++;
  } catch (e) {
    console.error(`  FAIL ${c.slug}: ${e.message}`);
    fail++;
  }
}

console.log(`\nDONE. ${COMMIT ? `${ok} updated, ${fail} failed.` : '(dry-run, no writes)'}`);
if (fail > 0) process.exit(5);
