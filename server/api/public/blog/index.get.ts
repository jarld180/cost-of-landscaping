/**
 * GET /api/public/blog
 * List published article pages for the blog index.
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(24),
  offset: z.coerce.number().min(0).default(0),
  category: z.string().optional(), // maps to meta_keywords match
})

export default defineEventHandler(async (event) => {
  const rawQuery = getQuery(event)
  const { limit, offset } = querySchema.parse(rawQuery)

  const client = serverSupabaseServiceRole(event)

  const BLOG_PARENT_ID = '00000000-0000-4000-a000-000000000001'

  const { data, error, count } = await client
    .from('pages')
    .select('id, title, slug, full_path, description, og_image, meta_keywords, published_at, created_at, metadata', { count: 'exact' })
    .eq('template', 'article')
    .eq('status', 'published')
    .eq('parent_id', BLOG_PARENT_ID)
    .is('deleted_at', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (error) throw createError({ statusCode: 500, message: 'Failed to fetch articles' })

  return {
    articles: (data || []).map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      path: p.full_path,
      excerpt: p.description || '',
      image: p.og_image || null,
      tags: p.meta_keywords?.slice(0, 3) || [],
      publishedAt: p.published_at || p.created_at,
    })),
    total: count || 0,
    limit,
    offset,
    hasMore: (count || 0) > offset + limit,
  }
})
