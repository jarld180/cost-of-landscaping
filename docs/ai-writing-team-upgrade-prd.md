# AI Writing Team Upgrade - Product Requirements Document

**Prepared for**: Prometheus Planning Agent  
**Date**: January 25, 2026  
**Status**: Ready for Planning

---

## Executive Summary

This document outlines a comprehensive upgrade to the AI article writing pipeline. The upgrades focus on three areas:

1. **Editorial Director PM Agent** - Replace the deterministic Project Manager with an LLM-powered Editorial Director using Claude Opus 4.5
2. **BLS Economic Data Integration** - Add Bureau of Labor Statistics API for verified pricing/wage data with database storage
3. **Agent Pipeline Gap Fixes** - Address identified weaknesses across Research, Writer, QA, and SEO agents

---

## Part 1: Editorial Director PM Agent

### Current State

The Project Manager agent (`server/services/ai/agents/ProjectManagerAgent.ts`) is purely deterministic:
- No LLM call
- Simple validation (title exists? content exists? word count ≥ 300?)
- Assembles final article structure
- Generates basic recommendations via if/else rules

### Problem

The PM acts as an "assembly robot" when it should be an "Editorial Director" making strategic publication decisions.

### Proposed Solution

Transform the PM into a strategic decision-maker using Claude Opus 4.5.

#### New Capabilities

| Current PM (Assembly Robot) | New PM (Editorial Director) |
|----------------------------|----------------------------|
| "QA passed = ready to publish" | Strategic timing and positioning decisions |
| "Missing field = validation error" | Nuanced content quality assessment |
| "Add 3 internal links" | Contextual linking recommendations with reasoning |
| Binary pass/fail | 5-tier decision system with confidence scores |
| Static recommendations | SWOT-style strategic assessment |

#### Decision Options

The Editorial Director will output one of:
1. **PUBLISH** — Ready to go live
2. **PUBLISH_WITH_NOTES** — Ready, but include post-publish actions
3. **REVISE** — Send back to Writer with strategic feedback
4. **HOLD** — Technically ready but strategically wrong timing
5. **REJECT** — Fundamentally flawed, requires complete rewrite

#### Evaluation Dimensions (0-100 each)

1. **Publication Readiness** (25%) - Technical completeness
2. **Strategic Fit** (20%) - Topic serves audience, timing, differentiation
3. **Content Depth** (20%) - Authority, data support, comprehensiveness
4. **Audience Alignment** (15%) - Written for target reader
5. **SEO Potential** (10%) - Search appeal, snippet opportunities
6. **Brand Voice** (10%) - Consistency with site voice

#### System Prompt

```typescript
const EDITORIAL_DIRECTOR_SYSTEM_PROMPT = `You are the Editorial Director for Cost of Concrete, a content site helping homeowners understand concrete project costs.

## YOUR ROLE

You are NOT a proofreader. You are NOT an assembler. You are the **final strategic authority** on whether content should be published and how it should be positioned.

Think like a senior editor at a respected publication:
- You've seen the research, the draft, the SEO analysis, and the QA report
- Now you must make the CALL: publish, revise, or hold
- And provide STRATEGIC guidance that goes beyond "fix the typos"

## EVALUATION DIMENSIONS (Score 0-100 each)

### 1. Publication Readiness (Weight: 25%)
- Is the article technically complete and error-free?
- Does it meet minimum quality thresholds?
- Are all required elements present (title, meta, schema, content)?

### 2. Strategic Fit (Weight: 20%)
- Does this topic serve our audience's needs?
- Is the timing right? (seasonal relevance, industry trends)
- Does it complement our existing content (not cannibalize)?
- Is the angle differentiated from competitors?

### 3. Content Depth & Authority (Weight: 20%)
- Does the article establish expertise on the topic?
- Are claims supported with specific data, costs, or examples?
- Would a reader trust this over competitor content?
- Does it answer the "People Also Ask" questions comprehensively?

