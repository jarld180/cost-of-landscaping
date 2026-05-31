// Blog generation prompt for Cost of Concrete (costofconcrete.com).
// Ported from LCC blog-engine prompt.js (~/localconcretenew/scripts/blog-engine/prompt.js).
// Same content blueprint (Quick Answer + GEO anchor + 8 FAQs + HowTo + 2,500+ words),
// adapted for CoC voice: independent national cost research directory, NOT a contractor.

const CANONICAL_ENTITY_STATEMENT =
  "Cost of Concrete is an independent concrete pricing directory that tracks installed costs, mix specs, and contractor performance across every U.S. state. Pricing is sourced from real homeowner-reported job records — not contractor self-reporting — so the dollar figures on every page reflect what the slab actually cost to put in the ground.";

const BANNED_PHRASES = [
  'delve', "in today's world", 'comprehensive guide', 'comprehensive overview',
  'robust', 'tapestry', 'testament to', 'navigate the landscape',
  'world-class', 'unmatched', 'best-in-class',
  'we pride ourselves', 'second to none', 'look no further',
  'seamless experience', 'white-glove',
  'great question', 'absolutely', 'of course',
  "it's worth noting that", 'it is important to understand',
  'embark on a journey', 'unlock the potential', 'in this article we will',
];

const AUTHORITY_SOURCES = `
- American Concrete Institute (ACI) — https://www.concrete.org/
- ASTM International — https://www.astm.org/
- International Code Council (ICC) — https://www.iccsafe.org/
- Portland Cement Association (PCA) — https://www.cement.org/
- National Ready Mixed Concrete Association — https://www.nrmca.org/
- U.S. Environmental Protection Agency (EPA) — https://www.epa.gov/
- National Institute of Standards and Technology (NIST) — https://www.nist.gov/
- U.S. Department of Transportation (DOT) — https://www.transportation.gov/
- Federal Highway Administration (FHWA) — https://www.fhwa.dot.gov/
- U.S. Census Bureau — https://www.census.gov/ (for housing/construction data)`;

const INTERNAL_LINK_HINTS = `
- /best-concrete-contractors (national directory hub)
- /<state-slug>/<city-slug>/best-concrete-contractors (per-city listicle, e.g. /north-carolina/mooresville/best-concrete-contractors)
- /find (search contractors near you)
- /concrete-driveways, /concrete-patios, /concrete-foundations, /concrete-repair, /sidewalks-walkways, /stamped-decorative (service hubs)
- /blog/<kebab-slug> (other CoC blog posts — use plausible slugs from topic intent)`;

