#!/usr/bin/env node
// Per-city listicle content generator for the 26 NC cities.
// For each city: calls Claude Sonnet 4.6 to produce intro_html + closing_html +
// 5 FAQs + 5 "other contractors" with realistic names/ratings. Writes
// intro/closing/FAQs to cities.metadata.listicle and inserts the other
// contractors as new rows with non-trusted verification tiers so they
// render in the "other contractors" section below the trusted partners.
//
// Reads from /home/ubuntu/app/.env on EC2:
//   NUXT_ANTHROPIC_API_KEY
//   NUXT_PUBLIC_SUPABASE_URL
//   NUXT_SUPABASE_SECRET_KEY
//
// Idempotent: metadata.listicle is overwritten each run; other contractors
// use ON CONFLICT (city_id, slug) so re-runs don't duplicate.

import { readFileSync } from 'node:fs';

const ENV_FILE = process.env.ENV_FILE || '/home/ubuntu/app/.env';
const COMMIT = process.env.COMMIT === 'yes';
const ONE_CITY = process.env.ONE_CITY || ''; // optional: limit to a single city slug for testing

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
const SUPA_URL = env.NUXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = env.NUXT_SUPABASE_SECRET_KEY;
const ANTHROPIC_KEY = env.NUXT_ANTHROPIC_API_KEY;
for (const [k, v] of Object.entries({ SUPA_URL, SUPA_KEY, ANTHROPIC_KEY })) {
  if (!v) { console.error(`FAIL: ${k} missing from ${ENV_FILE}`); process.exit(2); }
}
console.log(`URL: ${SUPA_URL}`);
console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
if (ONE_CITY) console.log(`Limited to: ${ONE_CITY}`);

const supaHeaders = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' };

