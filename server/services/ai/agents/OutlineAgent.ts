/**
 * Outline Agent
 *
 * Second agent in the AI article writing pipeline (after Research).
 * Creates a detailed content outline with H2/H3 structure, word count distribution,
 * PAA question mapping, and secondary keyword placement.
 *
 * Output feeds into the Writer Agent.
 */

import { z } from 'zod'
import { BaseAIAgent, type AgentContext, type AgentResult, type OutlineAgentInput } from '../AIAgent'
import { AgentRegistry } from '../AgentRegistry'
import {
  outlineOutputSchema,
  type OutlineOutput,
  type AIAgentType,
  type ResearchOutput,
} from '../../../schemas/ai.schemas'

// =====================================================
// OUTLINE SYSTEM PROMPT
// =====================================================

const OUTLINE_SYSTEM_PROMPT = `You are an Outline Agent for SEO content planning.

Your job is to create a detailed content outline that:
1. Structures H2 and H3 headings for comprehensive topic coverage
2. Assigns target word counts to each section
3. Maps "People Also Ask" questions to relevant sections
4. Distributes secondary keywords across sections
5. Identifies key points each section should cover

## OUTLINE GENERATION GUIDELINES

### Structure Requirements
- Create H2 sections (level: 2) for main topics
- Create H3 sections (level: 3) for subtopics under H2s
- Ensure logical hierarchy and flow
- Cover all aspects of the topic comprehensively

### Word Count Distribution
- Distribute total target word count across sections
- Assign 200-500 words to most H2 sections
- Assign 100-300 words to H3 sections
- Ensure section word counts sum to approximately the total target
- Allow 10% variance in total (e.g., 1800-2200 for 2000 target)

### PAA Question Mapping
- Map "People Also Ask" questions to relevant sections
- Each PAA question should appear in exactly one section
- Create sections specifically to answer PAA questions when needed
- Include PAA questions in the paaQuestionsToAnswer array for relevant sections

### Secondary Keyword Distribution
- Distribute secondary keywords across different sections
- Avoid concentrating all keywords in one section
- Assign 1-3 keywords per section
- Ensure keywords are semantically relevant to section topics

### Key Points
- Identify 2-4 key points for each section
- Key points should guide the writer on what to cover
- Be specific and actionable

### Strategic Notes
- Provide high-level guidance for the writer
- Note any special considerations or emphasis areas
- Mention content gaps or unique angles to explore

## OUTPUT FORMAT

You MUST respond with valid JSON matching this exact structure:
{
  "sections": [
    {
      "level": 2,
      "title": "Section Title",
      "targetWordCount": 300,
      "keyPoints": ["Point 1", "Point 2"],
      "paaQuestionsToAnswer": ["Question from PAA list"],
      "secondaryKeywordsToInclude": ["keyword1", "keyword2"]
    }
  ],
  "totalTargetWordCount": 2000,
  "strategicNotes": "High-level guidance for writer"
}
`

// =====================================================
// AGENT IMPLEMENTATION
// =====================================================

export class OutlineAgent extends BaseAIAgent<OutlineAgentInput, OutlineOutput> {
  readonly agentType: AIAgentType = 'outline'
  readonly name = 'Outline Agent'
  readonly description = 'Creates detailed content outlines with H2/H3 structure, word count distribution, and PAA mapping'

  // =====================================================
  // VALIDATION
  // =====================================================

  validateInput(input: unknown): input is OutlineAgentInput {
    if (!input || typeof input !== 'object') return false
    const obj = input as Record<string, unknown>
    return (
      typeof obj.keyword === 'string' &&
      obj.keyword.length > 0 &&
      obj.researchData !== undefined &&
      typeof obj.targetWordCount === 'number' &&
      obj.targetWordCount > 0
    )
  }

  getOutputSchema(): Record<string, unknown> {
    return z.toJSONSchema(outlineOutputSchema)
  }

  // =====================================================
  // EXECUTION
  // =====================================================

