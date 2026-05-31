---
discovery_date: 2026-01-22
last_updated: 2026-01-22
cartographer_version: 1.0
---

# Domain: AI & Content Generation

## Business Purpose

The AI & Content Generation domain powers automated content creation for the platform. AI agents generate SEO-optimized articles and blog posts with **quality controls including evals and an internal grading system**.

## Architecture

### Agent System
```
AIOrchestrator
    ↓
AgentRegistry
    ↓
AIAgent (task-specific)
    ↓
LLMProvider (Anthropic/OpenAI)
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `AIOrchestrator` | `AIOrchestrator.ts` | Coordinates multi-step generation |
| `AgentRegistry` | `AgentRegistry.ts` | Manages available agents |
| `AIAgent` | `AIAgent.ts` | Base agent class |
| `AnthropicProvider` | `AnthropicProvider.ts` | Claude API integration |
| `LLMProvider` | `LLMProvider.ts` | Provider abstraction |

## Content Generation Flow

```
1. Job created (ai-article type)
2. AIOrchestrator receives job
3. Selects appropriate agent/persona
4. Generates content via LLM
5. Quality evaluation
6. If passes: Store as draft page
7. If fails: Flag for review
```

## Personas

AI personas define writing style and expertise:
```
/admin/ai/personas          # Manage personas
```

Personas stored in database, define:
- Writing voice/tone
- Subject matter expertise
- Content style guidelines

## Quality Controls

### Evaluation System
- **Evals** - Automated quality checks
- **Grading** - Internal scoring system
- **Human review** - Admin approval before publish

### Article Jobs
```
/admin/ai/article-writing           # Job list
/admin/ai/article-writing/[id]      # Job detail/review
```

## Data Model

### AI Article Jobs
Track content generation jobs:
```
ai_article_jobs (via AIArticleJobRepository)
├── persona_id
├── topic
├── status
├── generated_content
├── eval_score
└── feedback
```

### AI Personas
```
ai_personas
├── name
├── system_prompt
├── style_guidelines
└── expertise_areas
```

## Key Services

| Service | Purpose |
|---------|---------|
| `AIExtractionService` | Extract structured data from text |
| `AIJobQueueService` | Queue and process AI jobs |
| `DataForSeoLabsService` | SEO research for content topics |

## LLM Integration

### Providers
| Provider | Model | Use Case |
|----------|-------|----------|
| Anthropic | Claude | Primary content generation |
| OpenAI | GPT-4 | Alternative/fallback |

### Configuration
API keys in environment:
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

## Key Files

| File | Purpose |
|------|---------|
| `server/services/ai/AIOrchestrator.ts` | Main orchestration |
| `server/services/ai/AIAgent.ts` | Agent base class |
| `server/services/ai/agents/` | Specific agent implementations |
| `server/services/AIExtractionService.ts` | Data extraction |
| `server/services/AIJobQueueService.ts` | Job processing |
| `server/repositories/AIPersonaRepository.ts` | Persona data |
| `server/repositories/AIEvalRepository.ts` | Evaluation data |

## Admin UI

```
/admin/ai                      # AI tools dashboard
/admin/ai/article-writing      # Article generation
/admin/ai/personas             # Persona management
```

## Gotchas

1. **Token costs** - Track usage; LLM calls are expensive
2. **Rate limits** - Anthropic/OpenAI have rate limits
3. **Quality variance** - AI output quality varies; evals catch issues
4. **Prompt engineering** - Persona prompts significantly affect output
5. **Draft by default** - All AI content starts as draft, requires publish

## Metrics

- Articles generated per day
- Eval pass rate
- Token usage
- Average generation time
- Human edit rate (how often AI content is modified)
