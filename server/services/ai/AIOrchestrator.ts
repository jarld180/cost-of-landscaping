/**
 * AI Orchestrator
 *
 * Supervisor service for the AI article writing pipeline.
 * Manages the execution of: Research → Writer → SEO → QA (→ Writer revision if QA fails) → PM
 *
 * Features:
 * - Agent execution sequence via AgentRegistry
 * - QA feedback loops with configurable max iterations
 * - Job cancellation support (checked before each agent)
 * - Retry logic for transient failures
 * - Skip agents via job settings
 * - Job step recording with timing
 * - Progress tracking for SSE streaming
 * - Auto-post page creation when enabled
 *
 * @see BAM-314 Phase 5: Orchestrator & Page Creation
 */

import { consola } from 'consola'
import { marked } from 'marked'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../app/types/supabase'
import type {
  AIArticleJobRow,
  AIAgentType,
  AIPersonaRow,
  AIArticleJobSettings,
  PersonaSnapshot,
  ResearchOutput,
  OutlineOutput,
  WriterOutput,
  SEOOutput,
  QAOutput,
  ProjectManagerOutput,
  ImageGeneratorOutput,
} from '../../schemas/ai.schemas'
import { DEFAULT_MAX_ITERATIONS } from '../../schemas/ai.schemas'
import { AIArticleJobRepository } from '../../repositories/AIArticleJobRepository'
import { AIJobStepRepository, type StepLogEntry } from '../../repositories/AIJobStepRepository'
import { AIPersonaRepository } from '../../repositories/AIPersonaRepository'
import { PageService, type CreatePageData } from '../PageService'
import { AgentRegistry } from './AgentRegistry'
import { withRetry } from '../../utils/retry'
import type {
  AgentContext,
  AgentResult,
  OutlineAgentInput,
  WriterAgentInput,
  SEOAgentInput,
  QAAgentInput,
  ProjectManagerAgentInput,
  TrackedIssue,
  RevisionIssue,
} from './AIAgent'
import type { ILLMProvider } from './LLMProvider'
import type { TemplateSlug } from '../../../app/types/templates'

// =====================================================
// TYPES
// =====================================================

export interface PipelineResult {
  success: boolean
  job: AIArticleJobRow
  error?: string
  iterations: number
  totalTokens: number
  cancelled?: boolean
}

export interface PipelineCallbacks {
  onProgress?: (agentType: AIAgentType, message: string, data?: unknown) => void
  onAgentStart?: (agentType: AIAgentType, iteration: number) => void
  onAgentComplete?: (agentType: AIAgentType, iteration: number, result: AgentResult) => void
  onCancelled?: () => void
}

// =====================================================
// AI ORCHESTRATOR
// =====================================================

export interface OrchestratorApiKeys {
  openaiApiKey?: string
  exaApiKey?: string
  dataforseoApiKey?: string
  heliconeApiKey?: string
}

export class AIOrchestrator {
  private client: SupabaseClient<Database>
  private llmProvider: ILLMProvider
  private jobRepo: AIArticleJobRepository
  private stepRepo: AIJobStepRepository
  private personaRepo: AIPersonaRepository
  private pageService: PageService
  private callbacks: PipelineCallbacks
  private apiKeys: OrchestratorApiKeys

  constructor(
    client: SupabaseClient<Database>,
    llmProvider: ILLMProvider,
    callbacks: PipelineCallbacks = {},
    apiKeys: OrchestratorApiKeys = {}
  ) {
    this.client = client
    this.llmProvider = llmProvider
    this.jobRepo = new AIArticleJobRepository(client)
    this.stepRepo = new AIJobStepRepository(client)
    this.personaRepo = new AIPersonaRepository(client)
    this.pageService = new PageService(client)
    this.callbacks = callbacks
    this.apiKeys = apiKeys
  }

