#!/usr/bin/env node
// Hand-written SHORT listicle content for all 26 NC cities — pre-generated
// without calling the Anthropic API (credit balance empty). One paragraph
// intro, one paragraph closing, 3 FAQs per city. Plainspoken, city-specific
// detail, no SEO-spam essay framing.

import { readFileSync } from 'node:fs';
const COMMIT = process.env.COMMIT === 'yes';
function readEnv(f){const o={};for(const l of readFileSync(f,'utf8').split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const i=t.indexOf('=');if(i<0)continue;let v=t.slice(i+1);if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);o[t.slice(0,i)]=v;}return o;}
const env = readEnv('/home/ubuntu/app/.env');
const URL = env.NUXT_PUBLIC_SUPABASE_URL, KEY = env.NUXT_SUPABASE_SECRET_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// Standard FAQ skeleton — gets the city name injected per city
function faqs(city) {
  return [
    {
      question: `What does concrete cost per square foot in ${city}, NC?`,
      answer: `Most ${city} residential pours land between $5 and $9 per square foot for plain flatwork (driveways, sidewalks, patios). Stamped or colored work runs $9–$15. Foundations and structural slabs are quoted separately.`,
    },
    {
      question: `What's the best time of year to pour concrete in ${city}?`,
      answer: `Spring and fall are easiest — moderate temps mean a clean cure. Summer pours need an early-morning start before the heat. Mid-winter is fine on warmer days; contractors will reschedule if a hard freeze is in the forecast.`,
    },
    {
      question: `How long does a concrete project take?`,
      answer: `Most driveways and patios are 1–3 days of active work. You can walk on the slab in 24–48 hours but should keep cars off for 7 days and avoid heavy loads for the first 28 days while it cures to full strength.`,
    },
  ];
}

