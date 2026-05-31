#!/usr/bin/env node
// PROMOTE real Charlotte companies back to trusted_partner. The earlier
// demote was unnecessary now that the page render logic (commit 80942fe)
// pins ONLY the home-city Local Concrete and lets all other trusted_partners
// (including these real Charlotte ones) flow into the visible numbered list.
//
// With them as trusted_partner + citySlug=charlotte + distance=0, they
// sort right after the Charlotte LC + Brand #2 pin and the neighboring-city
// spillover gets pushed below them.

import { readFileSync } from 'node:fs';
const COMMIT = process.env.COMMIT === 'yes';
function readEnv(file){const o={};for(const line of readFileSync(file,'utf8').split('\n')){const t=line.trim();if(!t||t.startsWith('#'))continue;const i=t.indexOf('=');if(i<0)continue;let v=t.slice(i+1);if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);o[t.slice(0,i)]=v;}return o;}
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
console.log(`Promoting ${SLUGS.length} real Charlotte companies fully_verified -> trusted_partner`);

if (!COMMIT) { console.log('[dry-run]'); process.exit(0); }

const r = await fetch(`${URL}/rest/v1/contractors?city_id=eq.${CHARLOTTE_ID}&slug=in.(${SLUGS.join(',')})`, {
  method: 'PATCH',
  headers: { ...headers, Prefer: 'return=representation' },
  body: JSON.stringify({ verification_tier: 'trusted_partner' }),
});
const t = await r.text();
if (!r.ok) { console.error(`HTTP ${r.status}: ${t}`); process.exit(2); }
const rows = JSON.parse(t);
console.log(`Updated ${rows.length}`);
for (const row of rows) console.log(`  ${row.company_name} -> ${row.verification_tier}`);
