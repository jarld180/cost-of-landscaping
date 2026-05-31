import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/auth'
import { bulkDeleteContractorSchema } from '../../schemas/contractor.schemas'
import { applyContractorFilters } from '../../utils/contractorFilters'
import type { Database } from '../../../app/types/supabase'

// Cap at 100 for safety (even if env var is higher)
const MAX_BULK_DELETE = 100

interface FailedDelete {
  id: string
  reason: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)

  const parseResult = bulkDeleteContractorSchema.safeParse(body)
  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Invalid request data',
      data: parseResult.error.flatten(),
    })
  }

  const { ids, filters } = parseResult.data
  const client = await serverSupabaseClient<Database>(event)

  let targetIds: string[]

  if (filters) {
    const countQuery = client.from('contractors').select('id', { count: 'exact', head: true })
    const filteredCountQuery = applyContractorFilters(countQuery, filters)
    const { count, error: countError } = await filteredCountQuery

    if (countError) {
      if (import.meta.dev) {
        consola.error('Bulk delete count error:', countError)
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to count contractors',
      })
    }

    const matchCount = count ?? 0
    if (matchCount > MAX_BULK_DELETE) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Too many contractors (${matchCount}). Maximum ${MAX_BULK_DELETE} allowed.`,
      })
    }

    const idsQuery = client.from('contractors').select('id')
    const filteredIdsQuery = applyContractorFilters(idsQuery, filters)
    const { data: matchedContractors, error: idsError } = await filteredIdsQuery

    if (idsError) {
      if (import.meta.dev) {
        consola.error('Bulk delete IDs fetch error:', idsError)
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to fetch contractor IDs',
      })
    }

    targetIds = (matchedContractors ?? []).map(c => c.id)
  } else {
    targetIds = ids!
  }

  if (targetIds.length === 0) {
    return {
      success: true,
      data: {
        total: 0,
        succeeded: [],
        failed: [],
      },
    }
  }

  const { data: existingContractors, error: fetchError } = await client
    .from('contractors')
    .select('id, deleted_at')
    .in('id', targetIds)

  if (fetchError) {
    if (import.meta.dev) {
      consola.error('Bulk delete pre-fetch error:', fetchError)
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch contractors',
    })
  }

  const existingMap = new Map(
    (existingContractors ?? []).map(c => [c.id, c.deleted_at])
  )

  const failed: FailedDelete[] = []
  const validIds: string[] = []

  for (const id of targetIds) {
    if (!existingMap.has(id)) {
      failed.push({ id, reason: 'Contractor not found' })
    } else if (existingMap.get(id) !== null) {
      failed.push({ id, reason: 'Contractor already deleted' })
    } else {
      validIds.push(id)
    }
  }

  const succeeded: string[] = []

  if (validIds.length > 0) {
    const { data: deletedContractors, error: updateError } = await client
      .from('contractors')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', validIds)
      .is('deleted_at', null)
      .select('id')

    if (updateError) {
      if (import.meta.dev) {
        consola.error('Bulk delete update error:', updateError)
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to delete contractors',
      })
    }

    succeeded.push(...(deletedContractors ?? []).map(c => c.id))
  }

  if (import.meta.dev) {
    consola.success(`Bulk delete completed: ${succeeded.length} succeeded, ${failed.length} failed`)
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
