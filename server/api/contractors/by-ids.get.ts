import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdmin } from '../../utils/auth'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  
  const query = getQuery(event)
  const idsParam = query.ids as string
  
  if (!idsParam) {
    throw createError({ statusCode: 400, message: 'ids parameter required' })
  }
  
  const ids = idsParam.split(',').map(id => id.trim()).filter(id => id.length > 0)
  
  if (ids.length === 0) {
    return { success: true, data: [] }
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('contractors')
    .select('id, company_name, slug')
    .in('id', ids)
  
  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }
  
  return { success: true, data }
})
