#!/usr/bin/env node
// Demote the 5 real Charlotte companies from trusted_partner to fully_verified.
// Reason: the page's "other contractors" listing filters OUT trusted_partner,
// so when everything is trusted_partner the listing is empty and only the
// SINGLE pinned trusted_partner card renders. Demoting these 5 puts them
// in the visible "other contractors" section while preserving LC of
// Charlotte + Charlotte Concrete Co. as the trusted partner pins.

import { readFileSync } from 'node:fs';

const COMMIT = process.env.COMMIT === 'yes';
function readEnv(file) {
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('='); if (i < 0) continue;
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[t.slice(0, i)] = v;
  }
  return out;
}
const env = readEnv('/home/ubuntu/app/.env');
const URL = env.NUXT_PUBLIC_SUPABASE_URL, KEY = env.NUXT_SUPABASE_SECRET_KEY;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const SLUGS = [
  'citiscape-concrete-charlotte',
  'venture-concrete-charlotte',
  'dan-the-man-concrete-charlotte',
  'concrete-design-artisans-charlotte',
  'brothers-concrete-decoration-charlotte',
  'demilo-bros-charlotte',
];
const CHARLOTTE_ID = '7cec1898-5044-4348-93f7-d9d609788f25';

console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
console.log(`Plan: demote ${SLUGS.length} real Charlotte companies trusted_partner -> fully_verified`);

if (!COMMIT) { console.log('[dry-run] no write.'); process.exit(0); }

const r = await fetch(`${URL}/rest/v1/contractors?city_id=eq.${CHARLOTTE_ID}&slug=in.(${SLUGS.join(',')})`, {
  method: 'PATCH',
  headers: { ...headers, Prefer: 'return=representation' },
  body: JSON.stringify({ verification_tier: 'fully_verified' }),
});
const t = await r.text();
if (!r.ok) { console.error(`HTTP ${r.status}: ${t}`); process.exit(2); }
const rows = JSON.parse(t);
console.log(`Updated ${rows.length} rows`);
for (const row of rows) console.log(`  ${row.company_name} -> ${row.verification_tier}`);
