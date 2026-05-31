#!/usr/bin/env node
// One-shot seed runner for NC brand expansion (a-agent-05, 2026-05-11).
//
// Reads NUXT_PUBLIC_SUPABASE_URL + NUXT_SUPABASE_SECRET_KEY from
// /home/ubuntu/app/.env, then POSTs rows to the Supabase REST API.
//
// Modes:
//   COMMIT=no   — dry-run: skips writes, just verifies connection + prints plan
//   COMMIT=yes  — actually inserts. Idempotent (Prefer: resolution=ignore-duplicates).
//
// Exit 0 on success, non-zero on failure.

import { readFileSync } from 'node:fs';

const ENV_FILE = process.env.ENV_FILE || '/home/ubuntu/app/.env';
const COMMIT = process.env.COMMIT === 'yes';

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
if (!URL || !KEY) {
  console.error(`FAIL: NUXT_PUBLIC_SUPABASE_URL or NUXT_SUPABASE_SECRET_KEY missing from ${ENV_FILE}`);
  process.exit(2);
}
console.log(`Using URL: ${URL}`);
console.log(`Service key (first 8): ${KEY.slice(0, 8)}…`);
console.log(`Mode: ${COMMIT ? 'COMMIT (writes happen)' : 'DRY-RUN (no writes)'}`);

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function pgrest(method, path, body, extraPrefer = '') {
  const opts = {
    method,
    headers: { ...headers, Prefer: ['return=representation', extraPrefer].filter(Boolean).join(',') },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${URL}/rest/v1/${path}`, opts);
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> HTTP ${r.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// === DATA ===
const NEW_CITIES = [
  { name: 'Wilmington',   slug: 'wilmington',   state_code: 'NC', lat: 34.2257, lng: -77.9447, metadata: {} },
  { name: 'Fayetteville', slug: 'fayetteville', state_code: 'NC', lat: 35.0527, lng: -78.8784, metadata: {} },
  { name: 'Greenville',   slug: 'greenville',   state_code: 'NC', lat: 35.6127, lng: -77.3664, metadata: {} },
  { name: 'Asheville',    slug: 'asheville',    state_code: 'NC', lat: 35.5951, lng: -82.5515, metadata: {} },
];

// Existing city IDs (hardcoded from prior diagnostic queries).
const CID = {
  charlotte:      '7cec1898-5044-4348-93f7-d9d609788f25',
  mooresville:    'cbfbe7ee-4e76-44da-87eb-487a4f9a8db8',
  gastonia:       'd15c20ec-11a1-4d18-a8a6-af817732a264',
  raleigh:        '878b6106-0acd-4062-8035-533f099c63de',
  durham:         'cb80537a-3c26-4326-b25d-62c932cc8804',
  greensboro:     'b925aef5-8bab-48eb-b7e9-80c08216e3ac',
  winstonsalem:   'caf5b405-32d7-480e-84a0-449815c8a9d8',
  hickory:        '17c0310b-fac6-4510-9896-63885b065d05',
  statesville:    '3b1bafd8-c64c-46a1-a3aa-a11f91738b80',
  cary:           'ed4bb261-3fcc-4f68-9c2c-af6539c0cd54',
  chapelhill:     '662deb49-2acb-4b18-a51d-3b11cb247e5b',
  claremont:      '5cfb38c1-94a8-499c-9ded-b9ffc2744f8c',
  clayton:        '2f51a31d-80f4-4494-84c5-8ea1cea3c71e',
  clemmons:       '06206b04-590b-4298-9458-29094bb0d634',
  concord:        '3c81b6a0-60a6-4fd5-9a4c-3964165cb3b6',
  fuquay:         'beae8444-463f-4b1b-8b00-b929c8719d81',
  garner:         '2e05ff60-ded0-4213-ad9d-f853d0e551b3',
  huntersville:   '73d38839-9b48-49f6-8b00-dd8a1fa004f3',
  minthill:       '2872b837-84b1-46ba-a4ab-82eab205d4ba',
  newton:         '91c25580-c41a-4e2b-ae45-84d0218d4092',
  pineville:      '84f32449-3759-40e1-aaaa-195901e5038a',
  southpark:      'e64898c2-2dcd-42c1-9804-c91047f3224a',
  // these 4 get filled in after city insert/lookup
  wilmington:     null,
  fayetteville:   null,
  greenville:     null,
  asheville:      null,
};

const META = { images: [], pending_images: [] };
const T = 'trusted_partner';

function ll(slug, name) {
  return ({ city_id, lat, lng, rc }) => ({
    company_name: name, slug, city_id,
    lat, lng, rating: 5.0, review_count: rc, status: 'active', verification_tier: T,
    metadata: META, website: `https://localconcretecontractor.com/${slug.replace(/^local-concrete-of-/, '')}`,
  });
}

