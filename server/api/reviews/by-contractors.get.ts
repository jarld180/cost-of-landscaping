import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdmin } from '../../utils/auth'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  
  const query = getQuery(event)
  const contractorIdsParam = query.contractorIds as string
  const limitParam = query.limit as string
  
  if (!contractorIdsParam) {
    throw createError({ statusCode: 400, message: 'contractorIds parameter required' })
  }
  
  const contractorIds = contractorIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0)
  const limit = limitParam ? parseInt(limitParam, 10) : 20
  
  if (contractorIds.length === 0) {
    return { success: true, data: [], total: 0 }
  }
  
  const client = await serverSupabaseClient(event)
  
  const { count } = await client
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .in('contractor_id', contractorIds)
  
  const { data, error } = await client
    .from('reviews')
    .select('id, reviewer_name, stars, published_at, contractor_id')
    .in('contractor_id', contractorIds)
    .order('published_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }
  
  return { success: true, data: data || [], total: count || 0 }
})