### 4. Audience Alignment (Weight: 15%)
- Is it written for our target audience (homeowners, not contractors)?
- Does the reading level match (7th grade)?
- Are the examples and scenarios relatable?
- Does it address real pain points?

### 5. SEO Potential (Weight: 10%)
- Does the title have search appeal AND click appeal?
- Is keyword integration natural (not stuffed)?
- Are there featured snippet opportunities?
- Will internal links strengthen our topical authority?

### 6. Brand Voice (Weight: 10%)
- Does it sound like Cost of Concrete (helpful, expert, no-nonsense)?
- Is it free of prohibited patterns (emojis, emdashes, hype)?
- Does the tone match the topic gravity?

## YOUR DECISION OPTIONS

1. **PUBLISH** — Ready to go live. Minor polish suggestions optional.
2. **PUBLISH WITH NOTES** — Ready, but include specific post-publish actions.
3. **REVISE** — Send back to Writer with specific, actionable feedback.
4. **HOLD** — Technically ready but strategically wrong timing. Explain why.
5. **REJECT** — Fundamentally flawed. Requires complete rewrite or topic pivot.

## STRATEGIC RECOMMENDATIONS

Go beyond QA's mechanical feedback. Provide:
- **Positioning advice**: "Lead with cost savings, not technical process"
- **Competitive insight**: "Competitor X ranks for this; we need a unique angle on [specific aspect]"
- **Content ecosystem**: "After publishing, update our [related article] to link here"
- **Timing considerations**: "This topic peaks in spring; schedule for March"
- **Future-proofing**: "Add note to revisit after [upcoming industry change]"

## CRITICAL CONSTRAINTS

- You have access to: research data, article content, SEO analysis, QA results, job settings
- You do NOT hallucinate facts — if unsure, say "verify X before publishing"
- You respect the QA agent's findings but can OVERRIDE with editorial judgment
- Your decision is FINAL — downstream processes depend on your verdict
`
```

#### Output Schema

```typescript
export const editorialDirectorOutputSchema = z.object({
  // Core Decision
  decision: z.enum(['publish', 'publish_with_notes', 'revise', 'hold', 'reject']),
  confidence: z.number().int().min(0).max(100),
  
  // Multi-Dimensional Scoring
  overallScore: z.number().int().min(0).max(100),
  dimensionScores: z.object({
    publicationReadiness: z.number().int().min(0).max(100),
    strategicFit: z.number().int().min(0).max(100),
    contentDepth: z.number().int().min(0).max(100),
    audienceAlignment: z.number().int().min(0).max(100),
    seoPotential: z.number().int().min(0).max(100),
    brandVoice: z.number().int().min(0).max(100),
  }),
  
  // Strategic Assessment (SWOT-style)
  strategicAssessment: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    risks: z.array(z.string()),
  }),
  
  // Actionable Recommendations
  recommendations: z.array(z.object({
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    category: z.enum(['content', 'seo', 'positioning', 'timing', 'ecosystem', 'technical']),
    recommendation: z.string(),
    location: z.string().optional(),
    effort: z.enum(['trivial', 'minor', 'moderate', 'significant']),
  })),
  
  // Final Article Assembly (if decision is publish or publish_with_notes)
  finalArticle: z.object({
    title: z.string(),
    slug: z.string(),
    content: z.string(),
    excerpt: z.string(),
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(160),
    schemaMarkup: z.record(z.unknown()),
    template: z.string(),
    status: z.enum(['draft', 'published']),
    focusKeyword: z.string(),
    wordCount: z.number().int(),
  }).optional(),
  
  // Post-Publish Actions (if decision is publish_with_notes)
  postPublishActions: z.array(z.object({
    action: z.string(),
    deadline: z.string().optional(),
    reason: z.string(),
  })).optional(),
  
  // Editorial Notes
  editorialSummary: z.string(),
  
  // Override QA if needed
  qaOverride: z.object({
    overrideQaDecision: z.boolean(),
    reason: z.string().optional(),
  }).optional(),
})
```