function co(slug, name, city_id, lat, lng, rc) {
  return { company_name: name, slug, city_id, lat, lng, rating: 5.0, review_count: rc, status: 'active', verification_tier: T, metadata: META, website: null };
}

function sg(slug, name, city_id, lat, lng, rating, rc) {
  return { company_name: name, slug, city_id, lat, lng, rating, review_count: rc, status: 'active', verification_tier: T, metadata: META, website: null };
}

// === Build rows after city IDs are resolved ===
function buildContractorRows() {
  const newLC = [
    ll('local-concrete-of-charlotte',    'Local Concrete of Charlotte')   ({ city_id: CID.charlotte,    lat: 35.2655904, lng: -80.9236899, rc: 68 }),
    ll('local-concrete-of-raleigh',      'Local Concrete of Raleigh')     ({ city_id: CID.raleigh,      lat: 35.8772566, lng: -78.5926535, rc: 35 }),
    ll('local-concrete-of-wilmington',   'Local Concrete of Wilmington')  ({ city_id: CID.wilmington,   lat: 34.2257,    lng: -77.9447,    rc: 29 }),
    ll('local-concrete-of-fayetteville', 'Local Concrete of Fayetteville')({ city_id: CID.fayetteville, lat: 35.0527,    lng: -78.8784,    rc: 45 }),
    ll('local-concrete-of-greenville',   'Local Concrete of Greenville')  ({ city_id: CID.greenville,   lat: 35.6127,    lng: -77.3664,    rc: 43 }),
    ll('local-concrete-of-asheville',    'Local Concrete of Asheville')   ({ city_id: CID.asheville,    lat: 35.5951,    lng: -82.5515,    rc: 42 }),
  ];

  const concreteCo = [
    co('charlotte-concrete-co',     'Charlotte Concrete Co.',     CID.charlotte,    35.2655904, -80.9236899, 64),
    co('mooresville-concrete-co',   'Mooresville Concrete Co.',   CID.mooresville,  35.5843,    -80.8098,    47),
    co('gastonia-concrete-co',      'Gastonia Concrete Co.',      CID.gastonia,     35.2621,    -81.1873,    39),
    co('raleigh-concrete-co',       'Raleigh Concrete Co.',       CID.raleigh,      35.8772566, -78.5926535, 62),
    co('durham-concrete-co',        'Durham Concrete Co.',        CID.durham,       35.994,     -78.8986,    33),
    co('greensboro-concrete-co',    'Greensboro Concrete Co.',    CID.greensboro,   36.0726,    -79.792,     65),
    co('winston-salem-concrete-co', 'Winston-Salem Concrete Co.', CID.winstonsalem, 36.0999,    -80.2442,    55),
    co('wilmington-concrete-co-nc', 'Wilmington Concrete Co.',    CID.wilmington,   34.2257,    -77.9447,    30),
    co('fayetteville-concrete-co',  'Fayetteville Concrete Co.',  CID.fayetteville, 35.0527,    -78.8784,    29),
    co('hickory-concrete-co-nc',    'Hickory Concrete Co.',       CID.hickory,      35.7332,    -81.3412,    33),
    co('greenville-concrete-co-nc', 'Greenville Concrete Co.',    CID.greenville,   35.6127,    -77.3664,    41),
    co('asheville-concrete-co',     'Asheville Concrete Co.',     CID.asheville,    35.5951,    -82.5515,    42),
    co('statesville-concrete-co',   'Statesville Concrete Co.',   CID.statesville,  35.7826,    -80.8873,    60),
    co('cary-concrete-co',          'Cary Concrete Co.',          CID.cary,         35.7915,    -78.7811,    66),
    co('chapel-hill-concrete-co',   'Chapel Hill Concrete Co.',   CID.chapelhill,   35.9132,    -79.0558,    29),
    co('claremont-concrete-co',     'Claremont Concrete Co.',     CID.claremont,    35.7196,    -81.1587,    63),
    co('clayton-concrete-co',       'Clayton Concrete Co.',       CID.clayton,      35.6507,    -78.4572,    40),
    co('clemmons-concrete-co',      'Clemmons Concrete Co.',      CID.clemmons,     36.0293,    -80.3823,    69),
    co('concord-concrete-co',       'Concord Concrete Co.',       CID.concord,      35.4088,    -80.5796,    72),
    co('fuquay-varina-concrete-co', 'Fuquay-Varina Concrete Co.', CID.fuquay,       35.5843,    -78.7997,    62),
    co('garner-concrete-co',        'Garner Concrete Co.',        CID.garner,       35.7289871, -78.5745661, 54),
    co('huntersville-concrete-co',  'Huntersville Concrete Co.',  CID.huntersville, 35.4107,    -80.8429,    42),
    co('mint-hill-concrete-co',     'Mint Hill Concrete Co.',     CID.minthill,     35.1793,    -80.6487,    56),
    co('newton-concrete-co',        'Newton Concrete Co.',        CID.newton,       35.6696,    -81.2218,    65),
    co('pineville-concrete-co',     'Pineville Concrete Co.',     CID.pineville,    35.0832,    -80.8876,    45),
    co('south-park-concrete-co',    'South Park Concrete Co.',    CID.southpark,    35.1513,    -80.8526,    28),
  ];

  const smallGuys = [
    sg('josh-halverson-concrete-cary',          'Josh Halverson Concrete',  CID.cary,         35.7915,    -78.7811,    4.3, 14),
    sg('mike-reyes-concrete-chapel-hill',       'Mike Reyes Concrete',      CID.chapelhill,   35.9132,    -79.0558,    4.5, 11),
    sg('dave-polanski-concrete-claremont',      'Dave Polanski Concrete',   CID.claremont,    35.7196,    -81.1587,    4.2, 19),
    sg('chris-bauer-concrete-clayton',          'Chris Bauer Concrete',     CID.clayton,      35.6507,    -78.4572,    4.4, 9),
    sg('tony-salerno-concrete-clemmons',        'Tony Salerno Concrete',    CID.clemmons,     36.0293,    -80.3823,    4.6, 22),
    sg('brandon-kovacs-concrete-concord',       'Brandon Kovacs Concrete',  CID.concord,      35.4088,    -80.5796,    4.3, 17),
    sg('ricky-voss-concrete-fuquay-varina',     'Ricky Voss Concrete',      CID.fuquay,       35.5843,    -78.7997,    4.2, 8),
    sg('jay-brennan-concrete-garner',           'Jay Brennan Concrete',     CID.garner,       35.7289871, -78.5745661, 4.5, 15),
    sg('marco-salvatore-concrete-huntersville', 'Marco Salvatore Concrete', CID.huntersville, 35.4107,    -80.8429,    4.4, 18),
    sg('steve-tatum-concrete-mint-hill',        'Steve Tatum Concrete',     CID.minthill,     35.1793,    -80.6487,    4.3, 12),
    sg('will-hartman-concrete-newton',          'Will Hartman Concrete',    CID.newton,       35.6696,    -81.2218,    4.5, 23),
    sg('nick-donato-concrete-pineville',        'Nick Donato Concrete',     CID.pineville,    35.0832,    -80.8876,    4.4, 10),
    sg('eli-marchetti-concrete-south-park',     'Eli Marchetti Concrete',   CID.southpark,    35.1513,    -80.8526,    4.6, 25),
  ];

  return { newLC, concreteCo, smallGuys };
}

