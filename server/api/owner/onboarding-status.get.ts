/**
 * GET /api/owner/onboarding-status
 *
 * Returns account-level onboarding completion and the primary owned contractor
 * for the badge setup wizard.
 */

import { consola } from 'consola'
import { serverSupabaseClient } from '#supabase/server'
import { requireAuth } from '../../utils/auth'
import { getOwnerProfileUrl } from '~/utils/ownerBadge'

interface CityRow {
  name: string
  slug: string
  state_code: string
}

function isCityRow(value: unknown): value is CityRow {
  return typeof value === 'object' && value !== null
    && 'name' in value && typeof value.name === 'string'
    && 'slug' in value && typeof value.slug === 'string'
    && 'state_code' in value && typeof value.state_code === 'string'
}

function normalizeCity(value: unknown): CityRow | null {
  if (Array.isArray(value)) {
    return isCityRow(value[0]) ? value[0] : null
  }

  return isCityRow(value) ? value : null
}

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event)
  const client = await serverSupabaseClient(event)
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl

  if (import.meta.dev) {
    consola.info('GET /api/owner/onboarding-status - Fetching onboarding status', { userId })
  }

  const { data: profile, error: profileError } = await client
    .from('account_profiles')
    .select('onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    consola.error('GET /api/owner/onboarding-status - Profile lookup failed:', profileError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch onboarding status'
    })
  }

  const { data: contractors, error: contractorsError } = await client
    .from('contractors')
    .select(`
      id,
      company_name,
      slug,
      website,
      embed_token,
      embed_verified,
      embed_verified_at,
      embed_verified_domain,
      claimed_at,
      city:cities!contractors_city_id_fkey (
        name,
        slug,
        state_code
      )
    `)
    .eq('claimed_by', userId)
    .eq('is_claimed', true)
    .is('deleted_at', null)
    .order('claimed_at', { ascending: true, nullsFirst: false })
    .order('company_name', { ascending: true })

  if (contractorsError) {
    consola.error('GET /api/owner/onboarding-status - Contractors lookup failed:', contractorsError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch owned contractors'
    })
  }

  const ownedContractors = contractors || []
  const primaryContractor = ownedContractors[0] || null
  const onboardingCompletedAt = profile?.onboarding_completed_at || null

  if (!primaryContractor) {
    return {
      completed: Boolean(onboardingCompletedAt),
      onboardingCompletedAt,
      contractor: null,
      hasUnverifiedContractors: false,
    }
  }

  const city = normalizeCity(primaryContractor.city)
  const contractorForUrl = {
    slug: primaryContractor.slug,
    city: city ? {
      slug: city.slug,
      stateCode: city.state_code,
    } : null,
  }

  return {
    completed: Boolean(onboardingCompletedAt),
    onboardingCompletedAt,
    contractor: {
      id: primaryContractor.id,
      companyName: primaryContractor.company_name,
      slug: primaryContractor.slug,
      embedToken: primaryContractor.embed_token,
      embedVerified: primaryContractor.embed_verified === true,
      embedVerifiedAt: primaryContractor.embed_verified_at,
      embedVerifiedDomain: primaryContractor.embed_verified_domain,
      website: primaryContractor.website,
      profileUrl: getOwnerProfileUrl(contractorForUrl, siteUrl),
      city: contractorForUrl.city,
    },
    hasUnverifiedContractors: ownedContractors.some(contractor => contractor.embed_verified !== true),
  }
})
