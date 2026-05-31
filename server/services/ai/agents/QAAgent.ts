/**
 * QA Agent
 *
 * Fourth agent in the AI article writing pipeline.
 * Performs quality assurance checks on generated content.
 * Returns pass/fail with detailed feedback for Writer revision.
 * Records automated eval to ai_article_evals on every run.
 */

import { z } from 'zod'
import { BaseAIAgent, type AgentContext, type AgentResult, type QAAgentInput } from '../AIAgent'
import { AgentRegistry } from '../AgentRegistry'
import { AIEvalRepository } from '../../../repositories/AIEvalRepository'
import {
  qaOutputSchema,
  type QAOutput,
  type AIAgentType,
  type WriterOutput,
  type SEOOutput,
  type EvalIssue,
} from '../../../schemas/ai.schemas'

// =====================================================
// QA SYSTEM PROMPT
// =====================================================

const QA_SYSTEM_PROMPT = `You are an expert content quality analyst. Your task is to evaluate article content against strict quality standards and provide actionable feedback.

## QUALITY STANDARDS

### Reading Level
- Target: 7th grade Flesch-Kincaid reading level
- Use simple, clear language
- Short sentences and paragraphs

### Brand Voice
- Professional but approachable
- Informative without being dry
- No sensationalism or clickbait

### Content Quality
- Accurate, factual information
- Well-structured with clear flow
- Provides genuine value to readers

### Prohibited Elements (CRITICAL)
- NO emojis anywhere in content
- NO emdashes (—) - use regular dashes or commas instead
- NO sensationalized language ("amazing", "incredible", "you won't believe")
- NO filler phrases ("in today's world", "it goes without saying")

## YOUR TASK
You will receive:
- Article content with pre-computed metrics (reading level, word count, etc.)
- Pre-detected issues (prohibited patterns found)
- SEO analysis data

Score each dimension 0-100:
- readability: How easy is the content to read?
- seo: How well optimized for search?
- accuracy: Does the content appear factual and well-researched?
- engagement: How engaging and valuable is the content?
- brandVoice: Does it match the brand guidelines?

Identify ALL issues with severity and actionable suggestions.
Provide a summary feedback paragraph for the Writer to use in revision.

## OUTPUT FORMAT
Respond ONLY with valid JSON matching this structure:
{
  "passed": true,
  "overallScore": 85,
  "dimensionScores": {
    "readability": 90,
    "seo": 85,
    "accuracy": 80,
    "engagement": 85,
    "brandVoice": 90
  },
  "issues": [
    {
      "category": "readability",
      "severity": "medium",
      "description": "Some sentences exceed 25 words",
      "suggestion": "Break long sentences into shorter ones",
      "location": "Paragraph 3"
    }
  ],
  "feedback": "Overall summary feedback for the Writer..."
}
`

// =====================================================
// CONSTANTS
// =====================================================

const PASS_THRESHOLD = 70
const TARGET_READING_LEVEL = 7 // 7th grade
const MAX_HIGH_ISSUES_TO_PASS = 0 // No high severity issues allowed to pass
const MAX_CRITICAL_ISSUES_TO_PASS = 0 // No critical issues allowed to pass

// Prohibited patterns
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu
const EMDASH_REGEX = /—/g
const SENSATIONAL_WORDS = [
  'amazing', 'incredible', 'unbelievable', 'shocking', 'mind-blowing',
  'jaw-dropping', 'game-changing', 'revolutionary', 'unprecedented',
  'you won\'t believe', 'secret', 'hack', 'insane', 'crazy',
]

// =====================================================
// TYPES
// =====================================================

interface QAIssue {
  issueId?: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggestion: string
  location?: string
}

interface PreComputedMetrics {
  readingLevel: number
  wordCount: number
  targetWordCount: number
  headingCount: number
  paragraphCount: number
  avgSentenceLength: number
  prohibitedPatterns: QAIssue[]
}

// =====================================================
// ISSUE TRACKING HELPERS
// =====================================================

/**
 * Generate a stable issue ID from category and description
 * Uses a simple hash to create a short, stable identifier
 */
function generateIssueId(category: string, description: string): string {
  const input = `${category.toLowerCase().trim()}:${description.toLowerCase().trim()}`
  // Simple hash function for stable IDs
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  const hashStr = Math.abs(hash).toString(36).substring(0, 8)
  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20)
  return `${categorySlug}-${hashStr}`
}

/**
 * Add issue IDs to all issues
 */