async function supa(method, path, body, extraPrefer = '') {
  const opts = { method, headers: { ...supaHeaders, Prefer: ['return=representation', extraPrefer].filter(Boolean).join(',') } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> HTTP ${r.status}: ${t}`);
  return t ? JSON.parse(t) : null;
}

// City roster — slug, name, role (anchor/suburb), city_id, lat, lng
// city_ids for the 22 pre-existing cities are the same as the seed script
// used; the 4 new cities (Wilmington/Fayetteville/Greenville/Asheville) are
// resolved at runtime from the DB.
const STATIC_CITIES = [
  { slug: 'charlotte',      name: 'Charlotte',      role: 'anchor', id: '7cec1898-5044-4348-93f7-d9d609788f25', lat: 35.2655904, lng: -80.9236899 },
  { slug: 'mooresville',    name: 'Mooresville',    role: 'anchor', id: 'cbfbe7ee-4e76-44da-87eb-487a4f9a8db8', lat: 35.5843,    lng: -80.8098 },
  { slug: 'gastonia',       name: 'Gastonia',       role: 'anchor', id: 'd15c20ec-11a1-4d18-a8a6-af817732a264', lat: 35.2621,    lng: -81.1873 },
  { slug: 'raleigh',        name: 'Raleigh',        role: 'anchor', id: '878b6106-0acd-4062-8035-533f099c63de', lat: 35.8772566, lng: -78.5926535 },
  { slug: 'durham',         name: 'Durham',         role: 'anchor', id: 'cb80537a-3c26-4326-b25d-62c932cc8804', lat: 35.994,     lng: -78.8986 },
  { slug: 'greensboro',     name: 'Greensboro',     role: 'anchor', id: 'b925aef5-8bab-48eb-b7e9-80c08216e3ac', lat: 36.0726,    lng: -79.792 },
  { slug: 'winston-salem',  name: 'Winston-Salem',  role: 'anchor', id: 'caf5b405-32d7-480e-84a0-449815c8a9d8', lat: 36.0999,    lng: -80.2442 },
  { slug: 'hickory',        name: 'Hickory',        role: 'anchor', id: '17c0310b-fac6-4510-9896-63885b065d05', lat: 35.7332,    lng: -81.3412 },
  { slug: 'statesville',    name: 'Statesville',    role: 'anchor', id: '3b1bafd8-c64c-46a1-a3aa-a11f91738b80', lat: 35.7826,    lng: -80.8873 },
  { slug: 'cary',           name: 'Cary',           role: 'suburb', id: 'ed4bb261-3fcc-4f68-9c2c-af6539c0cd54', lat: 35.7915,    lng: -78.7811 },
  { slug: 'chapel-hill',    name: 'Chapel Hill',    role: 'suburb', id: '662deb49-2acb-4b18-a51d-3b11cb247e5b', lat: 35.9132,    lng: -79.0558 },
  { slug: 'claremont',      name: 'Claremont',      role: 'suburb', id: '5cfb38c1-94a8-499c-9ded-b9ffc2744f8c', lat: 35.7196,    lng: -81.1587 },
  { slug: 'clayton',        name: 'Clayton',        role: 'suburb', id: '2f51a31d-80f4-4494-84c5-8ea1cea3c71e', lat: 35.6507,    lng: -78.4572 },
  { slug: 'clemmons',       name: 'Clemmons',       role: 'suburb', id: '06206b04-590b-4298-9458-29094bb0d634', lat: 36.0293,    lng: -80.3823 },
  { slug: 'concord',        name: 'Concord',        role: 'suburb', id: '3c81b6a0-60a6-4fd5-9a4c-3964165cb3b6', lat: 35.4088,    lng: -80.5796 },
  { slug: 'fuquay-varina',  name: 'Fuquay-Varina',  role: 'suburb', id: 'beae8444-463f-4b1b-8b00-b929c8719d81', lat: 35.5843,    lng: -78.7997 },
  { slug: 'garner',         name: 'Garner',         role: 'suburb', id: '2e05ff60-ded0-4213-ad9d-f853d0e551b3', lat: 35.7289871, lng: -78.5745661 },
  { slug: 'huntersville',   name: 'Huntersville',   role: 'suburb', id: '73d38839-9b48-49f6-8b00-dd8a1fa004f3', lat: 35.4107,    lng: -80.8429 },
  { slug: 'mint-hill',      name: 'Mint Hill',      role: 'suburb', id: '2872b837-84b1-46ba-a4ab-82eab205d4ba', lat: 35.1793,    lng: -80.6487 },
  { slug: 'newton',         name: 'Newton',         role: 'suburb', id: '91c25580-c41a-4e2b-ae45-84d0218d4092', lat: 35.6696,    lng: -81.2218 },
  { slug: 'pineville',      name: 'Pineville',      role: 'suburb', id: '84f32449-3759-40e1-aaaa-195901e5038a', lat: 35.0832,    lng: -80.8876 },
  { slug: 'south-park',     name: 'South Park',     role: 'suburb', id: 'e64898c2-2dcd-42c1-9804-c91047f3224a', lat: 35.1513,    lng: -80.8526 },
];

const NEW_CITY_SLUGS = ['wilmington', 'fayetteville', 'greenville', 'asheville'];

async function resolveNewCities() {
  const list = await supa('GET', `cities?select=id,name,slug,lat,lng&state_code=eq.NC&slug=in.(${NEW_CITY_SLUGS.join(',')})`);
  return list.map(r => ({ slug: r.slug, name: r.name, role: 'anchor', id: r.id, lat: r.lat, lng: r.lng }));
}

const SYSTEM_PROMPT = `You write local SEO content for cost-of-concrete.com, a directory site for concrete contractors. Style: helpful, specific, plainspoken. Never compare concrete to other materials (asphalt, pavers, etc.). Never mention deposits or down-payments. Outcome-focused, not feature-focused. Be specific to the city — reference real neighborhoods, climate facts, or local context. Avoid AI-tells (no "in conclusion", "moreover", "in today's fast-paced world"). Write as if a knowledgeable local wrote it.

Return ONLY valid JSON matching this schema (no preamble, no code fences):
{
  "intro_html": "<p>...</p><p>...</p>",
  "closing_html": "<p>...</p>",
  "faqs": [
    {"question": "...", "answer": "..."},
    ... 5 total
  ],
  "other_contractors": [
    {"name": "Pearson Concrete LLC", "rating": 4.4, "review_count": 18, "tier": "basic_verified"},
    ... 5 total
  ]
}

CONSTRAINTS:
- intro_html: **EXACTLY ONE <p> tag. 60-90 words. NO h3 subsections, NO multi-paragraph essays, NO "Why X matters" framing.** Write like a knowledgeable local mentioning what kind of concrete work this city sees and one specific local detail (a neighborhood, soil type, or climate factor — just one). Plainspoken, not promotional. Example length and feel: "Concrete work in {City} mostly means driveways, patios, and the occasional garage pad — older homes around {Neighborhood} sometimes need a full tear-out and repour because the original slabs were thin. Summer heat speeds the cure, so most crews schedule pours early in the day this time of year."
- closing_html: **EXACTLY ONE <p> tag. 35-55 words. No essay.** Practical one-sentence-each: get a couple quotes, ask about insurance, expect 1-3 days of work plus cure time. No "WHY this matters" lecturing. No "Local Concrete of <City> is your best choice" sales pitch.
- faqs: **3 short FAQs.** Each answer is 1-2 sentences max — direct answer, not a justification essay. Use city name in 2 of the 3 questions. Topics: typical local cost range per sq ft, best time of year to pour, how long the job takes. Skip the licensing/insurance question.
- other_contractors: 5 plausible NC concrete contractor business names that DON'T match any of these reserved names: "Local Concrete", "<City> Concrete Co.", "Charlotte Concrete Pros", "Best Concrete", "Willard Construction". Mix of professional-sounding LLCs and family-named operations. Ratings between 3.8 and 4.7. Review counts between 4 and 38. Tiers: exactly 1 "fully_verified", 2 "basic_verified", 2 "unverified".`;

async function callClaude(city) {
  const userPrompt = `City: ${city.name}, NC
Role on site: ${city.role} city
Existing trusted-partner brands already on this page: "Local Concrete of ${city.name}", "${city.name} Concrete Co."${city.role === 'suburb' ? ` plus a small-guy first+last brand` : ''}

Generate the JSON.`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!r.ok) throw new Error(`Claude API HTTP ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const text = j.content?.[0]?.text || '';
  let parsed;
  try {
    // Strip code-fence wrap if model added it
    const cleaned = text.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Claude returned non-JSON for ${city.name}: ${text.slice(0, 200)}…`);
  }
  return parsed;
}

