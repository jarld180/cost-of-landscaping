/**
 * GET /api/ai/stats
 *
 * Get AI article job statistics and eval analytics for the dashboard.
 * Requires admin authentication.
 *
 * @returns {Object} Job counts, eval averages, common issues, golden example counts
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { AIEvalRepository } from '../../repositories/AIEvalRepository'
import { AIGoldenExampleRepository } from '../../repositories/AIGoldenExampleRepository'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    await requireAdmin(event)

    const client = await serverSupabaseClient(event)

    // Get counts for each status using parallel queries
    const [
      { count: totalCount },
      { count: pendingCount },
      { count: processingCount },
      { count: completedCount },
      { count: failedCount },
      { count: cancelledCount },
    ] = await Promise.all([
      client.from('ai_article_jobs').select('*', { count: 'exact', head: true }),
      client.from('ai_article_jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      client.from('ai_article_jobs').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
      client.from('ai_article_jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      client.from('ai_article_jobs').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      client.from('ai_article_jobs').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    ])

    // Fetch eval analytics for continuous improvement insights
    const evalRepo = new AIEvalRepository(client)
    const goldenRepo = new AIGoldenExampleRepository(client)

    // Run eval queries in parallel
    const [avgScores, commonIssues, goldenExamples] = await Promise.all([
      evalRepo.getAverageScores(30).catch(() => null),
      evalRepo.getCommonIssues({ limit: 10, daysBack: 30 }).catch(() => []),
      goldenRepo.findAll({ isActive: true, limit: 100 }).catch(() => ({ examples: [], total: 0 })),
    ])

    // Group golden examples by agent type
    const goldenByAgent = {
      research: goldenExamples.examples.filter(e => e.agent_type === 'research').length,
      writer: goldenExamples.examples.filter(e => e.agent_type === 'writer').length,
      seo: goldenExamples.examples.filter(e => e.agent_type === 'seo').length,
      qa: goldenExamples.examples.filter(e => e.agent_type === 'qa').length,
      project_manager: goldenExamples.examples.filter(e => e.agent_type === 'project_manager').length,
    }

    return {
      success: true,
      stats: {
        total: totalCount ?? 0,
        pending: pendingCount ?? 0,
        processing: processingCount ?? 0,
        completed: completedCount ?? 0,
        failed: failedCount ?? 0,
        cancelled: cancelledCount ?? 0,
      },
      evalAnalytics: {
        averageScores: avgScores,
        commonIssues,
        goldenExamplesCount: goldenExamples.total,
        goldenByAgent,
      },
    }
  } catch (error) {
    if (import.meta.dev) {
      consola.error('GET /api/ai/stats - Error:', error)
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to fetch AI stats',
    })
  }
})