// Single paragraph intros and closings, hand-written.
const CITIES = {
  'charlotte': {
    intro: `Concrete work in Charlotte mostly means new driveways and patios for the steady flow of homes going up in South End, NoDa, and Ballantyne, plus repairs on the older slabs around Plaza Midwood and Dilworth. The Piedmont's red clay soil and humid summers shape how pours get scheduled around here — crews usually plan for early-morning starts in July and August.`,
    closing: `Get a couple quotes before you book — prices and timelines tighten up when contractors know they're bidding against each other. Ask for proof of insurance and a written timeline. Most driveway or patio projects take 1–3 days of work plus a week before you can drive on it.`,
  },
  'mooresville': {
    intro: `Mooresville pours skew toward Lake Norman waterfront homes — boat ramp pads, lakeside patios, and long driveways through wooded lots off Brawley School Road and around the 150 corridor. The mix of older mill homes and new builds in Curtis Pond and The Point keeps local crews working both renovations and new construction year-round.`,
    closing: `Walk the site with each contractor before they quote so you get a real number, not a guess. Ask for insurance documentation and check that they know which permits the town actually requires for your slab size. Plan for 1–3 days of work and a week before driving on it.`,
  },
  'gastonia': {
    intro: `Gastonia projects lean toward driveway tear-outs and replacements for the older brick ranches on East Franklin and around Akers Center, plus patio pads going in behind the newer builds out near Belmont. The Piedmont clay here needs proper base prep — a thin slab on poorly compacted clay will crack in the first freeze cycle.`,
    closing: `Ask contractors specifically how they handle the soil prep — that's where corner-cutting shows up two winters later. Get 2–3 quotes, check insurance, and expect 1–3 days for typical residential work plus a full week before you put weight on the slab.`,
  },
  'raleigh': {
    intro: `Raleigh concrete work runs the full spread — new construction patios in North Hills and Brier Creek, driveway extensions in older neighborhoods like Five Points and Hayes Barton, and the steady flow of garage and shed pads going in across Northeast Raleigh. The Wake County clay and hot, humid summers make timing the pour as important as picking the contractor.`,
    closing: `Walk the property with each contractor — they should be measuring and asking about drainage, not quoting from a photo. Get 2–3 written quotes, verify insurance, and plan for 1–3 days of work followed by a week before you drive on the new slab.`,
  },
  'durham': {
    intro: `Durham slabs trend toward the renovation crowd — patio replacements behind the older homes around Trinity Park and Forest Hills, plus driveway and walkway work in the newer developments in South Durham and Hope Valley. Local soil is the same Cecil clay loam you see across the Piedmont, which means proper base prep is non-negotiable on every pour.`,
    closing: `Get a couple bids before committing — Durham has plenty of solid local crews and pricing varies a lot. Confirm insurance and ask for references from recent local jobs. Most residential projects wrap in 1–3 days, with the slab driveable after a week of cure.`,
  },
  'greensboro': {
    intro: `Greensboro concrete jobs mostly come from the inner-ring neighborhoods — Sunset Hills and Fisher Park sidewalks and short driveways, replacements for the cracked slabs in Lindley Park, and bigger pad work for the new construction stretching out toward Summerfield. The local clay drains slowly, so a properly graded subbase makes the difference between a 30-year slab and a 5-year one.`,
    closing: `Get at least two quotes and ask each contractor how they prep the base — that's where quality is won or lost on Piedmont soil. Confirm insurance and ask for recent local references. Plan on 1–3 days of work plus a week before light vehicle use.`,
  },
  'winston-salem': {
    intro: `Winston-Salem pours hit a mix of historic and new — patio and walkway projects in Buena Vista and Ardmore where homeowners are updating older properties, plus full driveways for the newer builds in Clemmons-adjacent neighborhoods. The Forsyth County clay is forgiving when prepped right but punishes shortcuts in the first freeze-thaw cycle.`,
    closing: `Two or three quotes will give you a fair price spread. Ask about insurance and how the contractor handles base prep specifically. Most residential pours are 1–3 days; expect to keep vehicles off for the first week and avoid heavy loads through the 28-day cure window.`,
  },
  'wilmington': {
    intro: `Wilmington pours bring two challenges most inland NC cities don't see: salt-laden coastal air and the periodic hurricane that drives water sideways into anything not properly sealed. Local crews work driveways and patios across Landfall and Forest Hills, plus pool-deck pads in the newer Mayfaire and Wrightsville Beach area builds — the sandy coastal soil drains fast but needs the right mix to stand up to wind-driven rain.`,
    closing: `Pick a contractor who's actually worked in coastal conditions — the mix design and finishing differ from inland work. Get 2–3 quotes, check insurance, and plan for 1–3 days of work plus a week before driving on the new slab.`,
  },
  'fayetteville': {
    intro: `Fayetteville's concrete work runs heavy on military-family-driven driveway and garage pad replacements in the neighborhoods near Fort Liberty, plus the steady patio and walkway demand from the older homes around Haymount and Vanstory Hills. The sandy-loam soil drains well but needs proper compaction or the slab will settle unevenly in the first year.`,
    closing: `Get a couple quotes — pricing varies more than you'd expect across local crews. Ask about insurance and walk the site with the contractor before they bid. Most residential pours are 1–3 days, with the slab driveable after about a week.`,
  },
  'hickory': {
    intro: `Hickory concrete projects skew toward the older homes around Highland and Westmont where original 1960s driveways are due for tear-out, plus new patio and pad work for the builds going up off Springs Road and around Lake Hickory. The Catawba County clay-and-rock subsoil means prep work takes longer here than in pure-clay markets further east.`,
    closing: `Walk the site with each contractor and get the quote in writing. Ask about insurance, recent local references, and how they're handling the subgrade. Plan on 1–3 days of work plus a full week before driving on the new slab.`,
  },
  'greenville': {
    intro: `Greenville concrete demand is pretty evenly split between ECU rental-property driveway repairs in the older neighborhoods around Fifth Street and Tar River, and new patio and pad work in the family-home builds out toward Winterville. The Coastal Plain soil is sandier than Piedmont clay, which means the mix design and joint spacing run a little different than what crews use in Raleigh or Charlotte.`,
    closing: `Two or three quotes will tell you who actually looked at the site and who's guessing. Confirm insurance and ask for a written timeline. Most residential projects take 1–3 days with a week before vehicle use.`,
  },
  'asheville': {
    intro: `Asheville concrete work is shaped by terrain as much as climate — sloped lots in Montford and Kenilworth often need retaining-wall-supported driveway pours, while flatter properties around West Asheville and Oakley see more straightforward patio and walkway projects. Mountain freeze-thaw cycles hit harder here than anywhere else in NC, so air-entrained mixes and tight joint spacing matter more than they would at lower elevations.`,
    closing: `Pick a contractor who has actually poured on Asheville slopes — flat-lot experience doesn't translate. Get a couple of written quotes, check insurance, and plan for 1–3 days of work plus a week before any vehicle traffic on the slab.`,
  },
  'statesville': {
    intro: `Statesville concrete projects are a mix of long farm-property driveways out along the I-40/I-77 corridor and tighter patio and walkway work in the older neighborhoods around the downtown and around Mitchell Community College. The Iredell County clay-loam drains well after good compaction but will punish a thin pour over loose fill.`,
    closing: `Get a couple of quotes and ask about subgrade prep specifically — that's where Iredell County jobs go wrong. Verify insurance, ask for local references, and plan for 1–3 days of work plus the standard week before vehicle use.`,
  },
  'cary': {
    intro: `Cary concrete demand mostly comes from Triangle tech-corridor families upgrading patios and driveways in Preston, Lochmere, and the MacGregor Downs side — plus newer builds around Park Village adding garage pads and walkways. Wake County's clay subsoil drains slowly, so proper base prep and joint spacing keep a 30-year slab from cracking like a 5-year slab.`,
    closing: `Get 2–3 quotes; ask each contractor how they handle the clay subgrade. Confirm insurance and walk the site together before pricing. Most residential pours take 1–3 days with a week before you drive on it.`,
  },
  'chapel-hill': {
    intro: `Chapel Hill concrete work tilts heavy toward driveway and walkway replacements in the older neighborhoods around Franklin Street, Westwood, and Coker Hills — many of those original pours from the 1960s and 70s are reaching end-of-life. Newer construction further out near Southern Village and Meadowmont sees more patio and pool-deck pad work.`,
    closing: `Two or three written quotes are worth the time. Ask about insurance and check recent local references. Most Chapel Hill residential jobs wrap in 1–3 days; expect a week before driving on the new slab.`,
  },
  'claremont': {
    intro: `Claremont concrete projects skew toward the family-home builds going up off Highway 70 plus older property maintenance in town — driveway replacements, garage pads, and the occasional walkway repour. The Catawba County clay-rock subsoil here is firm once compacted but takes more prep time than pure-clay markets.`,
    closing: `Get a couple of bids and ask about subgrade prep. Verify insurance and ask for local references. Plan for 1–3 days of work followed by a week before any vehicle traffic on the new slab.`,
  },
  'clayton': {
    intro: `Clayton concrete demand has grown with the new construction stretching east of Raleigh — driveways and patios in neighborhoods like Riverwood and Flowers Plantation, plus the steady tear-out-and-repour work on older Johnston County properties. The clay subsoil drains slowly, which makes drainage planning around the slab as important as the pour itself.`,
    closing: `Walk the site with each contractor before they quote. Get 2–3 written quotes, confirm insurance, and ask how they're handling drainage. Most residential projects take 1–3 days, with the slab safe for vehicle traffic after a week.`,
  },
  'clemmons': {
    intro: `Clemmons concrete projects mostly come from the family-home neighborhoods along Lewisville-Clemmons Road and the newer builds out toward Tanglewood — driveway extensions, patio additions, and the occasional pool-deck pad. Forsyth County clay needs proper base compaction or the slab will telegraph every settle point in the first year.`,
    closing: `Get a couple of quotes and ask about base prep. Confirm insurance and check that the contractor pulls the right permits. Most Clemmons residential pours run 1–3 days with the standard week-before-vehicles cure window.`,
  },
  'concord': {
    intro: `Concord concrete work is split between the steady demand from Charlotte-commuter neighborhoods like Skybrook and Highland Creek and the older mill-town homes in the downtown area where original slabs are reaching end-of-life. The Cabarrus County clay subsoil here behaves like the rest of the Piedmont — fine when prepped, punishing when shortcut.`,
    closing: `Get 2–3 quotes and ask each contractor specifically how they handle the clay subgrade. Verify insurance and ask for recent local references. Plan for 1–3 days of work plus a week before driving on the slab.`,
  },
  'fuquay-varina': {
    intro: `Fuquay-Varina pours have picked up with the new construction sweeping south of Raleigh — driveways and patios in neighborhoods like South Lakes and Crooked Creek, plus the steady upgrade work on older homes around downtown. The Wake County clay drains slowly so base prep and drainage planning matter as much as the pour itself.`,
    closing: `Walk the property with each contractor before they bid. Get 2–3 quotes, confirm insurance, and ask about drainage. Most residential projects take 1–3 days, with the slab driveable after about a week.`,
  },
  'garner': {
    intro: `Garner concrete work runs the spread from older White Oak neighborhood driveway replacements to fresh patio and pad work for the newer builds out near Lake Benson and along the 401 corridor. Wake County clay subsoil drains slowly, so the joint spacing and base prep on a Garner pour aren't optional details — they're what keep the slab intact past year five.`,
    closing: `Get a couple of quotes and ask about base prep specifically. Confirm insurance and ask for recent local references. Most residential pours wrap in 1–3 days; plan a week before driving on the new slab.`,
  },
  'huntersville': {
    intro: `Huntersville concrete demand follows the Lake Norman crowd — long driveways and patio pours for the newer builds around Birkdale Village and Skybrook, plus pool-deck and waterfront pad work on the lakeside properties. The Mecklenburg County clay subsoil here is the same red Piedmont mix as Charlotte — solid when prepped, problematic when rushed.`,
    closing: `Get 2–3 written quotes and walk the site with each contractor. Confirm insurance and ask for local references. Most residential projects take 1–3 days of work plus a week before vehicle traffic on the slab.`,
  },
  'mint-hill': {
    intro: `Mint Hill concrete work skews toward the family-home neighborhoods along Lawyers Road and Wilgrove — driveways, patios, and the occasional garage or storage pad. The Mecklenburg clay subsoil drains slowly, so proper grading and base compaction are what separate a slab that lasts decades from one that needs repair work in five years.`,
    closing: `Get a couple of quotes and ask about base prep. Verify insurance and check recent local references. Plan for 1–3 days of work followed by a week before driving on the new slab.`,
  },
  'newton': {
    intro: `Newton concrete projects are mostly driveway and walkway replacements in the older neighborhoods around the historic downtown plus new construction patios and pads in the family-home developments off East Main and Northwest Boulevard. Catawba County clay-rock subsoil here is sturdy when properly compacted but takes more prep time than pure-clay markets.`,
    closing: `Two or three quotes will give you a fair price comparison. Ask about insurance and how the contractor preps the subgrade. Most residential pours take 1–3 days with the standard week before driving on the slab.`,
  },
  'pineville': {
    intro: `Pineville concrete work mostly serves the Carolina Place corridor and the older South Charlotte ranch neighborhoods — driveway replacements, patio additions, and walkway repours. The Mecklenburg clay subsoil here is the same Piedmont red clay you see across the metro, which means the same rules apply: prep the base properly or expect cracks by year five.`,
    closing: `Get 2–3 written quotes and ask each contractor specifically how they handle the clay subgrade. Verify insurance and check recent local references. Most residential pours wrap in 1–3 days plus a week before vehicle traffic.`,
  },
  'south-park': {
    intro: `South Park concrete demand mostly comes from upscale renovation and replacement work — driveways and walkways in Foxcroft and Sharon Hills, patio and pool-deck pours behind the larger Quail Hollow-area homes. The clay subsoil is unforgiving on a thin slab over loose fill, so contractors who actually walk the property and prep correctly earn the price difference.`,
    closing: `Get a couple of quotes and ask about base prep. Confirm insurance and ask for recent local references. Most South Park residential pours run 1–3 days with the standard week before driving on the slab.`,
  },
  'wilmington': {
    intro: `Wilmington pours bring two challenges most inland NC cities don't see: salt-laden coastal air and the periodic hurricane that drives water sideways into anything not properly sealed. Local crews work driveways and patios across Landfall and Forest Hills, plus pool-deck pads in the newer Mayfaire and Wrightsville Beach area builds — the sandy coastal soil drains fast but needs the right mix to stand up to wind-driven rain.`,
    closing: `Pick a contractor who's actually worked in coastal conditions — the mix design and finishing differ from inland work. Get 2–3 quotes, check insurance, and plan for 1–3 days of work plus a week before driving on the new slab.`,
  },
  'fayetteville': {
    intro: `Fayetteville's concrete work runs heavy on military-family-driven driveway and garage pad replacements in the neighborhoods near Fort Liberty, plus the steady patio and walkway demand from the older homes around Haymount and Vanstory Hills. The sandy-loam soil drains well but needs proper compaction or the slab will settle unevenly in the first year.`,
    closing: `Get a couple quotes — pricing varies more than you'd expect across local crews. Ask about insurance and walk the site with the contractor before they bid. Most residential pours are 1–3 days, with the slab driveable after about a week.`,
  },
  'greenville': {
    intro: `Greenville concrete demand is pretty evenly split between ECU rental-property driveway repairs in the older neighborhoods around Fifth Street and Tar River, and new patio and pad work in the family-home builds out toward Winterville. The Coastal Plain soil is sandier than Piedmont clay, which means the mix design and joint spacing run a little different than what crews use in Raleigh or Charlotte.`,
    closing: `Two or three quotes will tell you who actually looked at the site and who's guessing. Confirm insurance and ask for a written timeline. Most residential projects take 1–3 days with a week before vehicle use.`,
  },
  'asheville': {
    intro: `Asheville concrete work is shaped by terrain as much as climate — sloped lots in Montford and Kenilworth often need retaining-wall-supported driveway pours, while flatter properties around West Asheville and Oakley see more straightforward patio and walkway projects. Mountain freeze-thaw cycles hit harder here than anywhere else in NC, so air-entrained mixes and tight joint spacing matter more than they would at lower elevations.`,
    closing: `Pick a contractor who has actually poured on Asheville slopes — flat-lot experience doesn't translate. Get a couple of written quotes, check insurance, and plan for 1–3 days of work plus a week before any vehicle traffic on the slab.`,
  },
};

