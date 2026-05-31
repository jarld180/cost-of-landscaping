/**
 * AI Eval Repository
 *
 * Data access layer for ai_article_evals table.
 * Handles CRUD operations for article evaluation scores (automated and human).
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import type {
  AIArticleEvalRow,
  AIArticleEvalInsert,
  AIArticleEvalUpdate,
  AIEvalType,
  EvalDimensionScores,
  EvalIssue,
} from '../schemas/ai.schemas'

export class AIEvalRepository {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * Create a new evaluation
   */
  async create(data: {
    jobId: string
    stepId?: string
    evalType: AIEvalType
    iteration?: number
    overallScore?: number
    dimensionScores?: EvalDimensionScores
    passed?: boolean
    issues?: EvalIssue[]
    feedback?: string
  }): Promise<AIArticleEvalRow> {
    consola.debug(`Creating ${data.evalType} eval for job ${data.jobId}`)

    const insertData: AIArticleEvalInsert = {
      job_id: data.jobId,
      step_id: data.stepId ?? null,
      eval_type: data.evalType,
      iteration: data.iteration ?? 1,
      overall_score: data.overallScore ?? null,
      readability_score: data.dimensionScores?.readability ?? null,
      seo_score: data.dimensionScores?.seo ?? null,
      accuracy_score: data.dimensionScores?.accuracy ?? null,
      engagement_score: data.dimensionScores?.engagement ?? null,
      brand_voice_score: data.dimensionScores?.brandVoice ?? null,
      passed: data.passed ?? null,
      issues: (data.issues ?? []) as AIArticleEvalInsert['issues'],
      feedback: data.feedback ?? null,
    }

    const { data: evalRecord, error } = await this.client
      .from('ai_article_evals')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      consola.error('Failed to create eval:', error)
      throw error
    }

    return evalRecord
  }

  /**
   * Find eval by ID
   */
  async findById(id: string): Promise<AIArticleEvalRow | null> {
    const { data, error } = await this.client
      .from('ai_article_evals')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Find all evals for a job
   */
  async findByJobId(jobId: string): Promise<AIArticleEvalRow[]> {
    const { data, error } = await this.client
      .from('ai_article_evals')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Find latest eval for a job
   */
  async findLatest(jobId: string, evalType?: AIEvalType): Promise<AIArticleEvalRow | null> {
    let query = this.client
      .from('ai_article_evals')
      .select('*')
      .eq('job_id', jobId)

    if (evalType) {
      query = query.eq('eval_type', evalType)
    }

    const { data, error } = await query
      .order('iteration', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Add human rating to an eval
   */
  async addHumanRating(id: string, data: {
    overallScore: number
    dimensionScores?: EvalDimensionScores
    feedback?: string
    ratedBy: string
  }): Promise<AIArticleEvalRow> {
    const updateData: AIArticleEvalUpdate = {
      overall_score: data.overallScore,
      feedback: data.feedback ?? null,
      rated_by: data.ratedBy,
      rated_at: new Date().toISOString(),
    }

    if (data.dimensionScores) {
      updateData.readability_score = data.dimensionScores.readability
      updateData.seo_score = data.dimensionScores.seo
      updateData.accuracy_score = data.dimensionScores.accuracy
      updateData.engagement_score = data.dimensionScores.engagement
      updateData.brand_voice_score = data.dimensionScores.brandVoice
    }

    const { data: evalRecord, error } = await this.client
      .from('ai_article_evals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return evalRecord
  }

  /**
   * Get aggregated issue statistics for continuous improvement
   * Returns top issues by frequency from recent evals
   */
  async getCommonIssues(options: {
    limit?: number
    daysBack?: number
    minSeverity?: 'low' | 'medium' | 'high' | 'critical'
  } = {}): Promise<{ category: string; description: string; count: number; avgSeverity: string }[]> {
    const { limit = 10, daysBack = 30 } = options
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)

    // Fetch recent evals with issues
    const { data, error } = await this.client
      .from('ai_article_evals')
      .select('issues')
      .gte('created_at', cutoffDate.toISOString())
      .not('issues', 'eq', '[]')

    if (error) throw error
    if (!data || data.length === 0) return []

    // Aggregate issues by description pattern
    const issueMap = new Map<string, { category: string; count: number; severities: string[] }>()

    for (const row of data) {
      const issues = row.issues as EvalIssue[] | null
      if (!issues) continue

      for (const issue of issues) {
        // Normalize description for grouping (lowercase, trim whitespace)
        const key = `${issue.category}:${issue.description.toLowerCase().slice(0, 100)}`

        if (issueMap.has(key)) {
          const entry = issueMap.get(key)!
          entry.count++
          entry.severities.push(issue.severity)
        } else {
          issueMap.set(key, {
            category: issue.category,
            count: 1,
            severities: [issue.severity],
          })
        }
      }
    }

    // Convert to array and sort by frequency
    const severityRank = { critical: 4, high: 3, medium: 2, low: 1 }
    const result = Array.from(issueMap.entries())
      .map(([key, value]) => {
        const description = key.split(':').slice(1).join(':')
        const avgSeverityNum = value.severities.reduce((sum, s) => sum + (severityRank[s as keyof typeof severityRank] || 1), 0) / value.severities.length
        const avgSeverity = avgSeverityNum >= 3.5 ? 'critical' : avgSeverityNum >= 2.5 ? 'high' : avgSeverityNum >= 1.5 ? 'medium' : 'low'
        return {
          category: value.category,
          description,
          count: value.count,
          avgSeverity,
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return result
  }

  /**
   * Get average dimension scores over time for trend analysis
   */
  async getAverageScores(daysBack = 30): Promise<{
    overall: number
    readability: number
    seo: number
    accuracy: number
    engagement: number
    brandVoice: number
    sampleCount: number
  } | null> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)

    const { data, error } = await this.client
      .from('ai_article_evals')
      .select('overall_score, readability_score, seo_score, accuracy_score, engagement_score, brand_voice_score')
      .gte('created_at', cutoffDate.toISOString())
      .not('overall_score', 'is', null)

    if (error) throw error
    if (!data || data.length === 0) return null

    const sum = (key: keyof typeof data[0]) =>
      data.reduce((acc, row) => acc + ((row[key] as number) || 0), 0) / data.length

    return {
      overall: Math.round(sum('overall_score')),
      readability: Math.round(sum('readability_score')),
      seo: Math.round(sum('seo_score')),
      accuracy: Math.round(sum('accuracy_score')),
      engagement: Math.round(sum('engagement_score')),
      brandVoice: Math.round(sum('brand_voice_score')),
      sampleCount: data.length,
    }
  }
}