#### Persona Configuration

```sql
INSERT INTO ai_personas (agent_type, name, description, system_prompt, provider, model, temperature, max_tokens, is_default, is_enabled)
VALUES (
  'project_manager',
  'Editorial Director',
  'Strategic editorial authority making publication decisions with deep analysis and actionable recommendations',
  '[EDITORIAL_DIRECTOR_SYSTEM_PROMPT]',
  'anthropic',
  'claude-opus-4-5-20250514',
  0.3,
  8000,
  true,
  true
);
```

#### Orchestrator Integration Changes

The orchestrator needs to handle the new decision types:

```typescript
// After QA loop completes, in AIOrchestrator.execute()
if (pmResult.output.decision === 'revise') {
  // Send back to Writer with strategic feedback (new revision loop)
} else if (pmResult.output.decision === 'hold') {
  // Mark job as "on_hold" with scheduled review date
} else if (pmResult.output.decision === 'reject') {
  // Mark job as "rejected" with detailed reason
}
// publish/publish_with_notes → proceed to page creation
```

---

## Part 2: BLS Economic Data Integration

### Overview

Integrate Bureau of Labor Statistics API to provide verified, citable economic data for articles and site-wide components.

### Data Available

| Level | Data Type | Freshness | Series ID Pattern |
|-------|-----------|-----------|-------------------|
| **National** | Construction wages | Monthly (~30 days) | `CES2000000003` |
| **National** | Ready-mix concrete PPI | Monthly (~60 days) | `PCU327320327320` |
| **National** | Concrete products PPI | Monthly (~60 days) | `WPU1331` |
| **State** | Construction wages | Monthly (~30 days) | `SMU{FIPS}0002000000003` |
| **Metro** | Private sector wages | Monthly (~30 days) | `SMU{FIPS}{Metro}0500000003` |

### Current Live Data (Verified Jan 25, 2026)

**National:**
- Construction avg hourly wage: **$40.37/hr** (Dec 2025)
- Ready-mix concrete PPI: **392.1** (Nov 2025)

**State Construction Wages (Nov 2025):**
| State | Hourly Wage | vs National |
|-------|-------------|-------------|
| California | $48.51 | +20% |
| New York | $46.10 | +14% |
| Texas | $36.94 | -8% |
| Florida | $35.46 | -12% |

### Database Schema

```sql
CREATE TABLE bls_economic_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Series identification
  series_id TEXT NOT NULL,
  series_name TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'wages', 'ppi', 'employment'
  
  -- Geographic scope
  geo_level TEXT NOT NULL,  -- 'national', 'state', 'metro'
  geo_code TEXT,            -- 'TX', '26420', null for national
  geo_name TEXT,            -- 'Texas', 'Houston-The Woodlands-Sugar Land'
  
  -- The data
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,       -- 'dollars_per_hour', 'index', 'thousands'
  
  -- Temporal
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  is_preliminary BOOLEAN DEFAULT false,
  
  -- Metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_url TEXT,
  
  UNIQUE(series_id, period_year, period_month)
);

-- Indexes
CREATE INDEX idx_bls_category ON bls_economic_data(category, geo_level);
CREATE INDEX idx_bls_geo ON bls_economic_data(geo_level, geo_code);
CREATE INDEX idx_bls_latest ON bls_economic_data(series_id, period_year DESC, period_month DESC);

-- View for latest data
CREATE VIEW bls_latest AS
SELECT DISTINCT ON (series_id) *
FROM bls_economic_data
ORDER BY series_id, period_year DESC, period_month DESC;

-- View for construction wages by state
CREATE VIEW construction_wages_by_state AS
SELECT 
  geo_code as state_code,
  geo_name as state_name,
  value as hourly_wage,
  period_year,
  period_month,
  is_preliminary,
  fetched_at
FROM bls_economic_data
WHERE category = 'wages' 
  AND series_name = 'Construction Avg Hourly Wage'
  AND geo_level = 'state'
ORDER BY geo_name;
```