function slugify(s) {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function writeCity(city, content) {
  // 1) Merge listicle into cities.metadata
  // Read current metadata, merge, write back. (No PostgREST JSONB merge in
  // a single call without a custom RPC, so do read+write.)
  const cur = await supa('GET', `cities?select=metadata&id=eq.${city.id}`);
  const oldMeta = (cur && cur[0] && cur[0].metadata) || {};
  const newMeta = {
    ...oldMeta,
    listicle: {
      intro_html: content.intro_html,
      closing_html: content.closing_html,
      faqs: content.faqs,
      generated_at: new Date().toISOString(),
      generated_by: 'a-agent-05 / claude-sonnet-4-6',
    },
  };
  await supa('PATCH', `cities?id=eq.${city.id}`, { metadata: newMeta });

  // 2) Insert other_contractors as new rows
  const rows = content.other_contractors.map(o => ({
    company_name: o.name,
    slug: `${slugify(o.name)}-${city.slug}`,
    city_id: city.id,
    lat: city.lat,
    lng: city.lng,
    rating: o.rating,
    review_count: o.review_count,
    status: 'active',
    verification_tier: ['trusted_partner', 'fully_verified', 'basic_verified', 'unverified'].includes(o.tier) && o.tier !== 'trusted_partner' ? o.tier : 'unverified',
    metadata: { images: [], pending_images: [] },
    website: null,
  }));
  const inserted = await supa('POST', 'contractors?on_conflict=city_id,slug', rows, 'resolution=ignore-duplicates');
  return { listicleWritten: true, contractorsInserted: inserted.length, contractorsSkipped: rows.length - inserted.length };
}

async function run() {
  // Health check
  const test = await fetch(`${SUPA_URL}/rest/v1/cities?select=id&limit=1`, { headers: supaHeaders });
  if (!test.ok) { console.error(`Supabase connection bad: HTTP ${test.status}`); process.exit(3); }
  console.log(`Supabase connection: HTTP ${test.status}`);

  const cities = [...STATIC_CITIES, ...(await resolveNewCities())];
  console.log(`Cities to process: ${cities.length}${ONE_CITY ? ` (filtered to ${ONE_CITY})` : ''}`);

  const filtered = ONE_CITY ? cities.filter(c => c.slug === ONE_CITY) : cities;
  if (!filtered.length) { console.error(`No matching city for ONE_CITY=${ONE_CITY}`); process.exit(4); }

  let completed = 0, failed = 0;
  for (const city of filtered) {
    const t0 = Date.now();
    try {
      console.log(`\n[${completed + 1}/${filtered.length}] ${city.name}, NC...`);
      const content = await callClaude(city);
      const intro_words = (content.intro_html || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
      const closing_words = (content.closing_html || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
      console.log(`  Generated: intro=${intro_words}w, closing=${closing_words}w, faqs=${content.faqs?.length}, others=${content.other_contractors?.length}`);
      if (!COMMIT) {
        console.log(`  [dry-run] sample other contractors: ${content.other_contractors.map(o => o.name).join(', ')}`);
        completed++;
        continue;
      }
      const result = await writeCity(city, content);
      console.log(`  Wrote: listicle merged into metadata; contractors +${result.contractorsInserted} (-${result.contractorsSkipped} dup) in ${Math.round((Date.now() - t0) / 1000)}s`);
      completed++;
    } catch (e) {
      console.error(`  FAIL ${city.name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDONE. ${completed} succeeded, ${failed} failed.`);
  if (failed > 0) process.exit(5);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(99); });
