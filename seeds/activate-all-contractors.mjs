#!/usr/bin/env node
// Set status='active' on every contractor row that is NOT soft-deleted.
// Brings the site from ~9,886 surfaced contractors to ~21,092.

import { readFileSync } from 'node:fs';
const COMMIT = process.env.COMMIT === 'yes';
function readEnv(f){const o={};for(const l of readFileSync(f,'utf8').split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const i=t.indexOf('=');if(i<0)continue;let v=t.slice(i+1);if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);o[t.slice(0,i)]=v;}return o;}
const env = readEnv('/home/ubuntu/app/.env');
const URL = env.NUXT_PUBLIC_SUPABASE_URL, KEY = env.NUXT_SUPABASE_SECRET_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function count(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
  return r.headers.get('content-range')?.split('/')[1];
}

const before = {
  active: await count('contractors?select=id&status=eq.active&deleted_at=is.null'),
  inactive: await count('contractors?select=id&status=neq.active&deleted_at=is.null'),
  deleted: await count('contractors?select=id&deleted_at=not.is.null'),
};
console.log(`BEFORE: active=${before.active}, inactive(not deleted)=${before.inactive}, soft-deleted=${before.deleted}`);
console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);

if (!COMMIT) { console.log('[dry-run] would PATCH status=active on the inactive set'); process.exit(0); }

// Bulk PATCH all rows where status != 'active' AND deleted_at IS NULL
const r = await fetch(`${URL}/rest/v1/contractors?status=neq.active&deleted_at=is.null`, {
  method: 'PATCH',
  headers: { ...H, Prefer: 'return=minimal,count=exact' },
  body: JSON.stringify({ status: 'active' }),
});
console.log(`PATCH status: HTTP ${r.status}`);
console.log(`Content-Range: ${r.headers.get('content-range')}`);
if (!r.ok) { console.error(await r.text()); process.exit(2); }

const after = {
  active: await count('contractors?select=id&status=eq.active&deleted_at=is.null'),
  inactive: await count('contractors?select=id&status=neq.active&deleted_at=is.null'),
};
console.log(`AFTER: active=${after.active}, inactive(not deleted)=${after.inactive}`);

// --- Dump all active contractors to CSV: company_name, phone, state ---
import { writeFileSync, openSync, writeSync, closeSync } from 'node:fs';
const CSV_PATH = '/home/ubuntu/contractors-active.csv';
const fd = openSync(CSV_PATH, 'w');
writeSync(fd, 'company_name,phone,state\n');

const PAGE = 1000;
let offset = 0, dumped = 0;
while (true) {
  const r = await fetch(`${URL}/rest/v1/contractors?select=company_name,phone,cities(state_code)&status=eq.active&deleted_at=is.null&order=company_name.asc&limit=${PAGE}&offset=${offset}`, { headers: H });
  if (!r.ok) { console.error(`page ${offset}: HTTP ${r.status}`); break; }
  const rows = await r.json();
  if (!rows.length) break;
  for (const row of rows) {
    const name = (row.company_name || '').replace(/"/g, '""');
    const phone = (row.phone || '').replace(/"/g, '""');
    const state = (row.cities?.state_code || '').replace(/"/g, '""');
    writeSync(fd, `"${name}","${phone}","${state}"\n`);
  }
  dumped += rows.length;
  if (rows.length < PAGE) break;
  offset += PAGE;
}
closeSync(fd);
console.log(`CSV written: ${CSV_PATH} (${dumped} rows)`);
console.log(`DONE.`);
