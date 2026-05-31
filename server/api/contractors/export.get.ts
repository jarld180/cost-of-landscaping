import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { exportContractorQuerySchema } from '../../schemas/contractor.schemas'
import { requireAdmin } from '../../utils/auth'
import { applyContractorFilters } from '../../utils/contractorFilters'
import type { Database } from '../../../app/types/supabase'

function escapeCsvValue(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

type ContractorWithCity = {
  id: string
  company_name: string
  slug: string
  status: string
  phone: string | null
  email: string | null
  website: string | null
  street_address: string | null
  postal_code: string | null
  created_at: string
  updated_at: string
  city: { name: string; state_code: string } | null
}

export default defineEventHandler(async (event) => {
  const userId = await requireAdmin(event)

  if (import.meta.dev) {
    consola.info('GET /api/contractors/export - Exporting contractors', { userId })
  }

  const query = getQuery(event)
  const validatedQuery = exportContractorQuerySchema.parse(query)

  const client = await serverSupabaseClient<Database>(event)

  let dbQuery = client
    .from('contractors')
    .select(`
      id, company_name, slug, status, phone, email, website,
      street_address, postal_code, created_at, updated_at,
      city:cities!contractors_city_id_fkey (name, state_code)
    `)

  if (validatedQuery.ids && validatedQuery.ids.length > 0) {
    dbQuery = dbQuery.in('id', validatedQuery.ids)
  } else {
    dbQuery = applyContractorFilters(dbQuery, {
      cityId: validatedQuery.cityId,
      status: validatedQuery.status,
      category: validatedQuery.category,
      search: validatedQuery.search,
    })
    dbQuery = dbQuery.limit(validatedQuery.limit)
  }

  const { data, error } = await dbQuery

  if (error) {
    consola.error('GET /api/contractors/export - Database error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to export contractors',
    })
  }

  const contractors = (data || []) as ContractorWithCity[]

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="contractors-export-${new Date().toISOString().split('T')[0]}.csv"`)

  const BOM = '\uFEFF'
  const header = 'company_name,slug,status,phone,email,website,city,state,street_address,postal_code,created_at,updated_at'

  if (contractors.length === 0) {
    return BOM + header
  }

  const rows = contractors.map(c => [
    escapeCsvValue(c.company_name),
    escapeCsvValue(c.slug),
    escapeCsvValue(c.status),
    escapeCsvValue(c.phone),
    escapeCsvValue(c.email),
    escapeCsvValue(c.website),
    escapeCsvValue(c.city?.name),
    escapeCsvValue(c.city?.state_code),
    escapeCsvValue(c.street_address),
    escapeCsvValue(c.postal_code),
    escapeCsvValue(c.created_at),
    escapeCsvValue(c.updated_at),
  ].join(','))

  return BOM + header + '\n' + rows.join('\n')
})
