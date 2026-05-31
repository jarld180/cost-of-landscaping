/**
 * Project Manager Agent
 *
 * Fifth and final agent in the AI article writing pipeline.
 * Assembles the final article from Writer and SEO outputs.
 * Validates all required fields and structures output for database insertion.
 *
 * NOTE: This agent performs deterministic assembly - no LLM call needed.
 * This makes it faster, cheaper, and more reliable.
 *
 * @see BAM-314 Batch 5.2: Final Article Structuring
 */

import { z } from 'zod'
import { BaseAIAgent, type AgentContext, type AgentResult, type ProjectManagerAgentInput } from '../AIAgent'
import { AgentRegistry } from '../AgentRegistry'
import {
  projectManagerOutputSchema,
  type ProjectManagerOutput,
  type AIAgentType,
  type WriterOutput,
  type SEOOutput,
  type QAOutput,
  type AIArticleJobSettings,
} from '../../../schemas/ai.schemas'

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate a URL-safe slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

/**
 * Generate an excerpt from content if not provided
 */
function generateExcerpt(content: string, maxLength: number = 160): string {
  // Remove markdown formatting
  const plainText = content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`[^`]+`/g, '')
    .replace(/\n+/g, ' ')
    .trim()

  if (plainText.length <= maxLength) {
    return plainText
  }

  // Truncate at word boundary
  const truncated = plainText.substring(0, maxLength - 3)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...'
}

// =====================================================
// AGENT IMPLEMENTATION
// =====================================================

export class ProjectManagerAgent extends BaseAIAgent<ProjectManagerAgentInput, ProjectManagerOutput> {
  readonly agentType: AIAgentType = 'project_manager'
  readonly name = 'Project Manager Agent'
  readonly description = 'Assembles final article and validates for publication'

  // =====================================================
  // VALIDATION
  // =====================================================

  validateInput(input: unknown): input is ProjectManagerAgentInput {
    if (!input || typeof input !== 'object') return false
    const obj = input as Record<string, unknown>
    return (
      typeof obj.keyword === 'string' &&
      obj.keyword.length > 0 &&
      obj.article !== undefined &&
      obj.settings !== undefined
    )
  }

  getOutputSchema(): Record<string, unknown> {
    return z.toJSONSchema(projectManagerOutputSchema)
  }

  // =====================================================
  // EXECUTION
  // =====================================================

  async execute(
    input: ProjectManagerAgentInput,
    context: AgentContext
  ): Promise<AgentResult<ProjectManagerOutput>> {
    const { keyword, article, seoData, qaData, settings } = input
    const { log, onProgress } = context
    const startTime = Date.now()

    log('info', `Starting Project Manager Agent for keyword: "${keyword}"`)
    onProgress?.('Project Manager assembling final article...')

    try {
      const writerOutput = article as WriterOutput
      const seo = seoData as SEOOutput | undefined
      const qa = qaData as QAOutput | undefined
      const jobSettings = settings as AIArticleJobSettings | undefined

      // Validate required data
      const validationErrors: string[] = []

      if (!writerOutput.title) {
        validationErrors.push('Missing article title')
      }
      if (!writerOutput.content) {
        validationErrors.push('Missing article content')
      }
      if (writerOutput.wordCount < 300) {
        validationErrors.push(`Article too short: ${writerOutput.wordCount} words (minimum 300)`)
      }

      // Check QA status
      const qaPassed = qa?.passed ?? true
      if (!qaPassed && qa) {
        validationErrors.push(`QA check failed with score ${qa.overallScore}/100`)
      }

      log('debug', `Validation complete. Errors: ${validationErrors.length}`)
      onProgress?.(`Validation complete. ${validationErrors.length === 0 ? 'All checks passed.' : `Found ${validationErrors.length} issues.`}`)

      // Assemble final article
      log('debug', 'Assembling final article structure...')
      onProgress?.('Assembling final article structure...')

      const slug = writerOutput.slug || generateSlug(writerOutput.title)
      const excerpt = writerOutput.excerpt || generateExcerpt(writerOutput.content)
      const metaTitle = seo?.metaTitle || writerOutput.title.substring(0, 60)
      const metaDescription = seo?.metaDescription || excerpt.substring(0, 160)
      const schemaMarkup = seo?.schemaMarkup || this.generateDefaultSchema(writerOutput, keyword)
      const template = jobSettings?.template || 'article'
      const autoPost = jobSettings?.autoPost ?? false

      const finalArticle = {
        title: writerOutput.title,
        slug,
        content: writerOutput.content,
        excerpt,
        metaTitle,
        metaDescription,
        schemaMarkup,
        template,
        status: autoPost ? 'published' : 'draft' as const,
        focusKeyword: keyword,
        wordCount: writerOutput.wordCount,
      }

      // Determine if ready for publish
      const readyForPublish = validationErrors.length === 0

      // Generate summary and recommendations
      const summary = this.generateSummary(writerOutput, seo, qa, readyForPublish)
      const recommendations = this.generateRecommendations(writerOutput, seo, qa, validationErrors)

      const output: ProjectManagerOutput = {
        readyForPublish,
        validationErrors,
        finalArticle,
        summary,
        recommendations,
      }

      // Validate output against schema
      const parseResult = projectManagerOutputSchema.safeParse(output)
      if (!parseResult.success) {
        log('error', 'Output validation failed', parseResult.error)
        return this.failure(
          `Output validation failed: ${parseResult.error.message}`,
          { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          0
        )
      }

      const duration = Date.now() - startTime
      log('info', `Project Manager complete in ${duration}ms`)
      log('info', `Ready for publish: ${readyForPublish}`)
      log('info', `Final article: "${finalArticle.title}" (${finalArticle.wordCount} words)`)

      onProgress?.(`Project Manager complete. ${readyForPublish ? 'Article ready for publication.' : 'Article requires attention.'}`)

      // No tokens used - deterministic assembly
      return this.success(parseResult.data, { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, true, 0)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      log('error', `Project Manager Agent failed: ${message}`, error)
      return this.failure(message, { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, 0)
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Generate default Article schema markup
   */
  private generateDefaultSchema(
    article: WriterOutput,
    keyword: string
  ): Record<string, unknown> {
    const now = new Date().toISOString()
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.excerpt,
      keywords: keyword,
      wordCount: article.wordCount,
      datePublished: now,
      dateModified: now,
      author: {
        '@type': 'Organization',
        name: 'Cost of Landscaping',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Cost of Landscaping',
      },
    }
  }

  /**
   * Generate a summary of the article assembly process
   */
  private generateSummary(
    article: WriterOutput,
    seo: SEOOutput | undefined,
    qa: QAOutput | undefined,
    readyForPublish: boolean
  ): string {
    const parts: string[] = []

    parts.push(`Article "${article.title}" assembled with ${article.wordCount} words.`)

    if (seo) {
      parts.push(`SEO optimization score: ${seo.optimizationScore}/100.`)
    }

    if (qa) {
      parts.push(`QA score: ${qa.overallScore}/100 (${qa.passed ? 'passed' : 'failed'}).`)
    }

    parts.push(readyForPublish ? 'Ready for publication.' : 'Requires review before publication.')

    return parts.join(' ')
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    article: WriterOutput,
    seo: SEOOutput | undefined,
    qa: QAOutput | undefined,
    validationErrors: string[]
  ): string[] {
    const recommendations: string[] = []

    // Add validation error fixes
    if (validationErrors.length > 0) {
      recommendations.push('Address validation errors before publishing')
    }

    // SEO recommendations
    if (seo) {
      if (seo.optimizationScore < 70) {
        recommendations.push('Consider improving SEO optimization')
      }
      if (seo.internalLinks && seo.internalLinks.length > 0) {
        recommendations.push(`Add ${seo.internalLinks.length} suggested internal links`)
      }
      if (!seo.headingAnalysis.isValid) {
        recommendations.push('Review heading structure for SEO best practices')
      }
    }

    // QA recommendations
    if (qa && !qa.passed) {
      recommendations.push('Review QA feedback and revise content')
      if (qa.issues.length > 0) {
        const criticalIssues = qa.issues.filter(i => i.severity === 'critical')
        if (criticalIssues.length > 0) {
          recommendations.push(`Fix ${criticalIssues.length} critical issues`)
        }
      }
    }

    // Word count recommendations
    if (article.wordCount < 500) {
      recommendations.push('Consider expanding article content for better SEO')
    }

    return recommendations
  }
}

// =====================================================
// REGISTER AGENT
// =====================================================

// Register agent on module load
const projectManagerAgent = new ProjectManagerAgent()
AgentRegistry.register(projectManagerAgent)

export { projectManagerAgent }

