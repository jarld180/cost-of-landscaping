/**
 * POST /api/admin/article-keywords/batch-queue
 * Queue all pending keywords for AI article generation.
 * Optional body: { limit: number } to cap how many to queue at once.
 */

import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import { AIJobQueueService } from '../../../services/AIJobQueueService'

export default defineEventHandler(async (event) => {
  const userId = await requireAdmin(event)
  const body = await readBody(event).catch(() => ({}))
  const batchLimit = Math.min(Math.max(Number(body?.limit) || 50, 1), 200)

  const authClient = await serverSupabaseClient(event)

  // Fetch pending keywords ordered by priority
  const { data: keywords, error } = await authClient
    .from('article_keywords')
    .select('id, keyword, secondary_keywords, article_context, priority')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .limit(batchLimit)

  if (error) throw createError({ statusCode: 500, message: 'Failed to fetch keywords' })
  if (!keywords || keywords.length === 0) {
    return { success: true, queued: 0, message: 'No pending keywords to queue.' }
  }

  const queueService = new AIJobQueueService(authClient)

  let queued = 0
  const baseUrl = getRequestURL(event).origin

  for (const kw of keywords) {
    try {
      const job = await queueService.createJob({
        keyword: kw.keyword,
        settings: {
          autoPost: true,
          targetWordCount: 1200,
          maxIterations: 3,
          template: 'article',
          parentPageId: '00000000-0000-4000-a000-000000000001', // /blog hub page
          articleContext: kw.article_context || undefined,
          secondaryKeywords: kw.secondary_keywords || undefined,
          generateImages: false,
          maxImages: 0,
          imageStyle: 'natural',
          imageModel: 'dall-e-3'
        },
        priority: kw.priority ?? 50,
        createdBy: userId
      })

      // Mark as queued with job reference
      await authClient
        .from('article_keywords')
        .update({ status: 'queued', job_id: job.id, queued_at: new Date().toISOString() })
        .eq('id', kw.id)

      // Fire execution async
      $fetch(`${baseUrl}/api/ai/articles/${job.id}/execute`, {
        method: 'POST',
        headers: { cookie: getHeader(event, 'cookie') || '' }
      }).catch(() => {})

      queued++
      // Brief rate limiting between job creations
      await new Promise(r => setTimeout(r, 200))
    } catch {
      // Continue on individual failures
    }
  }

  return {
    success: true,
    queued,
    total: keywords.length,
    message: `Queued ${queued} article generation jobs.`
  }
})