  async execute(input: OutlineAgentInput, context: AgentContext): Promise<AgentResult<OutlineOutput>> {
    const { keyword, researchData, articleContext, secondaryKeywords, targetWordCount } = input
    const { log, onProgress, llmProvider, persona } = context
    const startTime = Date.now()

    log('info', `Starting Outline Agent for keyword: "${keyword}"`)
    onProgress?.('Outline Agent generating content structure...')

    try {
      // Cast research data to expected type
      const research = researchData as ResearchOutput

      // Build user prompt with research data
      const userPrompt = this.buildUserPrompt(
        keyword,
        research,
        articleContext,
        secondaryKeywords,
        targetWordCount
      )

      log('debug', `Calling LLM to generate outline (model: ${persona.model})`)

      // Call LLM with tool_use for guaranteed structured JSON output
      const llmResult = await llmProvider.generateJSONWithToolUse<OutlineOutput>({
        prompt: userPrompt,
        systemPrompt: OUTLINE_SYSTEM_PROMPT,
        model: persona.model,
        schema: outlineOutputSchema,
        toolName: 'generate_outline',
        toolDescription: 'Generate a structured content outline for an SEO article',
        temperature: persona.temperature ?? 0.5,
        maxTokens: persona.max_tokens ?? 4096,
        agentName: this.agentType,
      })

      const { data: outline, usage, estimatedCostUsd } = llmResult

      // Validate outline structure
      if (!outline.sections || outline.sections.length === 0) {
        throw new Error('LLM returned outline with no sections')
      }

      // Ensure all sections have required fields
      for (const section of outline.sections) {
        if (!section.title || section.targetWordCount === undefined) {
          throw new Error('LLM returned section with missing required fields')
        }
      }

      log('info', `Outline generated successfully with ${outline.sections.length} sections`)
      onProgress?.(`Outline generated with ${outline.sections.length} sections`)

      // Add token usage to output
      const outputWithTokens = {
        ...outline,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
      }

      return this.success(outputWithTokens as OutlineOutput, usage, true, estimatedCostUsd)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      log('error', `Outline Agent failed: ${errorMsg}`)
      return this.failure(errorMsg, { promptTokens: 0, completionTokens: 0, totalTokens: 0 })
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private buildUserPrompt(
    keyword: string,
    research: ResearchOutput,
    articleContext?: string,
    secondaryKeywords?: string[],
    targetWordCount?: number
  ): string {
    let prompt = `Create a detailed content outline for an article about: "${keyword}"\n\n`

    prompt += `## TARGET SPECIFICATIONS\n`
    prompt += `- Target word count: ${targetWordCount || 2000} words\n`
    if (articleContext) {
      prompt += `- Article context/audience: ${articleContext}\n`
    }
    prompt += '\n'

    // Add research data
    prompt += `## RESEARCH DATA\n`
    prompt += `- Primary keyword: ${research.keyword}\n`

    if (research.keywordData) {
      prompt += `- Search volume: ${research.keywordData.searchVolume}\n`
      prompt += `- Keyword difficulty: ${research.keywordData.difficulty}\n`
      prompt += `- Search intent: ${research.keywordData.intent}\n`
    }

    // Add PAA questions
    if (research.paaQuestions && research.paaQuestions.length > 0) {
      prompt += `\n## PEOPLE ALSO ASK QUESTIONS (must map to sections)\n`
      research.paaQuestions.forEach((q, i) => {
        prompt += `${i + 1}. ${q}\n`
      })
    }

    // Add secondary keywords
    if (secondaryKeywords && secondaryKeywords.length > 0) {
      prompt += `\n## SECONDARY KEYWORDS (distribute across sections)\n`
      secondaryKeywords.forEach((k, i) => {
        prompt += `${i + 1}. ${k}\n`
      })
    }

    // Add competitor structure reference
    if (research.exaData?.competitors && research.exaData.competitors.length > 0) {
      prompt += `\n## COMPETITOR STRUCTURE REFERENCE (for inspiration)\n`
      research.exaData.competitors.slice(0, 2).forEach((comp, i) => {
        prompt += `${i + 1}. ${comp.title}\n`
        if (comp.snippet) {
          prompt += `   Snippet: ${comp.snippet.substring(0, 100)}...\n`
        }
      })
    }

    // Add related keywords
    if (research.relatedKeywords && research.relatedKeywords.length > 0) {
      prompt += `\n## RELATED KEYWORDS (for semantic coverage)\n`
      research.relatedKeywords.slice(0, 5).forEach((k, i) => {
        prompt += `${i + 1}. ${k}\n`
      })
    }

    // Add content gaps
    if (research.contentGaps && research.contentGaps.length > 0) {
      prompt += `\n## CONTENT GAPS TO ADDRESS\n`
      research.contentGaps.forEach((gap, i) => {
        prompt += `${i + 1}. ${gap}\n`
      })
    }

    prompt += `\n## INSTRUCTIONS\n`
    prompt += `1. Create an outline that comprehensively covers the topic\n`
    prompt += `2. Map ALL PAA questions to specific sections\n`
    prompt += `3. Distribute secondary keywords across different sections\n`
    prompt += `4. Ensure H2 and H3 hierarchy is logical\n`
    prompt += `5. Assign realistic word counts that sum to approximately ${targetWordCount || 2000}\n`
    prompt += `6. Include key points for each section\n`
    prompt += `7. Provide strategic notes for the writer\n`

    return prompt
  }
}

// =====================================================
// REGISTER AGENT
// =====================================================

// Register agent on module load
const outlineAgent = new OutlineAgent()
AgentRegistry.register(outlineAgent)

export { outlineAgent }