function assignIssueIds(issues: QAIssue[]): QAIssue[] {
  return issues.map(issue => ({
    ...issue,
    issueId: issue.issueId || generateIssueId(issue.category, issue.description),
  }))
}

// =====================================================
// AGENT IMPLEMENTATION
// =====================================================

export class QAAgent extends BaseAIAgent<QAAgentInput, QAOutput> {
  readonly agentType: AIAgentType = 'qa'
  readonly name = 'QA Agent'
  readonly description = 'Performs quality assurance and provides feedback for content revision'

  // =====================================================
  // VALIDATION
  // =====================================================

  validateInput(input: unknown): input is QAAgentInput {
    if (!input || typeof input !== 'object') return false
    const obj = input as Record<string, unknown>
    return (
      typeof obj.keyword === 'string' &&
      obj.keyword.length > 0 &&
      obj.article !== undefined &&
      typeof obj.iteration === 'number'
    )
  }

  getOutputSchema(): Record<string, unknown> {
    return z.toJSONSchema(qaOutputSchema)
  }

  // =====================================================
  // EXECUTION
  // =====================================================

  async execute(input: QAAgentInput, context: AgentContext): Promise<AgentResult<QAOutput>> {
    const { keyword, article, seoData, iteration } = input
    const { log, onProgress, llmProvider, persona } = context
    const startTime = Date.now()

    log('info', `Starting QA Agent for keyword: "${keyword}" (iteration ${iteration})`)
    onProgress?.(`QA Agent starting quality analysis (iteration ${iteration})...`)

    try {
      const writerOutput = article as WriterOutput
      const seo = seoData as SEOOutput | undefined

      // Step 1: Pre-compute metrics
      log('debug', 'Computing content metrics...')
      onProgress?.('Analyzing content metrics...')
      const metrics = this.computeMetrics(writerOutput, context)
      log('info', `Reading level: ${metrics.readingLevel.toFixed(1)} | Word count: ${metrics.wordCount}`)
      log('info', `Found ${metrics.prohibitedPatterns.length} prohibited patterns`)

      // Step 2: Detect prohibited patterns
      log('debug', 'Checking for prohibited patterns...')
      onProgress?.('Checking for prohibited patterns...')
      for (const issue of metrics.prohibitedPatterns) {
        log('warn', `Prohibited pattern: ${issue.description}`)
      }

      // Step 3: Build user prompt with all context
      log('debug', 'Building prompt for LLM analysis...')
      onProgress?.('Preparing content for AI quality analysis...')
      const userPrompt = this.buildUserPrompt(keyword, writerOutput, metrics, seo, iteration)
      const systemPrompt = persona.system_prompt || QA_SYSTEM_PROMPT

      // Step 4: Call LLM for subjective analysis
      log('debug', 'Calling LLM for quality assessment...')
      onProgress?.('AI analyzing content quality...')
      const result = await llmProvider.generateJSONWithToolUse<QAOutput>({
        prompt: userPrompt,
        systemPrompt,
        model: persona.model,
        schema: qaOutputSchema,
        toolName: 'generate_qa_review',
        toolDescription: 'Generate quality assurance review with scores, issues, and feedback',
        temperature: persona.temperature ?? 0.3,
        maxTokens: persona.max_tokens ?? 4000,
        agentName: this.agentType,
      })

      const duration = Date.now() - startTime
      const qaOutput = result.data

      // Step 5: Merge pre-computed issues with LLM-detected issues
      const allIssues = [...metrics.prohibitedPatterns, ...qaOutput.issues]
      const deduplicatedIssues = this.deduplicateIssues(allIssues)

      // Step 5b: Assign issue IDs for tracking
      qaOutput.issues = assignIssueIds(deduplicatedIssues)

      // Step 5c: Track fixed vs persisting issues from previous iteration
      const previousIssues = input.previousIssues || []
      if (previousIssues.length > 0) {
        const currentIssueIds = new Set(qaOutput.issues.map(i => i.issueId))

        // Fixed issues: were in previous, not in current
        qaOutput.fixedIssueIds = previousIssues
          .filter(pi => !currentIssueIds.has(pi.issueId))
          .map(pi => pi.issueId)

        // Persisting issues: were in previous, still in current
        qaOutput.persistingIssueIds = previousIssues
          .filter(pi => currentIssueIds.has(pi.issueId))
          .map(pi => pi.issueId)

        log('info', `Issue tracking: ${qaOutput.fixedIssueIds.length} fixed, ${qaOutput.persistingIssueIds.length} persisting`)
      }

      // Step 6: Recalculate overall score based on all issues
      const adjustedScore = this.calculateAdjustedScore(qaOutput, metrics)
      qaOutput.overallScore = adjustedScore

      // Step 6b: Determine pass/fail with strict criteria
      // Must meet ALL conditions to pass:
      // 1. Score >= threshold
      // 2. No critical issues
      // 3. No high severity issues
      const criticalCount = qaOutput.issues.filter(i => i.severity === 'critical').length
      const highCount = qaOutput.issues.filter(i => i.severity === 'high').length
      const meetsScoreThreshold = adjustedScore >= PASS_THRESHOLD
      const meetsCriticalLimit = criticalCount <= MAX_CRITICAL_ISSUES_TO_PASS
      const meetsHighLimit = highCount <= MAX_HIGH_ISSUES_TO_PASS

      qaOutput.passed = meetsScoreThreshold && meetsCriticalLimit && meetsHighLimit

      log('info', `QA analysis complete in ${duration}ms`)
      log('info', `Overall score: ${qaOutput.overallScore}/100 | Passed: ${qaOutput.passed}`)
      log('info', `Issues found: ${qaOutput.issues.length} (${criticalCount} critical, ${highCount} high)`)
      log('debug', `Token usage: ${result.usage.totalTokens} total | Cost: $${result.estimatedCostUsd.toFixed(4)}`)

      // Log dimension scores
      const { dimensionScores } = qaOutput
      log('info', `Dimension scores: readability=${dimensionScores.readability}, seo=${dimensionScores.seo}, accuracy=${dimensionScores.accuracy}, engagement=${dimensionScores.engagement}, brandVoice=${dimensionScores.brandVoice}`)

      // Log pass/fail reason
      if (qaOutput.passed) {
        onProgress?.(`QA PASSED with score ${qaOutput.overallScore}/100. Ready for next step.`)
      } else {
        const failReasons: string[] = []
        if (!meetsScoreThreshold) failReasons.push(`score below ${PASS_THRESHOLD}`)
        if (!meetsCriticalLimit) failReasons.push(`${criticalCount} critical issue(s)`)
        if (!meetsHighLimit) failReasons.push(`${highCount} high severity issue(s)`)
        log('warn', `QA FAILED: ${failReasons.join(', ')}`)
        onProgress?.(`QA FAILED: ${failReasons.join(', ')}. Revision needed.`)
      }

      // Validate output
      const parseResult = qaOutputSchema.safeParse(qaOutput)
      if (!parseResult.success) {
        log('error', 'Output validation failed', parseResult.error)
        return this.failure(
          `Output validation failed: ${parseResult.error.message}`,
          result.usage,
          result.estimatedCostUsd
        )
      }

      // Step 7: Record automated eval to database
      log('debug', 'Recording automated eval to database...')
      onProgress?.('Recording quality evaluation...')
      await this.recordEval(parseResult.data, context)
      log('info', 'Automated eval recorded successfully')

      // Return with feedback for Writer revision if failed
      const agentResult = this.success(parseResult.data, result.usage, qaOutput.passed, result.estimatedCostUsd)
      if (!qaOutput.passed) {
        agentResult.feedback = qaOutput.feedback
        agentResult.continueToNext = false
      }

      return agentResult
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      log('error', `QA Agent failed: ${message}`, error)
      return this.failure(message, { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, 0)
    }
  }

  /**
   * Record automated eval to ai_article_evals table
   */
  private async recordEval(output: QAOutput, context: AgentContext): Promise<void> {
    const { client, job, iteration, stepId, log } = context

    try {
      const evalRepo = new AIEvalRepository(client)

      // Map QA output issues to EvalIssue format
      const evalIssues: EvalIssue[] = output.issues.map(issue => ({
        category: issue.category,
        severity: issue.severity,
        description: issue.description,
        suggestion: issue.suggestion,
      }))

      await evalRepo.create({
        jobId: job.id,
        stepId,
        evalType: 'automated',
        iteration,
        overallScore: output.overallScore,
        dimensionScores: output.dimensionScores,
        passed: output.passed,
        issues: evalIssues,
        feedback: output.feedback,
      })

      log('debug', `Eval recorded: score=${output.overallScore}, passed=${output.passed}, issues=${evalIssues.length}`)
    } catch (error) {
      // Log but don't fail the agent if eval recording fails
      log('warn', 'Failed to record eval (non-fatal)', error)
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Compute all pre-analysis metrics
   */
  private computeMetrics(article: WriterOutput, context: AgentContext): PreComputedMetrics {
    const { log } = context
    const content = article.content
    const prohibitedPatterns: QAIssue[] = []

    // Calculate reading level (Flesch-Kincaid)
    const readingLevel = this.calculateFleschKincaid(content)
    log('debug', `Flesch-Kincaid grade level: ${readingLevel.toFixed(1)}`)

    // Word and sentence counts
    const words = this.getWords(content)
    const sentences = this.getSentences(content)
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0)
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0

    // Heading count
    const headings = content.match(/^#{1,6}\s+.+$/gm) || []

    // Check for emojis
    const emojiMatches = content.match(EMOJI_REGEX)
    if (emojiMatches && emojiMatches.length > 0) {
      prohibitedPatterns.push({
        category: 'brandVoice',
        severity: 'critical',
        description: `Found ${emojiMatches.length} emoji(s) in content`,
        suggestion: 'Remove all emojis from the content',
      })
    }

    // Check for emdashes
    const emdashMatches = content.match(EMDASH_REGEX)
    if (emdashMatches && emdashMatches.length > 0) {
      prohibitedPatterns.push({
        category: 'brandVoice',
        severity: 'high',
        description: `Found ${emdashMatches.length} emdash(es) in content`,
        suggestion: 'Replace emdashes (—) with regular dashes (-) or commas',
      })
    }

    // Check for sensational words
    const contentLower = content.toLowerCase()
    for (const word of SENSATIONAL_WORDS) {
      if (contentLower.includes(word)) {
        prohibitedPatterns.push({
          category: 'brandVoice',
          severity: 'medium',
          description: `Sensational word detected: "${word}"`,
          suggestion: `Remove or replace "${word}" with more measured language`,
        })
      }
    }

    // Check reading level
    if (readingLevel > TARGET_READING_LEVEL + 2) {
      prohibitedPatterns.push({
        category: 'readability',
        severity: 'medium',
        description: `Reading level (${readingLevel.toFixed(1)}) exceeds target (${TARGET_READING_LEVEL})`,
        suggestion: 'Simplify vocabulary and shorten sentences to lower reading level',
      })
    }

    return {
      readingLevel,
      wordCount: article.wordCount,
      targetWordCount: 1500, // Will be overridden by research data
      headingCount: headings.length,
      paragraphCount: paragraphs.length,
      avgSentenceLength,
      prohibitedPatterns,
    }
  }

  /**
   * Calculate Flesch-Kincaid Grade Level
   * Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
   */
  private calculateFleschKincaid(content: string): number {
    const words = this.getWords(content)
    const sentences = this.getSentences(content)
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0)

    if (words.length === 0 || sentences.length === 0) return 0

    const avgWordsPerSentence = words.length / sentences.length
    const avgSyllablesPerWord = syllables / words.length

    const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59
    return Math.max(0, Math.min(20, grade)) // Clamp between 0-20
  }

  /**
   * Extract words from content (removing markdown)
   */
  private getWords(content: string): string[] {
    const plainText = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/\*|_/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`[^`]+`/g, '')
      .replace(/[^\w\s'-]/g, ' ')

    return plainText.split(/\s+/).filter(w => w.length > 0)
  }

  /**
   * Extract sentences from content
   */
  private getSentences(content: string): string[] {
    // Remove markdown formatting first
    const plainText = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/\*|_/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`[^`]+`/g, '')

    // Split on sentence endings
    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0)
    return sentences
  }

