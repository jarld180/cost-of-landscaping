import { serverSupabaseClient } from '#supabase/server'
import { bulkUpdateContractorSchema } from '../../schemas/contractor.schemas'
import { requireAdmin } from '../../utils/auth'
import { applyContractorFilters } from '../../utils/contractorFilters'
import type { Database } from '../../../app/types/supabase'
import { consola } from 'consola'

// Cap at 100 for safety (even if env var is higher)
const MAX_BULK_ITEMS = 100

interface FailedItem {
  id: string
  reason: string
}

interface BulkUpdateResponse {
  success: true
  data: {
    total: number
    succeeded: string[]
    failed: FailedItem[]
  }
}

export default defineEventHandler(async (event): Promise<BulkUpdateResponse> => {
  await requireAdmin(event)

   const body = await readBody(event)

   if (import.meta.dev) {
     consola.info('[bulk-update] Request received:', {
       hasIds: !!body.ids,
       idsCount: body.ids?.length,
       hasFilters: !!body.filters,
       filters: body.filters,
       status: body.status,
     })
   }

   const parseResult = bulkUpdateContractorSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Invalid request data',
      data: parseResult.error.issues,
    })
  }

  const { ids, filters, status } = parseResult.data
  const client = await serverSupabaseClient<Database>(event)

  let targetIds: string[]

  if (filters) {
    const countQuery = client.from('contractors').select('id', { count: 'exact', head: true })
    const filteredCountQuery = applyContractorFilters(countQuery, filters)
    const { count, error: countError } = await filteredCountQuery

     if (countError) {
       if (import.meta.dev) {
         consola.error('[bulk-update] Count query failed:', countError)
       }
       throw createError({
         statusCode: 500,
         statusMessage: 'Internal Server Error',
         message: 'Failed to count contractors',
       })
     }

    const matchCount = count ?? 0

    if (matchCount > MAX_BULK_ITEMS) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Too many contractors (${matchCount}). Maximum ${MAX_BULK_ITEMS} allowed.`,
      })
    }

    if (matchCount === 0) {
      return {
        success: true,
        data: {
          total: 0,
          succeeded: [],
          failed: [],
        },
      }
    }

    const idsQuery = client.from('contractors').select('id')
    const filteredIdsQuery = applyContractorFilters(idsQuery, filters)
    const { data: idsData, error: idsError } = await filteredIdsQuery.limit(MAX_BULK_ITEMS)

     if (idsError || !idsData) {
       if (import.meta.dev) {
         consola.error('[bulk-update] IDs fetch failed:', idsError)
       }
       throw createError({
         statusCode: 500,
         statusMessage: 'Internal Server Error',
         message: 'Failed to fetch contractor IDs',
       })
     }

    targetIds = idsData.map((row) => row.id)
  } else {
    targetIds = ids!
  }

  const { data: prefetchData, error: prefetchError } = await client
    .from('contractors')
    .select('id, status, deleted_at')
    .in('id', targetIds)

   if (prefetchError) {
     if (import.meta.dev) {
       consola.error('[bulk-update] Prefetch failed:', prefetchError)
     }
     throw createError({
       statusCode: 500,
       statusMessage: 'Internal Server Error',
       message: 'Failed to fetch contractors',
     })
   }

  const existingMap = new Map(prefetchData?.map((c) => [c.id, c]) ?? [])
  const validIds: string[] = []
  const failed: FailedItem[] = []

  for (const id of targetIds) {
    const contractor = existingMap.get(id)

    if (!contractor) {
      failed.push({ id, reason: 'Contractor not found' })
      continue
    }

    if (contractor.deleted_at) {
      failed.push({ id, reason: 'Contractor already deleted' })
      continue
    }

    validIds.push(id)
  }

  let succeeded: string[] = []

  if (validIds.length > 0) {
    const { data: updateData, error: updateError } = await client
      .from('contractors')
      .update({ status })
      .in('id', validIds)
      .is('deleted_at', null)
      .select('id')

     if (updateError) {
       if (import.meta.dev) {
         consola.error('[bulk-update] Update query failed:', updateError)
       }
       throw createError({
         statusCode: 500,
         statusMessage: 'Internal Server Error',
         message: 'Failed to update contractors',
       })
     }

    const updatedIds = new Set(updateData?.map((c) => c.id) ?? [])
    
    for (const id of validIds) {
      if (updatedIds.has(id)) {
        succeeded.push(id)
      } else {
        failed.push({ id, reason: 'Contractor not found' })
      }
    }
  }

  return {
    success: true,
    data: {
      total: targetIds.length,
      succeeded,
      failed,
    },
  }
})
