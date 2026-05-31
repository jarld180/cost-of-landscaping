/**
 * POST /api/admin/listicle-seed
 * Bulk-writes AI-generated listicle content to city_listicle_content.
 * Auth: X-Service-Key header must equal the Supabase service role key.
 */

import { serverSupabaseServiceRole } from '#supabase/server'

interface SeedRow {
  city_id: string
  intro_html: string
  closing_html: string
  faqs: Array<{ question: string; answer: string }>
  word_count: number
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const serviceKey = config.supabaseSecretKey as string

  const authHeader = getHeader(event, 'x-service-key')
  if (!authHeader || authHeader !== serviceKey) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<SeedRow>(event)
  if (!body?.city_id || !body?.intro_html) {
    throw createError({ statusCode: 400, message: 'Missing required fields' })
  }

  const client = serverSupabaseServiceRole(event)
  const { error } = await client.from('city_listicle_content').upsert({
    city_id: body.city_id,
    intro_html: body.intro_html,
    closing_html: body.closing_html || '',
    faqs: body.faqs || [],
    word_count: body.word_count || 0,
    status: 'published',
    generated_at: new Date().toISOString(),
  }, { onConflict: 'city_id' })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { ok: true }
})
