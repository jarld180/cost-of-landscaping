#!/usr/bin/env node
// Strip the AI-generated listicle content (intro_html / closing_html / faqs)
// from cities.metadata for all 26 NC cities. Page renders without the long
// text once this runs — only the contractor listing + default FAQ stays.

import { readFileSync } from 'node:fs';
const COMMIT = process.env.COMMIT === 'yes';
function readEnv(f){const o={};for(const l of readFileSync(f,'utf8').split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const i=t.indexOf('=');if(i<0)continue;let v=t.slice(i+1);if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);o[t.slice(0,i)]=v;}return o;}
const env = readEnv('/home/ubuntu/app/.env');
const URL = env.NUXT_PUBLIC_SUPABASE_URL, KEY = env.NUXT_SUPABASE_SECRET_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);

// Fetch all NC cities with current metadata
const r = await fetch(`${URL}/rest/v1/cities?select=id,name,slug,metadata&state_code=eq.NC`, { headers: H });
const cities = await r.json();
console.log(`Found ${cities.length} NC cities`);

let updated = 0, skipped = 0;
for (const c of cities) {
  const meta = c.metadata || {};
  if (!meta.listicle) { skipped++; continue; }
  const { listicle, ...rest } = meta;
  if (!COMMIT) {
    console.log(`  [dry-run] would strip listicle from ${c.name}`);
    updated++;
    continue;
  }
  const u = await fetch(`${URL}/rest/v1/cities?id=eq.${c.id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ metadata: rest }),
  });
  if (!u.ok) {
    console.error(`  FAIL ${c.name}: HTTP ${u.status}: ${await u.text()}`);
    continue;
  }
  console.log(`  stripped listicle from ${c.name}`);
  updated++;
}
console.log(`\nDONE. ${updated} stripped, ${skipped} had no listicle.`);