async function run() {
  // 1) Connection test
  const test = await fetch(`${URL}/rest/v1/cities?select=id&limit=1`, { headers });
  console.log(`Connection test: HTTP ${test.status}`);
  if (!test.ok) {
    console.error(`Auth or URL bad: ${await test.text()}`);
    process.exit(3);
  }

  // 2) Insert / upsert 4 NC cities
  if (COMMIT) {
    const insertedCities = await pgrest(
      'POST',
      'cities?on_conflict=slug,state_code',
      NEW_CITIES,
      'resolution=ignore-duplicates'
    );
    console.log(`cities upsert: ${insertedCities.length} returned`);
  } else {
    console.log(`[dry-run] would upsert ${NEW_CITIES.length} cities: ${NEW_CITIES.map(c => c.slug).join(', ')}`);
  }

  // Always resolve final UUIDs via SELECT (works for both modes — for dry-run we still test the GET path)
  const lookup = await pgrest(
    'GET',
    `cities?select=id,slug&state_code=eq.NC&slug=in.(wilmington,fayetteville,greenville,asheville)`
  );
  for (const row of lookup || []) {
    if (CID[row.slug] === null) CID[row.slug] = row.id;
  }
  const missing = ['wilmington', 'fayetteville', 'greenville', 'asheville'].filter(s => !CID[s]);
  if (COMMIT && missing.length) {
    console.error(`FAIL: city IDs missing after upsert: ${missing.join(', ')}`);
    process.exit(4);
  }
  if (!COMMIT && missing.length) {
    // For dry-run, use placeholder UUIDs for planning
    const placeholder = '00000000-0000-0000-0000-000000000000';
    missing.forEach(s => CID[s] = placeholder);
    console.log(`[dry-run] new-city UUIDs will be assigned at insert time (using placeholders for planning)`);
  }
  console.log(`Resolved UUIDs for new cities: wilmington=${CID.wilmington}, fayetteville=${CID.fayetteville}, greenville=${CID.greenville}, asheville=${CID.asheville}`);

  // 3) Build contractor rows
  const { newLC, concreteCo, smallGuys } = buildContractorRows();
  console.log(`Plan: ${newLC.length} LC anchors + ${concreteCo.length} City Concrete Co. + ${smallGuys.length} small-guy = ${newLC.length + concreteCo.length + smallGuys.length} contractor rows`);

  if (!COMMIT) {
    console.log('[dry-run] skipping contractor inserts. Sample row:');
    console.log(JSON.stringify(newLC[0], null, 2));
    return;
  }

  // 4) Insert contractors in 3 batches
  for (const [label, batch] of [['LC anchors', newLC], ['City Concrete Co.', concreteCo], ['small-guys', smallGuys]]) {
    const inserted = await pgrest(
      'POST',
      'contractors?on_conflict=city_id,slug',
      batch,
      'resolution=ignore-duplicates'
    );
    console.log(`contractors[${label}]: ${inserted.length} of ${batch.length} returned (others were duplicates/skipped)`);
  }

  // 5) Final counts
  const totals = await pgrest(
    'GET',
    `contractors?select=id&or=(company_name.like.Local Concrete *,company_name.like.* Concrete Co.,verification_tier.eq.trusted_partner)&limit=1`
  );
  console.log('SUCCESS: seed complete.');
}

run().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(5);
});
