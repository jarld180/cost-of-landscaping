#!/usr/bin/env node
// Count contractors in DB by various filters to reconcile the public-API
// 9,689 against the seller's claim of 22,000.

import { readFileSync } from 'node:fs';
function readEnv(f){const o={};for(const l of readFileSync(f,'utf8').split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const i=t.indexOf('=');if(i<0)continue;let v=t.slice(i+1);if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);o[t.slice(0,i)]=v;}return o;}
const env = readEnv('/home/ubuntu/app/.env');
const URL = env.NUXT_PUBLIC_SUPABASE_URL, KEY = env.NUXT_SUPABASE_SECRET_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function count(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
  const total = r.headers.get('content-range')?.split('/')[1];
  return total;
}

const totals = {
  'all rows (no filter)': await count('contractors?select=id'),
  'active only': await count('contractors?select=id&status=eq.active'),
  'active + not deleted': await count('contractors?select=id&status=eq.active&deleted_at=is.null'),
  'deleted (soft)': await count('contractors?select=id&deleted_at=not.is.null'),
  'inactive status': await count('contractors?select=id&status=neq.active'),
  'NC active': await count('contractors?select=id&status=eq.active&deleted_at=is.null&cities(state_code)=eq.NC'),
  'has phone null': await count('contractors?select=id&phone=is.null'),
  'has website null': await count('contractors?select=id&website=is.null'),
  'trusted_partner': await count('contractors?select=id&verification_tier=eq.trusted_partner&deleted_at=is.null'),
  'fully_verified': await count('contractors?select=id&verification_tier=eq.fully_verified&deleted_at=is.null'),
  'basic_verified': await count('contractors?select=id&verification_tier=eq.basic_verified&deleted_at=is.null'),
  'unverified': await count('contractors?select=id&verification_tier=eq.unverified&deleted_at=is.null'),
};

console.log('CONTRACTOR COUNTS:\n');
for (const [k, v] of Object.entries(totals)) {
  console.log(`  ${k.padEnd(25)} ${v}`);
}
