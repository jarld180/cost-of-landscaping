#!/usr/bin/env node
// Fix: Local Concrete of Charlotte's lat/lng was at 35.2656/-80.9237 (5.27mi
// from Charlotte centroid radius origin). After inserting 6 real Charlotte
// companies at distance=0, LC dropped to #7 in the page listing. Update its
// lat/lng to the exact same Charlotte centroid the radius search uses, so it
// ties at distance 0 and the rating/review-count tiebreaker puts it back at #1.

import { readFileSync } from 'node:fs';

const ENV_FILE = '/home/ubuntu/app/.env';
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
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// LC of Charlotte contractor id (from prior queries)
const LC_CHARLOTTE_ID = '2288318c-5b65-495c-ad2f-3d5873095176';
const CHARLOTTE_LAT = 35.2655904;
const CHARLOTTE_LNG = -80.9236899;

console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
console.log(`Target: contractor ${LC_CHARLOTTE_ID} (Local Concrete of Charlotte)`);
console.log(`Set lat=${CHARLOTTE_LAT}, lng=${CHARLOTTE_LNG} (Charlotte centroid)`);

if (!COMMIT) { console.log('[dry-run] no write.'); process.exit(0); }

const r = await fetch(`${URL}/rest/v1/contractors?id=eq.${LC_CHARLOTTE_ID}`, {
  method: 'PATCH',
  headers: { ...headers, Prefer: 'return=representation' },
  body: JSON.stringify({ lat: CHARLOTTE_LAT, lng: CHARLOTTE_LNG }),
});
const txt = await r.text();
if (!r.ok) { console.error(`HTTP ${r.status}: ${txt}`); process.exit(2); }
const rows = JSON.parse(txt);
console.log(`Updated rows: ${rows.length}`);
console.log(`New lat/lng: ${rows[0]?.lat}, ${rows[0]?.lng}`);