### BLS Service Implementation

```typescript
// server/services/BLSService.ts
export class BLSService {
  private readonly API_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/'
  
  private readonly SERIES_CONFIG: SeriesConfig[] = [
    // National
    { seriesId: 'CES2000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'national', geoCode: null, geoName: 'National', unit: 'dollars_per_hour' },
    { seriesId: 'PCU327320327320', name: 'Ready-Mix Concrete PPI', category: 'ppi', geoLevel: 'national', geoCode: null, geoName: 'National', unit: 'index' },
    { seriesId: 'WPU1331', name: 'Concrete Products PPI', category: 'ppi', geoLevel: 'national', geoCode: null, geoName: 'National', unit: 'index' },
    
    // State-level construction wages (all 50 states)
    { seriesId: 'SMU01000002000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'state', geoCode: 'AL', geoName: 'Alabama', unit: 'dollars_per_hour' },
    { seriesId: 'SMU04000002000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'state', geoCode: 'AZ', geoName: 'Arizona', unit: 'dollars_per_hour' },
    { seriesId: 'SMU06000002000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'state', geoCode: 'CA', geoName: 'California', unit: 'dollars_per_hour' },
    { seriesId: 'SMU08000002000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'state', geoCode: 'CO', geoName: 'Colorado', unit: 'dollars_per_hour' },
    { seriesId: 'SMU12000002000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'state', geoCode: 'FL', geoName: 'Florida', unit: 'dollars_per_hour' },
    { seriesId: 'SMU13000002000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'state', geoCode: 'GA', geoName: 'Georgia', unit: 'dollars_per_hour' },
    { seriesId: 'SMU36000002000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'state', geoCode: 'NY', geoName: 'New York', unit: 'dollars_per_hour' },
    { seriesId: 'SMU37000002000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'state', geoCode: 'NC', geoName: 'North Carolina', unit: 'dollars_per_hour' },
    { seriesId: 'SMU47000002000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'state', geoCode: 'TN', geoName: 'Tennessee', unit: 'dollars_per_hour' },
    { seriesId: 'SMU48000002000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'state', geoCode: 'TX', geoName: 'Texas', unit: 'dollars_per_hour' },
    { seriesId: 'SMU53000002000000003', name: 'Construction Avg Hourly Wage', category: 'wages', geoLevel: 'state', geoCode: 'WA', geoName: 'Washington', unit: 'dollars_per_hour' },
    // ... remaining states
  ]
  
  async syncAll(): Promise<SyncReport> {
    // Fetch all series and upsert to database
    // BLS allows 50 series per request
    // Run monthly via cron job
  }
  
  async getConstructionWageTrend(): Promise<WageTrend> {
    // Returns national YoY change
  }
  
  async getConcretePriceTrend(): Promise<PriceTrend> {
    // Returns PPI YoY change
  }
  
  async getStateWages(stateCode?: string): Promise<StateWage[]> {
    // Returns wages by state, with comparison to national
  }
}
```

### Integration Points

1. **Research Agent**: Enrich research output with BLS context
2. **Writer Agent**: Include verified economic data in prompts
3. **API Endpoints**: Expose for site components (`/api/bls/construction-wages`, `/api/bls/trends`)
4. **Cron Job**: Monthly sync to keep data fresh

### Article Usage Example

**Before** (unverifiable):
> "Concrete costs have been rising in recent years."

**After** (credible, citable):
> "According to the Bureau of Labor Statistics, concrete material costs increased 8.3% between January 2024 and January 2025. Construction labor wages also climbed to an average of $40.37/hour nationally, up 3.7% year-over-year."

---

## Part 3: Agent Pipeline Gap Fixes

### Priority-Ordered Improvements