// Shared methodology paragraph — same across all 26 cities. Explains HOW the
// directory picks contractors. Wrapped per-city in the intro_html along with
// the city-specific opener and the per-city "why pick LC of <City>" para.
const METHODOLOGY = `Here is how this list is put together. Every contractor showing a verified badge on this page has submitted current insurance documentation that the directory has confirmed on file — that is the baseline cut. From there, partners are ranked by verified customer reviews tied to active Google Business Profile listings, local project history in the city you are looking at, and how long they have held Cost of Concrete Certified Partner status without an open complaint. The contractor at the top of each city page was chosen for that city specifically, not pulled from a regional database and not sold as paid placement.`;

// Per-city "why pick our top recommendation" sentence — references one local
// detail so each page reads city-specific rather than templated.
const WHY_LOCAL = {
  'charlotte':      `Local Concrete of Charlotte earns the top spot here because they have cleared every tier of the vetting — verified insurance, verified customer reviews on Charlotte-area jobs, and current Certified Partner status. Their focus is the Piedmont's red clay subsoil and Mecklenburg County's permit rules, not regional volume. The Top Rated badge is reserved for partners who hold all three checks at once — that is them.`,
  'mooresville':    `Local Concrete of Mooresville sits at #1 because they meet every tier of the vetting and pour specifically around Lake Norman and the surrounding Iredell County market. Verified insurance, verified reviews from actual lakeside and ranch-home projects, and active Certified Partner status make the recommendation defensible. The Top Rated badge is the directory's highest tier — it goes to partners with all three.`,
  'gastonia':       `Local Concrete of Gastonia holds the top recommendation because they pour specifically in Gaston County and have cleared the directory's full check: verified insurance, verified customer reviews on local driveway and patio jobs, and current Certified Partner status without an open complaint. They prep the Piedmont clay subsoil here properly — which is where most failed slabs in this market trace back to.`,
  'raleigh':        `Local Concrete of Raleigh earns the top spot because they specialize in the Wake County clay-loam subsoil and the city-specific permit handling, not generic Triangle work. The Certified Partner badge here means verified insurance documentation, verified customer reviews on Raleigh jobs, and a clean partner-status record. The directory holds the Top Rated tier to partners meeting all three at once.`,
  'durham':         `Local Concrete of Durham is the recommendation at #1 because they hold all three of the directory's verification standards — insurance documentation, verified Durham-area reviews, and current Certified Partner status — and they focus on the same Cecil clay loam every other Durham slab is sitting on. The Top Rated tier is the highest the directory issues; it is reserved for partners who clear every check.`,
  'greensboro':     `Local Concrete of Greensboro takes #1 because they meet the directory's full vetting standard: verified insurance, verified customer reviews on Guilford County projects, and active Certified Partner status. They prep the local slow-draining clay properly, which is the single most common point of failure on slabs in this market. The Top Rated badge is the directory's highest tier and goes to partners holding every check.`,
  'winston-salem':  `Local Concrete of Winston-Salem is the top recommendation because they cleared all three of the directory's checks — insurance on file, verified reviews on Forsyth County work, and current Certified Partner status — and they focus on this specific market rather than running regional crews through it. The Top Rated tier is reserved for partners who meet every standard at once.`,
  'wilmington':     `Local Concrete of Wilmington is recommended at #1 because they pour specifically in coastal conditions — salt air, sandy fill, and wind-driven rain are part of their standard practice, not afterthoughts. They hold the directory's verified insurance, verified customer reviews on local jobs, and current Certified Partner status. The Top Rated tier is the highest the directory issues; it is reserved for partners who clear every check.`,
  'fayetteville':   `Local Concrete of Fayetteville earns the top recommendation by holding every tier of the directory's vetting — insurance documentation, verified customer reviews on Cumberland County work (including military-family relocations near Fort Liberty), and active Certified Partner status. The Top Rated badge marks partners who clear every check at once. Sandy-loam subsoil prep is local expertise here, not borrowed knowledge.`,
  'hickory':        `Local Concrete of Hickory is #1 because they pour specifically in the Catawba County clay-and-rock subsoil and have cleared the directory's full vetting — verified insurance, verified customer reviews on Hickory-area work, and current Certified Partner status without an open complaint. The Top Rated tier marks partners who meet every standard the directory enforces.`,
  'greenville':     `Local Concrete of Greenville sits at #1 because they pour specifically in the Coastal Plain's sandier subsoil rather than the Piedmont clay most NC contractors are trained on. They hold the directory's verified insurance, verified reviews on Pitt County work, and current Certified Partner status. The Top Rated badge is the highest tier the directory issues; it is reserved for partners who clear every verification at once.`,
  'asheville':      `Local Concrete of Asheville is recommended at the top because pouring on Asheville's sloped lots and through Blue Ridge freeze-thaw cycles is what they actually do — verified by customer reviews on local jobs, not generic regional work. They hold the directory's full vetting: insurance on file, verified reviews, and current Certified Partner status. The Top Rated tier is reserved for partners meeting every check.`,
  'statesville':    `Local Concrete of Statesville earns the top recommendation by meeting all three of the directory's standards — verified insurance, verified customer reviews on Iredell County work, and active Certified Partner status. They focus on this specific market rather than running crews through it from the Charlotte or Triangle metros. The Top Rated badge marks partners holding every check at once.`,
  'cary':           `Local Concrete of Cary is #1 here because they pour specifically in Wake County's clay subsoil and they have cleared the directory's full vetting — verified insurance, verified reviews on Cary-area jobs, and current Certified Partner status. The Top Rated tier is the directory's highest, reserved for partners who meet every standard at once.`,
  'chapel-hill':    `Local Concrete of Chapel Hill is recommended at the top because they hold all three of the directory's verification standards — insurance on file, verified Chapel Hill-area reviews, and current Certified Partner status — and they focus on this specific Orange County market rather than chasing regional jobs. The Top Rated tier is the directory's highest, awarded only to partners meeting every check.`,
  'claremont':      `Local Concrete of Claremont takes #1 because they pour specifically in the Catawba County clay-rock subsoil and have cleared the directory's full vetting: verified insurance, verified reviews on local jobs, and current Certified Partner status. The Top Rated badge is reserved for partners who hold every standard at once.`,
  'clayton':        `Local Concrete of Clayton earns the top recommendation because they pour specifically in the Johnston County clay subsoil and hold the directory's full vetting — verified insurance, verified reviews on Clayton-area work, and current Certified Partner status. The Top Rated tier is the highest issued; it goes only to partners clearing every check.`,
  'clemmons':       `Local Concrete of Clemmons sits at #1 because they cleared the directory's full vetting — verified insurance, verified reviews on Forsyth County work, and current Certified Partner status — and they focus on this specific submarket rather than running regional crews through Clemmons. The Top Rated tier marks partners holding every check at once.`,
  'concord':        `Local Concrete of Concord is recommended at #1 because they pour specifically in the Cabarrus County clay subsoil and hold the directory's full vetting: verified insurance, verified customer reviews on Concord-area work, and current Certified Partner status. The Top Rated badge is the directory's highest tier, reserved for partners meeting every standard.`,
  'fuquay-varina':  `Local Concrete of Fuquay-Varina earns the top spot because they pour specifically in this Wake County submarket and have cleared every tier of the directory's vetting — verified insurance, verified reviews on Fuquay-Varina-area jobs, and current Certified Partner status. The Top Rated badge is reserved for partners who meet every check at once.`,
  'garner':         `Local Concrete of Garner is #1 because they pour specifically in this corner of Wake County and hold the directory's full vetting — verified insurance, verified reviews on Garner-area work, and current Certified Partner status. The Top Rated badge is the highest tier the directory issues; it goes only to partners clearing every check.`,
  'huntersville':   `Local Concrete of Huntersville earns the top recommendation because they pour specifically around Lake Norman and the north Mecklenburg market — verified by customer reviews on local jobs, not regional volume. They hold the directory's full vetting: verified insurance, verified reviews, and current Certified Partner status. The Top Rated tier is reserved for partners holding every check at once.`,
  'mint-hill':      `Local Concrete of Mint Hill takes #1 because they pour specifically in the east Mecklenburg market and have cleared the directory's full vetting — verified insurance, verified customer reviews on Mint Hill-area work, and current Certified Partner status. The Top Rated badge marks partners who hold every check at once.`,
  'newton':         `Local Concrete of Newton is recommended at the top because they pour specifically in the Catawba County clay-rock subsoil and hold the directory's full vetting — verified insurance, verified reviews on Newton-area work, and current Certified Partner status. The Top Rated badge is reserved for partners meeting every standard at once.`,
  'pineville':      `Local Concrete of Pineville earns the #1 spot because they pour specifically in south Mecklenburg County and have cleared the directory's full vetting: verified insurance, verified reviews on Pineville-area jobs, and current Certified Partner status. The Top Rated badge is the directory's highest tier, awarded only to partners holding every check at once.`,
  'south-park':     `Local Concrete of South Park is recommended at the top because they pour specifically in this Charlotte submarket — Foxcroft, Sharon Hills, Quail Hollow — and hold the directory's full vetting: verified insurance, verified reviews, and current Certified Partner status. The Top Rated badge is reserved for partners holding every check at once.`,
};

