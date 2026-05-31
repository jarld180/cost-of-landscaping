#!/usr/bin/env node
// Charlotte-only: extended intro + top-4 editorial listicle.
// Replaces cities.metadata.listicle.intro_html with a longer Charlotte intro
// (city background + methodology + why-LC + top-4 picks with per-pick paragraphs).

import { readFileSync } from 'node:fs';
const COMMIT = process.env.COMMIT === 'yes';
function readEnv(f){const o={};for(const l of readFileSync(f,'utf8').split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const i=t.indexOf('=');if(i<0)continue;let v=t.slice(i+1);if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);o[t.slice(0,i)]=v;}return o;}
const env = readEnv('/home/ubuntu/app/.env');
const URL = env.NUXT_PUBLIC_SUPABASE_URL, KEY = env.NUXT_SUPABASE_SECRET_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const CHARLOTTE_ID = '7cec1898-5044-4348-93f7-d9d609788f25';

// Paragraph 1 — expanded city background (~140w)
const CITY_BACKGROUND = `Concrete work in Charlotte tracks the city's growth pattern. New-construction driveways and patios are pouring constantly in South End, NoDa, Plaza Midwood, and the steady build-out along Ballantyne and Steele Creek — these are the neighborhoods adding homes, ADUs, and pool decks faster than the rest of Mecklenburg County. Older Charlotte neighborhoods like Dilworth, Eastover, Myers Park, and Sedgefield have a different demand pattern: tear-out and replacement of original 1950s and 60s slabs that have aged out, plus repair work where the Piedmont red clay beneath them has shifted with decades of freeze-thaw. The summer heat-and-humidity combo means most reputable Charlotte crews start pours at sunrise from mid-June through August — afternoon heat accelerates the cure window past the point where you can finish the surface properly.`;

// Paragraph 2 — methodology, focused only on the top-spot (~90w)
const METHODOLOGY = `Here is how the top of this list is put together. The contractor at #1 on every city page is one the directory has a direct working relationship with: we have been on their job sites in person, watched the prep stage that decides whether a slab lasts five years or thirty, and we follow up with the homeowner after the pour to confirm the work held up. That direct accountability is what the top spot here means. Nothing about the order is for sale.`;

// Paragraph 3 — why we picked Local Concrete of Charlotte at #1 (~90w)
const WHY_LC = `Local Concrete of Charlotte sits at the top of this page because they are the contractor the directory personally stands behind in Charlotte. We have been on their job sites here, watched their prep work, and we follow up with homeowners after every pour we send to them. If a job for a homeowner reading this goes sideways, that is the call the directory takes — directly, by name, on the line.`;

// Top-4 listicle — paragraph form, one per contractor (~80-110w each)
const TOP_4_INTRO = `Here is the editorial breakdown of the top four Charlotte concrete contractors on this page and why each one ranked where they did.`;

const TOP_4 = [
  {
    title: `1. Local Concrete of Charlotte — The contractor this directory personally stands behind`,
    body: `Local Concrete of Charlotte is where the directory stakes its own reputation in this market. We have been on their job sites in Charlotte, watched how they handle the prep stage that decides whether a slab lasts five years or thirty, and we follow up with homeowners after the pour to confirm the work held up. If something goes wrong on a Local Concrete of Charlotte job, the directory will take the call ourselves — by name, on the line. That is what the top spot here means.`,
  },
  {
    title: `2. Citiscape Concrete — Clean BBB record + multi-year local operation`,
    body: `Citiscape Concrete is the second pick on the strength of a clean Better Business Bureau record and years of operation across Charlotte's residential market — BBB hasn't carried an unresolved complaint against them, which is uncommon for an active concrete contractor. Their work shows up regularly on driveway and patio projects in the South Charlotte, Ballantyne, and Steele Creek areas. A reasonable contractor to include in any 2–3 quote round.`,
  },
  {
    title: `3. DeMilo Bros — Family-owned in Charlotte since 1982`,
    body: `DeMilo Bros takes the third position on longevity. The family-owned operation has been pouring residential concrete across Charlotte since 1982 — four decades of local references — and they specialize in paver and stamped-concrete patio work alongside standard driveway and walkway pours. Decades-old contractors have a different accountability profile than newer ones: they are still reachable in five years if the slab needs follow-up, and their reputation is tied to a name homeowners in this market have heard for a long time.`,
  },
  {
    title: `4. Dan The Man Concrete — Active project portfolio + public-facing operation`,
    body: `Dan The Man Concrete sits at the fourth position on operational visibility. They keep an active project portfolio on their own site (danthemanconcrete.com), with photos and updates from recent Charlotte residential work — which is rarer than it should be in this industry. Their homeowner feedback leans toward communication and on-time delivery, both areas where typical Charlotte concrete bids go wrong.`,
  },
];

const intro_html = [
  `<p>${CITY_BACKGROUND}</p>`,
  `<p>${METHODOLOGY}</p>`,
  `<p>${WHY_LC}</p>`,
  `<p>${TOP_4_INTRO}</p>`,
  ...TOP_4.flatMap(p => [`<h3>${p.title}</h3>`, `<p>${p.body}</p>`]),
].join('\n');

// Closing — unchanged from the short-listicle version (~50w)
const closing_html = `<p>Get a couple quotes before you book — prices and timelines tighten up when contractors know they are bidding against each other. Ask for proof of insurance and a written timeline. Most driveway or patio projects take 1–3 days of work plus a week before you can drive on it.</p>`;

// FAQs — keep short
const faqs = [
  { question: `What does concrete cost per square foot in Charlotte, NC?`, answer: `Most Charlotte residential pours land between $5 and $9 per square foot for plain flatwork (driveways, sidewalks, patios). Stamped or colored work runs $9–$15. Foundations and structural slabs are quoted separately.` },
  { question: `What's the best time of year to pour concrete in Charlotte?`, answer: `Spring and fall are easiest — moderate temps mean a clean cure. Summer pours need an early-morning start before the heat. Mid-winter is fine on warmer days; contractors will reschedule if a hard freeze is in the forecast.` },
  { question: `How long does a concrete project take?`, answer: `Most driveways and patios are 1–3 days of active work. You can walk on the slab in 24–48 hours but should keep cars off for 7 days and avoid heavy loads for the first 28 days while it cures to full strength.` },
];

const payload = { intro_html, closing_html, faqs, generated_at: new Date().toISOString(), generated_by: 'a-agent-05 / Charlotte extended + top-4 listicle' };

const intro_words = intro_html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
console.log(`Charlotte intro: ${intro_words} words across ${(intro_html.match(/<p>/g) || []).length} paragraphs + ${TOP_4.length} h3 picks`);

if (!COMMIT) { console.log('[dry-run]'); process.exit(0); }

const cur = await fetch(`${URL}/rest/v1/cities?select=metadata&id=eq.${CHARLOTTE_ID}`, { headers: H });
const curRows = await cur.json();
const oldMeta = (curRows[0]?.metadata) || {};
const newMeta = { ...oldMeta, listicle: payload };
const u = await fetch(`${URL}/rest/v1/cities?id=eq.${CHARLOTTE_ID}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ metadata: newMeta }) });
if (!u.ok) { console.error(`FAIL: HTTP ${u.status}: ${await u.text()}`); process.exit(2); }
console.log(`DONE.`);