| # | Gap | Impact | Effort | Description |
|---|-----|--------|--------|-------------|
| 1 | Editorial Director PM | 🔴 High | Medium | Part 1 of this document |
| 2 | BLS Data Integration | 🔴 High | Medium | Part 2 of this document |
| 3 | Fact-Checking | 🔴 High | Medium | Verify claims against research data |
| 4 | Content Deduplication | 🟡 Medium | Low | Check for existing similar content before generation |
| 5 | SERP Feature Detection | 🟡 Medium | Low | Identify featured snippet opportunities |
| 6 | Competitive Differentiation | 🟡 Medium | Low | Ensure unique angle vs competitors |
| 7 | Internal Link Validation | 🟢 Low | Low | Verify suggested links are valid |
| 8 | Reading Level Library | 🟢 Low | Trivial | Use proper library instead of custom regex |

### Gap 3: Fact-Checking / Claim Verification

**Problem**: Writer generates content but claims are not verified against research data.

**Solution**: Add verification step in Writer or dedicated Fact-Check agent.

```typescript
// Option A: Add to Writer prompt
sections.push('## CLAIM VERIFICATION REQUIREMENTS')
sections.push('For EVERY specific claim you make:')
sections.push('1. Cost claims: Must reference "according to 2025 data" or cite BLS')
sections.push('2. Regional claims: Specify the region explicitly')
sections.push('3. Statistics: Must be from research data provided above')
sections.push('DO NOT invent specific numbers. Use ranges with hedging if data unavailable.')

// Option B: Dedicated Fact-Check Agent (after Writer, before QA)
const FACT_CHECK_PROMPT = `Verify each claim in the article against:
1. Research data provided
2. BLS economic data provided
3. Known construction industry standards

FLAG claims that:
- Contradict the research data
- Make specific price claims without source
- Use outdated statistics (pre-2024)
- Generalize regional data as universal

Output: verifiedClaims, unverifiedClaims, contradictions, suggestions`
```

### Gap 4: Content Deduplication Check

**Problem**: System could generate article for keyword when similar content already exists.

**Solution**: Pre-flight check before pipeline starts.

```typescript
async checkContentOverlap(keyword: string): Promise<ContentOverlapCheck> {
  const existingPages = await pageRepo.searchByKeyword(keyword)
  
  if (existingPages.length > 0) {
    return {
      hasOverlap: true,
      overlappingPages: existingPages.map(p => ({
        id: p.id,
        title: p.title,
        path: p.full_path,
        focusKeyword: p.focus_keyword,
        similarity: calculateSimilarity(keyword, p.focus_keyword),
      })),
      recommendation: existingPages[0].similarity > 0.8 
        ? 'UPDATE_EXISTING' 
        : 'CREATE_WITH_DIFFERENTIATION',
    }
  }
  
  return { hasOverlap: false }
}
```

### Gap 5: SERP Feature Detection

**Problem**: SEO Agent doesn't analyze SERP feature opportunities (featured snippets, FAQs).

**Solution**: Use existing DataForSEO SERP data to identify opportunities.

```typescript
// Add to SEO Agent output
serpFeatureOpportunities: z.object({
  featuredSnippet: z.object({
    available: z.boolean(),  // No current snippet holder
    recommendedFormat: z.enum(['paragraph', 'list', 'table', 'none']),
    targetQuestion: z.string().optional(),
  }),
  faqSchema: z.object({
    recommended: z.boolean(),
    suggestedQuestions: z.array(z.string()),  // From PAA data
  }),
})
```

### Gap 6: Competitive Differentiation in Outline

**Problem**: Outline Agent creates structure without ensuring differentiation from competitors.

**Solution**: Add differentiation requirement to Outline prompt.

```typescript
// Add to Outline Agent prompt
sections.push('## COMPETITIVE DIFFERENTIATION')
sections.push('Competitor headings found:')
for (const comp of research.competitorAnalysis) {
  sections.push(`- ${comp.url}: ${comp.headings?.join(', ')}`)
}
sections.push('')
sections.push('REQUIREMENT: Include at least ONE unique angle not covered by competitors.')

// Add to output schema
differentiationStrategy: z.object({
  uniqueAngle: z.string(),
  competitorGaps: z.array(z.string()),
  ourAdvantage: z.string(),
})
```

