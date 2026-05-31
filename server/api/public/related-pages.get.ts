/**
 * GET /api/public/related-pages
 * Returns published sibling pages (same parent) for internal linking.
 * Falls back to most recent articles if no siblings.
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const currentPath = String(query.path || '')
  const limit = Math.min(Number(query.limit) || 5, 10)

  if (!currentPath) {
    throw createError({ statusCode: 400, message: 'path is required' })
  }

  const client = serverSupabaseServiceRole(event)

  // Find the current page's parent_id
  const { data: currentPage } = await client
    .from('pages')
    .select('id, parent_id')
    .eq('full_path', currentPath)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle()

  let pages: Array<{ title: string; full_path: string; meta_description: string | null }> = []

  if (currentPage?.parent_id) {
    // Fetch siblings (same parent, exclude self)
    const { data: siblings } = await client
      .from('pages')
      .select('title, full_path, meta_description')
      .eq('parent_id', currentPage.parent_id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .neq('id', currentPage.id)
      .order('published_at', { ascending: false })
      .limit(limit)

    pages = siblings || []
  }

  // If fewer than limit, top up with most recent published pages (not /admin or /owner)
  if (pages.length < limit) {
    const existing = new Set(pages.map(p => p.full_path))
    existing.add(currentPath)

    const { data: recent } = await client
      .from('pages')
      .select('title, full_path, meta_description')
      .eq('status', 'published')
      .is('deleted_at', null)
      .not('full_path', 'like', '/admin%')
      .not('full_path', 'like', '/owner%')
      .order('published_at', { ascending: false })
      .limit(limit + 5)

    for (const p of recent || []) {
      if (!existing.has(p.full_path) && pages.length < limit) {
        pages.push(p)
        existing.add(p.full_path)
      }
    }
  }

  return { pages }
})
