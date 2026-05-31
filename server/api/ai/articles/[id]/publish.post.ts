/**
 * POST /api/ai/articles/[id]/publish
 *
 * Publish a completed AI article job to the CMS as a page.
 * Requires admin authentication.
 *
 * @returns {Object} Created page info
 */

import { consola } from 'consola'
import { marked } from 'marked'
import { serverSupabaseClient } from '#supabase/server'
import { AIJobQueueService } from '../../../../services/AIJobQueueService'
import { PageService, type CreatePageData, type TemplateSlug } from '../../../../services/PageService'
import type { AIFinalOutput, GeneratedImage } from '../../../../schemas/ai.schemas'
import { requireAdmin } from '../../../../utils/auth'

/**
 * Convert markdown content to HTML for TipTap editor
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return ''

  // Configure marked for clean HTML output
  marked.setOptions({
    gfm: true,
    breaks: false,
    pedantic: false,
  })

  return marked.parse(markdown, { async: false }) as string
}

/** Must match ArticleTemplate.vue slugify for image-heading matching */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function injectImagesIntoMarkdown(markdown: string, images: GeneratedImage[]): string {
  if (!markdown || images.length === 0) return markdown

  const successfulImages = images.filter(img => img.status === 'success' && img.thumbnailUrl)
  if (successfulImages.length === 0) return markdown

  return markdown.replace(/^(## .+)$/gm, (match, heading) => {
    const headingText = heading.replace(/^## /, '').trim()
    const headingSlug = slugify(headingText)
    const image = successfulImages.find(img => slugify(img.headingText) === headingSlug)

    if (!image || !image.thumbnailUrl) return match

    return `${match}\n\n![${image.imageAlt || headingText}](${image.thumbnailUrl})\n`
  })
}

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    await requireAdmin(event)
    const jobId = getRouterParam(event, 'id')

    if (!jobId) {
      throw createError({ statusCode: 400, message: 'Job ID is required' })
    }

    // Parse optional body for overrides
    const body = await readBody(event).catch(() => ({}))
    const { parentPageId, status = 'draft' } = body as { parentPageId?: string; status?: 'draft' | 'published' }

    // Get Supabase client and services
    const client = await serverSupabaseClient(event)
    const queueService = new AIJobQueueService(client)
    const pageService = new PageService(client)

    // Get job
    const job = await queueService.getJob(jobId)
    if (!job) {
      throw createError({ statusCode: 404, message: 'Job not found' })
    }

    // Validate job is completed
    if (job.status !== 'completed') {
      throw createError({ statusCode: 400, message: 'Job must be completed before publishing' })
    }

    // Check if already published
    if (job.page_id) {
      throw createError({ statusCode: 400, message: 'Job already has a published page' })
    }

    const finalOutput = job.final_output as AIFinalOutput | null
    if (!finalOutput?.finalArticle) {
      throw createError({ statusCode: 400, message: 'Job has no final article output' })
    }

    const aiImages = finalOutput.imageGeneratorOutput?.images ?? []

    consola.info(`[POST /api/ai/articles/${jobId}/publish] Publishing article...`)

    // Create page from final output
    const { finalArticle } = finalOutput
    const jobSettings = job.settings as { parentPageId?: string; relatedKeywords?: string[] } | null

    // Build meta keywords from focus keyword + any related keywords from research
    const metaKeywords: string[] = []
    if (finalArticle.focusKeyword) {
      metaKeywords.push(finalArticle.focusKeyword)
    }
    // Add related keywords if stored in job settings/metadata
    if (job.metadata && typeof job.metadata === 'object' && 'relatedKeywords' in job.metadata) {
      const related = (job.metadata as { relatedKeywords?: string[] }).relatedKeywords
      if (Array.isArray(related)) {
        metaKeywords.push(...related.slice(0, 5)) // Add up to 5 related keywords
      }
    }

    const contentWithImages = injectImagesIntoMarkdown(finalArticle.content, aiImages)
    const htmlContent = markdownToHtml(contentWithImages)

    const parentId = parentPageId ?? jobSettings?.parentPageId ?? null
    const uniqueSlug = await pageService.generateUniqueSlug(finalArticle.slug, parentId)

    const pageData: CreatePageData = {
      title: finalArticle.title,
      slug: uniqueSlug,
      content: htmlContent,
      description: finalArticle.excerpt,
      template: (finalArticle.template || 'article') as TemplateSlug,
      status: status, // Use provided status or default to draft
      metaTitle: finalArticle.metaTitle,
      metaDescription: finalArticle.metaDescription,
      metaKeywords: metaKeywords.length > 0 ? metaKeywords : [job.keyword], // Default to job keyword
      focusKeyword: finalArticle.focusKeyword || job.keyword,
      parentId,
      // Schema.org type - Article for AI-generated content
      schemaType: 'Article',
      // Sitemap defaults for articles
      sitemapChangefreq: 'monthly',
      sitemapPriority: 0.7,
      metadata: {
        seo: {
          schemaMarkup: finalArticle.schemaMarkup,
        },
        aiGenerated: true,
        aiJobId: jobId,
      },
    }

    const page = await pageService.createPage(pageData)

    // Update job with page_id
    await client
      .from('ai_article_jobs')
      .update({ page_id: page.id })
      .eq('id', jobId)

    consola.success(`[POST /api/ai/articles/${jobId}/publish] Page created: ${page.id}`)

    return {
      success: true,
      pageId: page.id,
      pagePath: page.full_path,
    }
  } catch (error) {
    consola.error('POST /api/ai/articles/[id]/publish - Error:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({ statusCode: 500, message: 'Failed to publish article' })
  }
})