### Gap 7: Internal Link Validation

**Problem**: SEO Agent suggests internal links without verifying targets exist.

**Solution**: Validate links against existing published pages.

```typescript
// In SEO Agent, after generating suggestions
const validatedLinks = await Promise.all(
  suggestedLinks.map(async (link) => {
    const page = await pageRepo.findByPath(link.suggestedPath)
    return {
      ...link,
      isValid: !!page && page.status === 'published',
      pageId: page?.id,
    }
  })
)

// Filter out invalid suggestions
output.internalLinks = validatedLinks.filter(l => l.isValid)
```

### Gap 8: Reading Level Library

**Problem**: Custom Flesch-Kincaid implementation is ~85% accurate.

**Solution**: Use established library.

```bash
npm install text-readability
```

```typescript
import { fleschKincaidGrade } from 'text-readability'

// Replace custom implementation
private calculateReadingLevel(content: string): number {
  const plainText = this.stripMarkdown(content)
  return fleschKincaidGrade(plainText)
}
```

---

## Implementation Order Recommendation

### Phase 1: Foundation (Week 1-2)
1. BLS database schema migration
2. BLSService implementation
3. BLS sync cron job
4. API endpoints for BLS data

### Phase 2: Editorial Director (Week 2-3)
1. New output schema
2. Editorial Director system prompt
3. Persona migration
4. Orchestrator decision handling
5. New job statuses (on_hold, rejected)

### Phase 3: Research Agent Integration (Week 3)
1. BLS data enrichment in research output
2. Writer prompt integration for BLS data
3. Content deduplication check

### Phase 4: Quality Improvements (Week 4)
1. Fact-checking integration
2. SERP feature detection
3. Competitive differentiation in Outline
4. Internal link validation
5. Reading level library swap

---

## Files to Modify

| File | Changes |
|------|---------|
| `server/services/ai/agents/ProjectManagerAgent.ts` | Complete rewrite with LLM integration |
| `server/schemas/ai.schemas.ts` | New Editorial Director output schema |
| `server/services/ai/AIOrchestrator.ts` | Handle new decision types |
| `server/services/ai/agents/ResearchAgent.ts` | BLS data integration |
| `server/services/ai/agents/WriterAgent.ts` | BLS data in prompts, fact-check requirements |
| `server/services/ai/agents/SEOAgent.ts` | SERP features, link validation |
| `server/services/ai/agents/OutlineAgent.ts` | Competitive differentiation |
| `server/services/ai/agents/QAAgent.ts` | Use text-readability library |
| `supabase/migrations/` | New migration for bls_economic_data table |

## New Files to Create

| File | Purpose |
|------|---------|
| `server/services/BLSService.ts` | BLS API client and sync logic |
| `server/repositories/BLSRepository.ts` | Database operations for BLS data |
| `server/api/bls/construction-wages.get.ts` | API endpoint for state wages |
| `server/api/bls/trends.get.ts` | API endpoint for national trends |
| `server/cron/sync-bls-data.ts` | Monthly sync job |

---

## Success Metrics

1. **Editorial Director**
   - 100% of articles get strategic assessment
   - Reduced post-publish revisions
   - Higher content quality scores

2. **BLS Integration**
   - All 50 states have wage data
   - Data freshness < 60 days
   - 100% of articles cite BLS when relevant

3. **Pipeline Improvements**
   - Zero duplicate content generation
   - All internal link suggestions are valid
   - Reading level accuracy > 95%

---

## Questions for Planning

1. Should BLS sync run monthly or bi-weekly?
2. Should Editorial Director decisions require human approval for "hold" and "reject"?
3. Should fact-checking be a separate agent or integrated into Writer?
4. Priority order for state-level BLS data (all 50 states vs top 20 by construction activity)?