  /**
   * Execute the full article pipeline for a job
   */
  async execute(job: AIArticleJobRow): Promise<PipelineResult> {
    const settings = job.settings as AIArticleJobSettings | null
    const maxIterations = job.max_iterations ?? DEFAULT_MAX_ITERATIONS
    const skipAgents = settings?.skipAgents ?? []
    let currentIteration = job.current_iteration ?? 1
    let totalTokens = job.total_tokens_used ?? 0
    let totalCostUsd = Number(job.estimated_cost_usd) || 0

    consola.info(`[AIOrchestrator] Starting job ${job.id} for keyword: "${job.keyword}"`)
    if (skipAgents.length > 0) {
      consola.info(`[AIOrchestrator] Skipping agents: ${skipAgents.join(', ')}`)
    }

    try {
      // Check for cancellation before starting
      if (await this.checkCancelled(job.id)) {
        return this.cancelledResult(job, currentIteration, totalTokens, totalCostUsd)
      }

      // Mark job as processing
      await this.jobRepo.startProcessing(job.id)

      // Stage 1: Research (only once, unless skipped)
      let researchOutput: ResearchOutput | null = null
      if (!skipAgents.includes('research')) {
        if (await this.checkCancelled(job.id)) {
          return this.cancelledResult(job, currentIteration, totalTokens, totalCostUsd)
        }

        const researchResult = await this.runAgentWithRetry('research', { keyword: job.keyword }, job, currentIteration)
        if (!researchResult.success || !researchResult.output) {
          return this.failJob(job, researchResult.error ?? 'Research failed', currentIteration, totalTokens, totalCostUsd)
        }
        totalTokens += researchResult.usage.totalTokens
        totalCostUsd += researchResult.estimatedCostUsd ?? 0
        researchOutput = researchResult.output as ResearchOutput
      }

       // Determine target word count
       const targetWordCount = settings?.targetWordCount
         || researchOutput?.recommendedWordCount
         || 1500

       // Extract settings for passing to agents
       const articleContext = settings?.articleContext
       const secondaryKeywords = settings?.secondaryKeywords

       // Stage 1.5: Outline (ONCE, before revision loop)
       let outlineOutput: OutlineOutput | undefined
       const shouldRunOutline = researchOutput !== null && !settings?.skipAgents?.includes('outline')
       if (shouldRunOutline) {
         if (await this.checkCancelled(job.id)) {
           return this.cancelledResult(job, currentIteration, totalTokens, totalCostUsd)
         }

         const outlineInput: OutlineAgentInput = {
           keyword: job.keyword,
           researchData: researchOutput,
           articleContext,
           secondaryKeywords,
           targetWordCount,
         }
         const outlineResult = await this.runAgentWithRetry('outline', outlineInput, job, currentIteration)
         if (!outlineResult.success || !outlineResult.output) {
           return this.failJob(job, outlineResult.error ?? 'Outline failed', currentIteration, totalTokens, totalCostUsd)
         }
         totalTokens += outlineResult.usage.totalTokens
         totalCostUsd += outlineResult.estimatedCostUsd ?? 0
         outlineOutput = outlineResult.output as OutlineOutput
       }

       // QA Feedback Loop: Writer → SEO → QA (repeat if QA fails, up to maxIterations)
       let writerOutput: WriterOutput | null = null
       let seoOutput: SEOOutput | null = null
       let qaOutput: QAOutput | null = null
       let qaFeedback: string | undefined
       let previousIssues: TrackedIssue[] = []
       let issuesToFix: RevisionIssue[] = []
       /** Track how many times each issue has persisted across iterations */
       const issuePersistCount: Map<string, number> = new Map()

       while (currentIteration <= maxIterations) {
        consola.info(`[AIOrchestrator] Starting iteration ${currentIteration}/${maxIterations}`)
        await this.jobRepo.updateProgress(job.id, { currentIteration })

        // Check for cancellation before each agent
        if (await this.checkCancelled(job.id)) {
          return this.cancelledResult(job, currentIteration, totalTokens, totalCostUsd)
        }

         // Stage 2: Writer (unless skipped)
         if (!skipAgents.includes('writer')) {
           const writerInput: WriterAgentInput = {
             keyword: job.keyword,
             researchData: researchOutput ?? undefined,
             targetWordCount,
             outline: outlineOutput,
             articleContext,
             secondaryKeywords,
             qaFeedback,
             // Pass structured issues for targeted revision (iteration > 1)
             issuesToFix: issuesToFix.length > 0 ? issuesToFix : undefined,
             previousArticle: writerOutput ?? undefined,
             iteration: currentIteration,
           }
          const writerResult = await this.runAgentWithRetry('writer', writerInput, job, currentIteration)
          if (!writerResult.success || !writerResult.output) {
            return this.failJob(job, writerResult.error ?? 'Writer failed', currentIteration, totalTokens, totalCostUsd)
          }
          totalTokens += writerResult.usage.totalTokens
          totalCostUsd += writerResult.estimatedCostUsd ?? 0
          writerOutput = writerResult.output as WriterOutput
        }

        // Check for cancellation
        if (await this.checkCancelled(job.id)) {
          return this.cancelledResult(job, currentIteration, totalTokens, totalCostUsd)
        }

        // Stage 3: SEO (unless skipped)
        if (!skipAgents.includes('seo') && writerOutput) {
          const seoInput: SEOAgentInput = {
            keyword: job.keyword,
            article: writerOutput,
            researchData: researchOutput ?? undefined,
          }
          const seoResult = await this.runAgentWithRetry('seo', seoInput, job, currentIteration)
          if (!seoResult.success || !seoResult.output) {
            return this.failJob(job, seoResult.error ?? 'SEO failed', currentIteration, totalTokens, totalCostUsd)
          }
          totalTokens += seoResult.usage.totalTokens
          totalCostUsd += seoResult.estimatedCostUsd ?? 0
          seoOutput = seoResult.output as SEOOutput
        }

        // Check for cancellation
        if (await this.checkCancelled(job.id)) {
          return this.cancelledResult(job, currentIteration, totalTokens, totalCostUsd)
        }

        // Stage 4: QA (unless skipped)
        if (!skipAgents.includes('qa') && writerOutput) {
          const qaInput: QAAgentInput = {
            keyword: job.keyword,
            article: writerOutput,
            seoData: seoOutput ?? undefined,
            iteration: currentIteration,
            // Pass previous issues for tracking fixes
            previousIssues: previousIssues.length > 0 ? previousIssues : undefined,
          }
          const qaResult = await this.runAgentWithRetry('qa', qaInput, job, currentIteration)
          if (!qaResult.success || !qaResult.output) {
            return this.failJob(job, qaResult.error ?? 'QA failed', currentIteration, totalTokens, totalCostUsd)
          }
          totalTokens += qaResult.usage.totalTokens
          totalCostUsd += qaResult.estimatedCostUsd ?? 0
          qaOutput = qaResult.output as QAOutput

          // Log issue tracking results
          if (qaOutput.fixedIssueIds?.length) {
            consola.success(`[AIOrchestrator] Fixed ${qaOutput.fixedIssueIds.length} issue(s) from previous iteration`)
          }
          if (qaOutput.persistingIssueIds?.length) {
            consola.warn(`[AIOrchestrator] ${qaOutput.persistingIssueIds.length} issue(s) still persist`)
          }

          // Check QA result
          if (qaOutput.passed) {
            consola.success(`[AIOrchestrator] QA passed on iteration ${currentIteration}`)
            break
          }

          // QA failed - prepare for revision if iterations remain
          if (currentIteration < maxIterations) {
            consola.warn(`[AIOrchestrator] QA failed (score: ${qaOutput.overallScore}), preparing revision...`)
            qaFeedback = qaResult.feedback ?? qaOutput.feedback

            // Build tracked issues for next QA iteration
            previousIssues = qaOutput.issues
              .filter(i => i.issueId) // Only track issues with IDs
              .map(i => ({
                issueId: i.issueId!,
                category: i.category,
                severity: i.severity,
                description: i.description,
                suggestion: i.suggestion,
                location: i.location,
              }))

            // Build structured issues for Writer revision with persist counts
            issuesToFix = qaOutput.issues.map(i => {
              const issueId = i.issueId || `unknown-${Date.now()}`
              // Increment persist count for this issue
              const currentCount = issuePersistCount.get(issueId) || 0
              issuePersistCount.set(issueId, currentCount + 1)

              return {
                issueId,
                category: i.category,
                severity: i.severity,
                description: i.description,
                suggestion: i.suggestion,
                location: i.location,
                persistCount: currentCount + 1,
              }
            })

            // Sort by severity (critical first) then by persist count (most persistent first)
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
            issuesToFix.sort((a, b) => {
              const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
              if (severityDiff !== 0) return severityDiff
              return (b.persistCount || 0) - (a.persistCount || 0)
            })

            consola.info(`[AIOrchestrator] Prepared ${issuesToFix.length} issues for Writer revision`)
            currentIteration++
          } else {
            consola.warn(`[AIOrchestrator] QA failed on final iteration, proceeding with best effort`)
            break
          }
        } else {
          // QA skipped, exit loop
          break
        }
      }

      // Stage 5: Project Manager (final assembly)
      let pmOutput: ProjectManagerOutput | null = null

      if (!skipAgents.includes('project_manager') && writerOutput) {
        // Check for cancellation
        if (await this.checkCancelled(job.id)) {
          return this.cancelledResult(job, currentIteration, totalTokens, totalCostUsd)
        }

        const pmInput: ProjectManagerAgentInput = {
          keyword: job.keyword,
          article: writerOutput,
          seoData: seoOutput ?? undefined,
          qaData: qaOutput ?? undefined,
          settings: settings ?? {},
        }

        const pmResult = await this.runAgentWithRetry('project_manager', pmInput, job, currentIteration)
        if (!pmResult.success || !pmResult.output) {
          return this.failJob(job, pmResult.error ?? 'Project Manager failed', currentIteration, totalTokens, totalCostUsd)
        }
        totalTokens += pmResult.usage.totalTokens
        totalCostUsd += pmResult.estimatedCostUsd ?? 0
        pmOutput = pmResult.output as ProjectManagerOutput

        consola.info(`[AIOrchestrator] PM complete. Ready for publish: ${pmOutput.readyForPublish}`)
      }

      // Build final output with PM data if available
      const finalOutput = pmOutput ?? {
        readyForPublish: false,
        validationErrors: ['Project Manager agent was skipped'],
        finalArticle: {
          title: writerOutput?.title ?? job.keyword,
          slug: writerOutput?.slug ?? '',
          content: writerOutput?.content ?? '',
          excerpt: writerOutput?.excerpt ?? '',
          metaTitle: seoOutput?.metaTitle ?? writerOutput?.title ?? '',
          metaDescription: seoOutput?.metaDescription ?? '',
          schemaMarkup: seoOutput?.schemaMarkup ?? {},
          template: settings?.template ?? 'article',
          status: 'draft' as const,
          focusKeyword: job.keyword,
          wordCount: writerOutput?.wordCount ?? 0,
        },
        summary: 'Article assembled without Project Manager validation',
        recommendations: [],
      }

      // Stage 6: Image Generation (if enabled, runs after PM, before auto-post)
      let imageOutput: ImageGeneratorOutput | null = null
      const shouldGenerateImages = settings?.generateImages && 
        !settings?.skipAgents?.includes('image_generator') &&
        writerOutput

      if (shouldGenerateImages) {
        try {
          if (await this.checkCancelled(job.id)) {
            return this.cancelledResult(job, currentIteration, totalTokens, totalCostUsd)
          }

          consola.info(`[AIOrchestrator] Starting image generation...`)
          this.callbacks.onProgress?.('image_generator', 'Generating images for article headings...')

          const imageInput = {
            keyword: job.keyword,
            article: writerOutput,
            settings: {
              generateImages: true,
              maxImages: settings.maxImages ?? 3,
              imageStyle: settings.imageStyle ?? 'natural',
              imageModel: settings.imageModel ?? 'dall-e-3',
            },
          }

          const imageResult = await this.runAgentWithRetry('image_generator', imageInput, job, currentIteration)

          if (imageResult.success && imageResult.output) {
            imageOutput = imageResult.output as ImageGeneratorOutput
            totalTokens += imageResult.usage.totalTokens
            totalCostUsd += imageResult.estimatedCostUsd ?? 0
            consola.info(`[AIOrchestrator] Image generation complete: ${imageOutput.successfulImages}/${imageOutput.totalImages} images, $${imageOutput.totalCost.toFixed(4)}`)
            this.callbacks.onProgress?.('image_generator', `Generated ${imageOutput.successfulImages} images`, { 
              total: imageOutput.totalImages,
              successful: imageOutput.successfulImages,
              cost: imageOutput.totalCost,
            })
          } else {
            consola.warn(`[AIOrchestrator] Image generation failed (non-blocking): ${imageResult.error}`)
            this.callbacks.onProgress?.('image_generator', `Image generation skipped: ${imageResult.error}`)
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          consola.error(`[AIOrchestrator] Image generation error (non-blocking): ${message}`)
          this.callbacks.onProgress?.('image_generator', `Image generation error: ${message}`)
        }
      }

      // Build combined final output with image data
      const finalOutputWithImages = {
        ...finalOutput,
        imageGeneratorOutput: imageOutput,
      }

      // Stage 7: Auto-Post (if enabled)
      let pageId: string | undefined

      if (settings?.autoPost && finalOutputWithImages.readyForPublish) {
        consola.info(`[AIOrchestrator] Auto-post enabled, creating page...`)
        this.callbacks.onProgress?.('project_manager', 'Creating CMS page...')

        const pageResult = await this.createPageFromArticle(finalOutputWithImages, settings, job.id, job.keyword, imageOutput)
        if (pageResult.success && pageResult.pageId) {
          pageId = pageResult.pageId
          consola.success(`[AIOrchestrator] Page created: ${pageId}`)
          this.callbacks.onProgress?.('project_manager', 'Page created successfully', { pageId })
        } else {
          consola.warn(`[AIOrchestrator] Auto-post failed: ${pageResult.error}`)
          this.callbacks.onProgress?.('project_manager', `Auto-post failed: ${pageResult.error}`)
        }
      } else if (settings?.autoPost && !finalOutputWithImages.readyForPublish) {
        consola.info(`[AIOrchestrator] Auto-post skipped: article not ready for publish`)
        this.callbacks.onProgress?.('project_manager', 'Auto-post skipped: article has validation errors')
      }

      await this.jobRepo.setFinalOutput(job.id, finalOutputWithImages, pageId)
      await this.jobRepo.updateProgress(job.id, {
        progressPercent: 100,
        currentAgent: null,
        totalTokensUsed: totalTokens,
        estimatedCostUsd: totalCostUsd,
      })

      consola.success(`[AIOrchestrator] Job ${job.id} completed in ${currentIteration} iteration(s). Cost: $${totalCostUsd.toFixed(4)}`)

      const updatedJob = await this.jobRepo.findById(job.id)
      return {
        success: true,
        job: updatedJob!,
        iterations: currentIteration,
        totalTokens,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      consola.error(`[AIOrchestrator] Job ${job.id} failed: ${message}`)
      return this.failJob(job, message, currentIteration, totalTokens, totalCostUsd)
    }
  }

  /**
   * Check if job has been cancelled
   */
  private async checkCancelled(jobId: string): Promise<boolean> {
    const cancelled = await this.jobRepo.isCancelled(jobId)
    if (cancelled) {
      consola.info(`[AIOrchestrator] Job ${jobId} was cancelled`)
      this.callbacks.onCancelled?.()
    }
    return cancelled
  }

  /**
   * Return cancelled result
   */
  private async cancelledResult(
    job: AIArticleJobRow,
    iterations: number,
    totalTokens: number,
    totalCostUsd: number
  ): Promise<PipelineResult> {
    await this.jobRepo.updateProgress(job.id, {
      currentAgent: null,
      totalTokensUsed: totalTokens,
      estimatedCostUsd: totalCostUsd,
    })
    const updatedJob = await this.jobRepo.findById(job.id)
    return {
      success: false,
      job: updatedJob!,
      iterations,
      totalTokens,
      cancelled: true,
    }
  }

  /**
   * Run a single agent with retry logic for transient failures
   */
  private async runAgentWithRetry(
    agentType: AIAgentType,
    input: unknown,
    job: AIArticleJobRow,
    iteration: number
  ): Promise<AgentResult> {
    return withRetry(
      () => this.runAgent(agentType, input, job, iteration),
      {
        maxRetries: 2,
        baseDelayMs: 2000,
        isRetryable: (error) => {
          // Retry on rate limits and network errors
          if (!error || typeof error !== 'object') return false
          const err = error as { status?: number; message?: string }
          if (err.status === 429) return true
          if (err.message?.toLowerCase().includes('rate limit')) return true
          if (err.message?.toLowerCase().includes('network')) return true
          if (err.message?.toLowerCase().includes('timeout')) return true
          return false
        },
      }
    )
  }

  /**
   * Run a single agent with step recording
   */
  private async runAgent(
    agentType: AIAgentType,
    input: unknown,
    job: AIArticleJobRow,
    iteration: number
  ): Promise<AgentResult> {
    const agent = AgentRegistry.get(agentType)
    if (!agent) {
      return {
        success: false,
        output: null,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        error: `Agent not found: ${agentType}`,
        continueToNext: false,
      }
    }

    // Get persona for this agent
    const persona = await this.getPersonaForAgent(agentType, job)
    if (!persona) {
      return {
        success: false,
        output: null,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        error: `No persona found for agent: ${agentType}`,
        continueToNext: false,
      }
    }

    // Capture persona snapshot for historical reference
    const personaSnapshot: PersonaSnapshot = {
      id: persona.id,
      agent_type: persona.agent_type,
      name: persona.name,
      description: persona.description,
      system_prompt: persona.system_prompt,
      provider: persona.provider,
      model: persona.model,
      temperature: persona.temperature,
      max_tokens: persona.max_tokens,
      metadata: persona.metadata,
    }

    // Create job step record
    const step = await this.stepRepo.create({
      jobId: job.id,
      agentType,
      personaId: persona.id,
      personaSnapshot,
      iteration,
      input,
    })

    // Update job progress
    await this.jobRepo.updateProgress(job.id, { currentAgent: agentType })
    this.callbacks.onAgentStart?.(agentType, iteration)

    // Start step
    await this.stepRepo.start(step.id)

    // Build agent context with logging
    const context = this.buildContext(job, persona, iteration, step.id)

    try {
      // Validate input
      if (!agent.validateInput(input)) {
        throw new Error(`Invalid input for ${agentType} agent`)
      }

      // Execute agent
      const result = await agent.execute(input, context)

      // Record step completion
      if (result.success) {
        await this.stepRepo.complete(step.id, {
          output: result.output,
          tokensUsed: result.usage.totalTokens,
          promptTokens: result.usage.inputTokens,
          completionTokens: result.usage.outputTokens,
        })
      } else {
        await this.stepRepo.fail(step.id, result.error ?? 'Unknown error')
      }

      this.callbacks.onAgentComplete?.(agentType, iteration, result)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      await this.stepRepo.fail(step.id, message, error)
      return {
        success: false,
        output: null,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        error: message,
        continueToNext: false,
      }
    }
  }

  /**
   * Get persona for an agent type (with job setting overrides)
   */
  private async getPersonaForAgent(agentType: AIAgentType, job: AIArticleJobRow): Promise<AIPersonaRow | null> {
    const settings = job.settings as { personaOverrides?: Record<string, string> } | null
    const overrideId = settings?.personaOverrides?.[agentType]

    if (overrideId) {
      const persona = await this.personaRepo.findById(overrideId)
      if (persona) return persona
    }

    return this.personaRepo.findDefault(agentType)
  }

  /**
   * Build agent context with logging callbacks
   */
  private buildContext(
    job: AIArticleJobRow,
    persona: AIPersonaRow,
    iteration: number,
    stepId: string
  ): AgentContext {
    const log = async (
      level: 'debug' | 'info' | 'warn' | 'error',
      message: string,
      data?: unknown
    ) => {
      const entry: StepLogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
      }

      // Append to step logs (fire and forget)
      this.stepRepo.appendLog(stepId, entry).catch(err => {
        consola.warn('[AIOrchestrator] Failed to append log:', err)
      })

      // Also log to console in dev
      if (import.meta.dev) {
        const logFn = level === 'error' ? consola.error
          : level === 'warn' ? consola.warn
            : level === 'info' ? consola.info
              : consola.debug
        logFn(`[${persona.agent_type}] ${message}`, data)
      }
    }

    const onProgress = (message: string, data?: unknown) => {
      this.callbacks.onProgress?.(persona.agent_type as AIAgentType, message, data)
    }

    return {
      client: this.client,
      llmProvider: this.llmProvider,
      job,
      persona,
      iteration,
      stepId,
      log,
      onProgress,
      openaiApiKey: this.apiKeys.openaiApiKey,
      exaApiKey: this.apiKeys.exaApiKey,
      dataforseoApiKey: this.apiKeys.dataforseoApiKey,
      heliconeApiKey: this.apiKeys.heliconeApiKey,
    }
  }

  private markdownToHtml(markdown: string): string {
    if (!markdown) return ''

    marked.setOptions({
      gfm: true,
      breaks: false,
      pedantic: false,
    })

    return marked.parse(markdown, { async: false }) as string
  }

  /** Must match ArticleTemplate.vue and publish.post.ts slugify for image-heading matching */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  private injectImagesIntoMarkdown(markdown: string, images: Array<{ status: string; headingText: string; thumbnailUrl?: string; imageAlt?: string }>): string {
    if (!markdown || images.length === 0) return markdown

    const successfulImages = images.filter(img => img.status === 'success' && img.thumbnailUrl)
    if (successfulImages.length === 0) return markdown

    return markdown.replace(/^(## .+)$/gm, (match, heading) => {
      const headingText = heading.replace(/^## /, '').trim()
      const headingSlug = this.slugify(headingText)
      const image = successfulImages.find(img => this.slugify(img.headingText) === headingSlug)

      if (!image || !image.thumbnailUrl) return match

      return `${match}\n\n![${image.imageAlt || headingText}](${image.thumbnailUrl})\n`
    })
  }

  /**
   * Create a CMS page from the final article output
   *
   * @param output - ProjectManagerOutput containing the final article data
   * @param settings - Job settings (for parentPageId and other options)
   * @param jobId - The job ID for metadata tracking
   * @param keyword - The target keyword for fallback values
   * @returns Object with success status, pageId (if created), and error message (if failed)
   */
  private async createPageFromArticle(
    output: ProjectManagerOutput,
    settings: AIArticleJobSettings,
    jobId: string,
    keyword: string,
    imageOutput?: ImageGeneratorOutput | null
  ): Promise<{ success: boolean; pageId?: string; error?: string }> {
    try {
      const { finalArticle } = output

      const contentWithImages = this.injectImagesIntoMarkdown(finalArticle.content, imageOutput?.images ?? [])
      const htmlContent = this.markdownToHtml(contentWithImages)

      // Build meta keywords from focus keyword
      const metaKeywords: string[] = []
      if (finalArticle.focusKeyword) {
        metaKeywords.push(finalArticle.focusKeyword)
      }

      const parentId = settings.parentPageId ?? null
      const uniqueSlug = await this.pageService.generateUniqueSlug(finalArticle.slug, parentId)

      const pageData: CreatePageData = {
        title: finalArticle.title,
        slug: uniqueSlug,
        content: htmlContent,
        description: finalArticle.excerpt,
        template: finalArticle.template as TemplateSlug,
        status: finalArticle.status,
        metaTitle: finalArticle.metaTitle,
        metaDescription: finalArticle.metaDescription,
        metaKeywords: metaKeywords.length > 0 ? metaKeywords : [keyword],
        focusKeyword: finalArticle.focusKeyword || keyword,
        parentId,
        // Schema.org type - Article for AI-generated content
        schemaType: 'Article',
        // Sitemap defaults for articles
        sitemapChangefreq: 'monthly',
        sitemapPriority: 0.7,
        // Store schema markup and AI metadata
        metadata: {
          seo: {
            schemaMarkup: finalArticle.schemaMarkup,
          },
          aiGenerated: true,
          aiJobId: jobId,
        },
      }

      const page = await this.pageService.createPage(pageData)

      return {
        success: true,
        pageId: page.id,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error creating page'
      consola.error(`[AIOrchestrator] Failed to create page: ${message}`)
      return {
        success: false,
        error: message,
      }
    }
  }

  /**
   * Mark job as failed
   */
  private async failJob(
    job: AIArticleJobRow,
    error: string,
    iterations: number,
    totalTokens: number,
    totalCostUsd: number
  ): Promise<PipelineResult> {
    await this.jobRepo.setStatus(job.id, 'failed', { error, completedAt: true })
    await this.jobRepo.updateProgress(job.id, {
      currentAgent: null,
      totalTokensUsed: totalTokens,
      estimatedCostUsd: totalCostUsd,
    })

    const updatedJob = await this.jobRepo.findById(job.id)
    return {
      success: false,
      job: updatedJob!,
      error,
      iterations,
      totalTokens,
    }
  }
}

// Re-export for backwards compatibility during migration
export { AIOrchestrator as ArticlePipelineOrchestrator }