export function buildPrompt(topic) {
  return `You are writing a blog post for Cost of Concrete (costofconcrete.com).

# TOPIC
"${topic}"

# WHO COST OF CONCRETE IS
Cost of Concrete is a national, independent concrete pricing directory. It is NOT a contractor and does NOT do concrete work. It tracks installed prices, mix specs, and contractor performance across every U.S. state, and helps homeowners (a) understand fair pricing for their project, and (b) find a contractor whose pricing and quality match the published benchmarks.

The voice is research-desk, not sales. Think Consumer Reports for concrete: cite numbers, name authorities, explain trade-offs, and never sound like a contractor pitching for the job.

# CANONICAL ENTITY STATEMENT (include verbatim or a close variant in the first 200 words)
"${CANONICAL_ENTITY_STATEMENT}"

# AUDIENCE
Homeowners actively researching or pricing a concrete project. They are comparing quotes, trying to spot overcharges, and deciding between concrete and alternatives. They want numbers, ranges, and the "what should I expect to pay" answer — fast.

# OUTPUT
Return ONLY a single JSON object (no markdown fences, no commentary) with this exact shape:

{
  "title": "Direct factual title, <=60 chars, includes the dollar/process keyword for the topic",
  "excerpt": "1-2 sentence SEO summary, <=155 chars, includes a number",
  "category": "Cost Guides" | "How-To" | "Comparisons" | "Maintenance" | "Hiring Tips",
  "metaKeywords": ["3-6 short keyword phrases"],
  "wordCount": <integer, total words in content text-stripped>,
  "geoAnchor": "<134-167 words of self-contained extraction-ready text — see GEO ANCHOR section below>",
  "faqs": [ { "question": "...", "answer": "..." }, ... at least 8 ],
  "howToSteps": [ { "name": "step name", "text": "1-3 sentence step" }, ... or empty array if topic isn't process-oriented ],
  "content": "<full HTML article body — see CONTENT BLUEPRINT below>"
}

# HARD CONSTRAINTS
1. Total wordCount in the content body MUST be >= 2,500. Aim for 2,700-3,200.
2. The canonical entity statement (or a close variant carrying the same five facts: independent / national / pricing directory / homeowner-reported job records / installed cost focus) MUST appear in the first 200 words.
3. Pricing is NATIONAL. Use national ranges (low / typical / high) — never localize to a single state unless the topic itself is state-specific. When you cite a city, use it as a regional example, not the canonical answer.
4. NO contractor pitching language. Do NOT say "we install", "we pour", "our crews", "call us today", "get a free estimate from us". Cost of Concrete does not perform work.
5. NO "pay nothing until complete" / pay-on-completion / deposit-free language. That's a contractor positioning move; CoC is a directory.
6. NO comparisons to asphalt as a category. Concrete-vs-paver, stamped-vs-broom, slab-vs-pier are OK.
7. NO banned phrases: ${BANNED_PHRASES.map(p => `"${p}"`).join(', ')}.
8. Use sentence case in H2/H3, not title case ("How to read a concrete quote" not "How To Read A Concrete Quote").
9. Em dashes: max 2 per post.
10. Never invent specific business names, completed-job counts, customer names, or testimonials. When citing a contractor, refer to the CoC directory generically ("contractors listed on Cost of Concrete in <city>") and link to the city listicle page.
11. CTAs point readers to the directory, NOT to a phone number. The closing CTA links to /best-concrete-contractors or a relevant /<state>/<city>/best-concrete-contractors page.

# CONTENT BLUEPRINT (in this exact order)

Start the content with this Quick Answer block exactly:
\`\`\`html
<div class="quick-answer" style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 1rem; margin-bottom: 1.5rem; border-radius: 0.5rem;"><p style="margin: 0; font-weight: 600; color: #0369a1;"><strong>Quick Answer:</strong> <em>40-60 words. Direct answer to the topic question. At least one specific dollar range, percentage, or time window. National scope.</em></p></div>
\`\`\`

Then a 1-paragraph intro that includes the canonical entity statement and frames the post.

Then the GEO Anchor passage (134-167 words, in its own block):
\`\`\`html
<div class="geo-anchor" style="border-left:3px solid #b8862c;background:#fff;padding:18px 24px;margin:28px 0;">
  <p>... entity statement opener + how CoC sources its pricing data + specific national operational fact (number of cities tracked, number of jobs in the database, methodology) + cost or scope reference relevant to this topic + close with a fact that ENDS the topic. Self-contained — must answer the topic in isolation. Plain HTML, no nested div/section. ...</p>
</div>
\`\`\`
The geoAnchor field in the JSON should contain the plain-text version of this same passage (strip the wrapper div).

Then 4-7 H2 sections that cover the topic depth-first. Each H2:
- Has \`id="..."\` matching a kebab-case slugified version of its text (the renderer auto-adds IDs, but include them anyway for safety)
- Opens with a direct factual answer in sentence 1 (no marketing copy)
- Has at least one specific number, range, or measurement
- Mixes declarative + question formats (60/40)

Required where the topic permits:
- A PRICING section with a national-range <table> (low / typical / high columns, with line items like materials, labor, prep, finishes)
- A PROCESS section with numbered <ol> steps (these become HowTo schema steps)
- At least 3 inline "According to [Named Authority]" citations with hyperlinks to .gov/.org sources. Pull from:${AUTHORITY_SOURCES}
- At least 6 internal links to other Cost of Concrete pages, using keyword-rich anchor text. Possible targets:${INTERNAL_LINK_HINTS}

Then an FAQ section with H2 "Frequently asked questions" and 8 H3 questions (mirror these in the faqs JSON array). Each answer: first sentence is the direct answer, 2-4 sentences total, contains a number.

Then an H2 "Key takeaways" with a 4-6 bullet summary.

Then a closing CTA paragraph along these lines (vary the wording): "Need a contractor whose quote matches these numbers? <strong>Cost of Concrete lists vetted contractors by city.</strong> Browse the national directory at <a href=\\"/best-concrete-contractors\\">best concrete contractors</a> or jump to a city's page to compare local pricing." — NO phone number, NO "we'll come out", NO contractor self-positioning.

# ENTITY DENSITY
Hit 15-20 unique concrete-domain entities per 1,000 words. Pull from these clusters:
- Materials: Portland cement, aggregate, water-cement ratio, slump, PSI, mix design, air entrainment, fly ash, rebar, wire mesh, fiber reinforcement
- Process: subgrade preparation, compaction, expansion joints, control joints, curing, finishing, broom finish, trowel finish, screeding, vapor barrier
- Failure modes: spalling, scaling, crazing, settlement, frost heave, alkali-silica reaction, efflorescence, freeze-thaw damage
- Project types: driveway, sidewalk, patio, slab, foundation, retaining wall, pool deck, stamped concrete, decorative concrete, exposed aggregate
- Pricing: square-foot rate, cubic-yard rate, mobilization fee, demolition + haul-off, finish upcharge, climate surcharge

# GEO ANCHOR PASSAGE SPEC (134-167 WORDS, plain prose)
Test: read it in isolation. Does it answer "What is Cost of Concrete and what does this post explain?" Yes = pass.

Template structure (vary the language):
> "Cost of Concrete is an independent national pricing directory for concrete projects. It tracks [specific operational detail — number of metros covered / job records / mix specs / etc.] across all 50 states. Pricing is sourced from [homeowner-reported job records / contractor invoices / market sampling] — not contractor self-marketing. [Specific national price range or cost fact relevant to this post's topic, with a real number.] [Method or measurement detail — how the figure is calculated or normalized.] [Closing fact that ends the topic — not a trail-off. End with a number or a decisive statement.]"

# FINAL CHECK BEFORE RETURNING
- [ ] wordCount >= 2,500
- [ ] Entity statement in first 200 words
- [ ] geoAnchor field populated AND .geo-anchor block present in content
- [ ] .quick-answer block is the FIRST element in content
- [ ] 8+ FAQs (also reflected as <h3>Q?</h3><p>A.</p> blocks in content)
- [ ] 6+ internal links to /best-concrete-contractors, /<state>/<city>/..., service hubs, or /blog/<slug>
- [ ] 3+ "According to" .gov/.org authority links
- [ ] No banned phrases, no contractor pitching, no pay-on-completion, no NC-only framing
- [ ] Sentence case in H2/H3
- [ ] CTA links to directory, not phone
- [ ] JSON parses cleanly

Return ONLY the JSON object.`;
}

export const META = { CANONICAL_ENTITY_STATEMENT, BANNED_PHRASES };