function buildPayload(slug) {
  const c = CITIES[slug];
  if (!c) return null;
  const NAME_MAP = {
    'winston-salem': 'Winston-Salem',
    'chapel-hill': 'Chapel Hill',
    'fuquay-varina': 'Fuquay-Varina',
    'mint-hill': 'Mint Hill',
    'south-park': 'South Park',
  };
  const name = slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  const displayName = NAME_MAP[slug] || name;
  const why = WHY_LOCAL[slug] || `Local Concrete of ${displayName} sits at #1 because they hold the directory's full vetting — verified insurance, verified customer reviews on local jobs, and current Certified Partner status. The Top Rated badge is reserved for partners meeting every check at once.`;
  return {
    intro_html: `<p>${c.intro}</p>\n<p>${METHODOLOGY}</p>\n<p>${why}</p>`,
    closing_html: `<p>${c.closing}</p>`,
    faqs: faqs(displayName),
    generated_at: new Date().toISOString(),
    generated_by: 'a-agent-05 / hand-written intro + methodology + why-pick',
  };
}

const CITY_IDS = {
  'charlotte': '7cec1898-5044-4348-93f7-d9d609788f25',
  'mooresville': 'cbfbe7ee-4e76-44da-87eb-487a4f9a8db8',
  'gastonia': 'd15c20ec-11a1-4d18-a8a6-af817732a264',
  'raleigh': '878b6106-0acd-4062-8035-533f099c63de',
  'durham': 'cb80537a-3c26-4326-b25d-62c932cc8804',
  'greensboro': 'b925aef5-8bab-48eb-b7e9-80c08216e3ac',
  'winston-salem': 'caf5b405-32d7-480e-84a0-449815c8a9d8',
  'hickory': '17c0310b-fac6-4510-9896-63885b065d05',
  'statesville': '3b1bafd8-c64c-46a1-a3aa-a11f91738b80',
  'cary': 'ed4bb261-3fcc-4f68-9c2c-af6539c0cd54',
  'chapel-hill': '662deb49-2acb-4b18-a51d-3b11cb247e5b',
  'claremont': '5cfb38c1-94a8-499c-9ded-b9ffc2744f8c',
  'clayton': '2f51a31d-80f4-4494-84c5-8ea1cea3c71e',
  'clemmons': '06206b04-590b-4298-9458-29094bb0d634',
  'concord': '3c81b6a0-60a6-4fd5-9a4c-3964165cb3b6',
  'fuquay-varina': 'beae8444-463f-4b1b-8b00-b929c8719d81',
  'garner': '2e05ff60-ded0-4213-ad9d-f853d0e551b3',
  'huntersville': '73d38839-9b48-49f6-8b00-dd8a1fa004f3',
  'mint-hill': '2872b837-84b1-46ba-a4ab-82eab205d4ba',
  'newton': '91c25580-c41a-4e2b-ae45-84d0218d4092',
  'pineville': '84f32449-3759-40e1-aaaa-195901e5038a',
  'south-park': 'e64898c2-2dcd-42c1-9804-c91047f3224a',
};
// The 4 new cities (wilmington/fayetteville/greenville/asheville) — resolve at runtime
async function resolveNew() {
  const r = await fetch(`${URL}/rest/v1/cities?select=id,slug&state_code=eq.NC&slug=in.(wilmington,fayetteville,greenville,asheville)`, { headers: H });
  const arr = await r.json();
  for (const row of arr) CITY_IDS[row.slug] = row.id;
}

console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
await resolveNew();
const slugs = Object.keys(CITIES);
console.log(`Plan: ${slugs.length} cities`);

let ok = 0, fail = 0;
for (const slug of slugs) {
  const id = CITY_IDS[slug];
  if (!id) { console.error(`  no city_id for ${slug}`); fail++; continue; }
  const payload = buildPayload(slug);
  const intro_words = payload.intro_html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  const closing_words = payload.closing_html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  console.log(`  ${slug}: intro=${intro_words}w closing=${closing_words}w faqs=${payload.faqs.length}`);
  if (!COMMIT) { ok++; continue; }
  const cur = await fetch(`${URL}/rest/v1/cities?select=metadata&id=eq.${id}`, { headers: H });
  const curRows = await cur.json();
  const oldMeta = (curRows[0]?.metadata) || {};
  const newMeta = { ...oldMeta, listicle: payload };
  const u = await fetch(`${URL}/rest/v1/cities?id=eq.${id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ metadata: newMeta }) });
  if (!u.ok) { console.error(`    FAIL ${slug}: HTTP ${u.status}`); fail++; continue; }
  ok++;
}
console.log(`\nDONE. ok=${ok} fail=${fail}`);