  /**
   * Count syllables in a word (approximation)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '')
    if (word.length <= 3) return 1

    // Count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/g)
    let count = vowelGroups ? vowelGroups.length : 1

    // Adjust for silent e
    if (word.endsWith('e')) count--

    // Adjust for -le endings
    if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
      count++
    }

    return Math.max(1, count)
  }

  /**
   * Remove duplicate issues (same category and similar description)
   */
  private deduplicateIssues(issues: QAIssue[]): QAIssue[] {
    const seen = new Set<string>()
    return issues.filter(issue => {
      const key = `${issue.category}:${issue.description.substring(0, 50)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Calculate adjusted score based on issues
   */
  private calculateAdjustedScore(output: QAOutput, metrics: PreComputedMetrics): number {
    const { dimensionScores, issues } = output

    // Base score is weighted average of dimensions
    const weights = {
      readability: 0.25,
      seo: 0.20,
      accuracy: 0.20,
      engagement: 0.20,
      brandVoice: 0.15,
    }

    let baseScore =
      dimensionScores.readability * weights.readability +
      dimensionScores.seo * weights.seo +
      dimensionScores.accuracy * weights.accuracy +
      dimensionScores.engagement * weights.engagement +
      dimensionScores.brandVoice * weights.brandVoice

    // Apply penalties for critical/high severity issues
    const criticalCount = issues.filter(i => i.severity === 'critical').length
    const highCount = issues.filter(i => i.severity === 'high').length

    // Critical issues: -15 points each (max -45)
    baseScore -= Math.min(criticalCount * 15, 45)

    // High issues: -5 points each (max -20)
    baseScore -= Math.min(highCount * 5, 20)

    // Reading level penalty
    const levelDiff = Math.abs(metrics.readingLevel - TARGET_READING_LEVEL)
    if (levelDiff > 3) {
      baseScore -= (levelDiff - 3) * 2
    }

    return Math.max(0, Math.min(100, Math.round(baseScore)))
  }

  /**
   * Build user prompt for LLM analysis
   */
  private buildUserPrompt(
    keyword: string,
    article: WriterOutput,
    metrics: PreComputedMetrics,
    seo: SEOOutput | undefined,
    iteration: number
  ): string {
    const sections: string[] = []

    sections.push(`## QA Review Request (Iteration ${iteration})`)
    sections.push(`Target Keyword: "${keyword}"`)
    sections.push('')

    sections.push('## Article Content')
    sections.push(`Title: ${article.title}`)
    sections.push(`Word Count: ${metrics.wordCount}`)
    sections.push('')
    sections.push('### Content Preview (first 2000 chars)')
    sections.push(article.content.substring(0, 2000))
    if (article.content.length > 2000) {
      sections.push('...[content truncated]...')
    }
    sections.push('')

    sections.push('## Pre-Computed Metrics')
    sections.push(`- Reading Level: ${metrics.readingLevel.toFixed(1)} (target: ${TARGET_READING_LEVEL})`)
    sections.push(`- Word Count: ${metrics.wordCount}`)
    sections.push(`- Heading Count: ${metrics.headingCount}`)
    sections.push(`- Paragraph Count: ${metrics.paragraphCount}`)
    sections.push(`- Avg Sentence Length: ${metrics.avgSentenceLength.toFixed(1)} words`)
    sections.push('')

    if (metrics.prohibitedPatterns.length > 0) {
      sections.push('## Pre-Detected Issues (CRITICAL)')
      for (const issue of metrics.prohibitedPatterns) {
        sections.push(`- [${issue.severity.toUpperCase()}] ${issue.description}`)
      }
      sections.push('')
    }

    if (seo) {
      sections.push('## SEO Analysis')
      sections.push(`- Optimization Score: ${seo.optimizationScore}/100`)
      sections.push(`- Heading Valid: ${seo.headingAnalysis.isValid}`)
      sections.push(`- Keyword Density: ${seo.keywordDensity.percentage}%`)
      sections.push('')
    }

    sections.push('## Your Task')
    sections.push('1. Score each dimension (0-100): readability, seo, accuracy, engagement, brandVoice')
    sections.push('2. Identify any additional issues not in the pre-detected list')
    sections.push('3. Provide actionable feedback for the Writer to improve the content')
    sections.push('')
    sections.push('Remember: Content must be at 7th grade reading level, no emojis, no emdashes, no sensationalism.')
    sections.push('')
    sections.push('## REQUIRED JSON FIELD NAMES (use camelCase exactly)')
    sections.push('- "passed" (boolean)')
    sections.push('- "overallScore" (NOT overall_score)')
    sections.push('- "dimensionScores" (NOT dimension_scores) with: readability, seo, accuracy, engagement, brandVoice')
    sections.push('- "issues" array with objects containing:')
    sections.push('  - "category" (string like "readability", "seo", etc.)')
    sections.push('  - "severity" (MUST be exactly one of: "low", "medium", "high", "critical")')
    sections.push('  - "description" (string)')
    sections.push('  - "suggestion" (string)')
    sections.push('  - "location" (optional string)')
    sections.push('- "feedback" (string with revision instructions)')
    sections.push('')
    sections.push('Respond ONLY with valid JSON. Do NOT wrap in markdown code blocks.')

    return sections.join('\n')
  }
}

// =====================================================
// REGISTER AGENT
// =====================================================

// Register agent on module load
const qaAgent = new QAAgent()
AgentRegistry.register(qaAgent)

export { qaAgent }

