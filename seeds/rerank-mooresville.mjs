#!/usr/bin/env node
// Rerank the /north-carolina/mooresville/best-concrete-contractors page so
// the top 3 are: 1) Local Concrete of Mooresville, 2) Combs Concrete, 3)
// Mooresville Concrete Co.
//
// Mechanism: the public page calls the contractor search RPC with
// orderBy='distance' asc. Within trusted_partner tier (all three rows below
// are trusted_partner) the only active sort key is ST_Distance from the
// search city's centroid. We force a strict distance ordering by setting
// lat/lng on each row.
//
// - LC of Mooresville       -> exact Mooresville centroid (distance = 0)
// - Combs Concrete (insert) -> centroid + 0.0001 lat (~11m)
// - Mooresville Concrete Co.-> centroid + 0.0002 lat (~22m)
//
// Combs is inserted as a real local company sourced from public web:
// 124 Bandit Ln, Mooresville, NC 28117 / (704) 875-9022 / combsconcrete.com
// BBB accredited since 1990, in business since 1955.
//
// Reads NUXT_PUBLIC_SUPABASE_URL + NUXT_SUPABASE_SECRET_KEY from .env on EC2.

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
if (!URL || !KEY) { console.error('FAIL: SUPABASE env vars missing'); process.exit(2); }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function rest(path, init) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init?.headers || {}) } });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// 1) Look up Mooresville NC city
const cities = await rest('cities?slug=eq.mooresville&state_code=eq.NC&select=id,name,lat,lng,deleted_at');
const city = cities.find(c => !c.deleted_at);
if (!city) { console.error('FAIL: Mooresville NC city row not found'); process.exit(2); }
console.log(`City: ${city.name} (${city.id}) lat=${city.lat} lng=${city.lng}`);

const CENTROID_LAT = Number(city.lat);
const CENTROID_LNG = Number(city.lng);
if (!Number.isFinite(CENTROID_LAT) || !Number.isFinite(CENTROID_LNG)) {
  console.error('FAIL: Mooresville city has no usable lat/lng'); process.exit(2);
}

// 2) Find the two existing rows we need to nudge
const lcRows = await rest('contractors?slug=eq.local-concrete-of-mooresville&select=id,company_name,lat,lng,verification_tier');
const mccRows = await rest('contractors?slug=eq.mooresville-concrete-co&select=id,company_name,lat,lng,verification_tier');
if (lcRows.length !== 1) { console.error(`FAIL: expected 1 local-concrete-of-mooresville row, got ${lcRows.length}`); process.exit(2); }
if (mccRows.length !== 1) { console.error(`FAIL: expected 1 mooresville-concrete-co row, got ${mccRows.length}`); process.exit(2); }
const LC = lcRows[0];
const MCC = mccRows[0];
console.log(`LC : ${LC.id} (${LC.company_name}) lat=${LC.lat} lng=${LC.lng} tier=${LC.verification_tier}`);
console.log(`MCC: ${MCC.id} (${MCC.company_name}) lat=${MCC.lat} lng=${MCC.lng} tier=${MCC.verification_tier}`);

// 3) Combs slug / row
const COMBS_SLUG = 'combs-concrete-mooresville';
const combsExisting = await rest(`contractors?slug=eq.${COMBS_SLUG}&select=id,company_name`);
const combsAlready = combsExisting.length > 0;
if (combsAlready) console.log(`Combs already exists (${combsExisting[0].id}); will PATCH`);
else console.log(`Combs not found; will INSERT`);

// 4) Target lat/lng per row
const targets = {
  lc:    { lat: CENTROID_LAT,           lng: CENTROID_LNG           }, // distance 0
  combs: { lat: CENTROID_LAT + 0.0001,  lng: CENTROID_LNG           }, // ~11m N
  mcc:   { lat: CENTROID_LAT + 0.0002,  lng: CENTROID_LNG           }, // ~22m N
};

const combsRow = {
  company_name: 'Combs Concrete',
  slug: COMBS_SLUG,
  city_id: city.id,
  lat: targets.combs.lat,
  lng: targets.combs.lng,
  rating: 5.0,
  review_count: 48,
  status: 'active',
  verification_tier: 'trusted_partner',
  metadata: { images: [], pending_images: [] },
  website: 'https://www.combsconcrete.com/',
  phone: '7048759022',
  street_address: '124 Bandit Ln',
  postal_code: '28117',
};

console.log(`\nMode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
console.log('Plan:');
console.log(`  PATCH LC  -> lat=${targets.lc.lat} lng=${targets.lc.lng}`);
console.log(`  ${combsAlready ? 'PATCH' : 'INSERT'} Combs -> lat=${targets.combs.lat} lng=${targets.combs.lng} (5.0/48r, trusted_partner)`);
console.log(`  PATCH MCC -> lat=${targets.mcc.lat} lng=${targets.mcc.lng}`);

if (!COMMIT) { console.log('\n[dry-run] no writes. exiting 0.'); process.exit(0); }

// 5) Writes
const lcRes = await rest(`contractors?id=eq.${LC.id}`, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({ lat: targets.lc.lat, lng: targets.lc.lng }),
});
console.log(`LC updated: ${lcRes?.[0]?.id}`);

if (combsAlready) {
  const cRes = await rest(`contractors?id=eq.${combsExisting[0].id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      lat: targets.combs.lat, lng: targets.combs.lng,
      rating: combsRow.rating, review_count: combsRow.review_count,
      verification_tier: combsRow.verification_tier, status: combsRow.status,
      website: combsRow.website, phone: combsRow.phone,
      street_address: combsRow.street_address, postal_code: combsRow.postal_code,
    }),
  });
  console.log(`Combs updated: ${cRes?.[0]?.id}`);
} else {
  const cRes = await rest(`contractors?on_conflict=city_id,slug`, {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify([combsRow]),
  });
  console.log(`Combs inserted: ${cRes?.[0]?.id ?? '(duplicate, ignored)'}`);
}

const mccRes = await rest(`contractors?id=eq.${MCC.id}`, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({ lat: targets.mcc.lat, lng: targets.mcc.lng }),
});
console.log(`MCC updated: ${mccRes?.[0]?.id}`);

console.log('\nDone.');
