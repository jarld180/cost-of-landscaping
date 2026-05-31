/**
 * GET /api/public/reviews/confirm/[token]
 *
 * Confirm a pending platform review via email link.
 * Publishes the review, then runs fraud scoring on the contractor.
 * No-ops gracefully if the schema migration hasn't run yet.
 */

import { consola } from 'consola'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    throw createError({ statusCode: 400, message: 'Invalid confirmation token' })
  }

  const client = serverSupabaseServiceRole(event)
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || 'https://costoflandscaping.com'

  // Detect whether new schema columns exist
  const { error: schemaCheck } = await client.from('reviews').select('status').limit(0)
  if (schemaCheck) {
    // Migration not applied — no confirm tokens exist, redirect home
    return sendRedirect(event, `${siteUrl}/?review=confirmed`, 302)
  }

  // Find the pending review
  const { data: review, error: lookupError } = await client
    .from('reviews')
    .select(`
      id, contractor_id, reviewer_email, reviewer_ip, stars, status,
      confirm_expires_at,
      contractor:contractors!reviews_contractor_id_fkey (
        id, slug,
        city:cities!contractors_city_id_fkey (
          slug, state_code
        )
      )
    `)
    .eq('confirm_token', token)
    .single()

  if (lookupError || !review) {
    return sendRedirect(event, `${siteUrl}/?review=invalid`, 302)
  }

  if ((review as any).status !== 'pending') {
    return redirectToContractor(event, siteUrl, (review as any).contractor)
  }

  if ((review as any).confirm_expires_at && new Date((review as any).confirm_expires_at) < new Date()) {
    await client.from('reviews').delete().eq('id', review.id)
    return sendRedirect(event, `${siteUrl}/?review=expired`, 302)
  }

  // Publish the review
  const { error: updateError } = await client
    .from('reviews')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      confirm_token: null,
      confirm_expires_at: null,
    })
    .eq('id', review.id)

  if (updateError) {
    consola.error('Failed to publish review:', updateError)
    throw createError({ statusCode: 500, message: 'Failed to confirm review' })
  }

  // Run fraud scoring asynchronously (don't block the redirect)
  runFraudCheck(client, (review as any).contractor_id, (review as any).reviewer_ip, (review as any).reviewer_email).catch(
    err => consola.warn('Fraud check error (non-fatal):', err)
  )

  return redirectToContractor(event, siteUrl, (review as any).contractor, '?review=confirmed')
})

const STATE_SLUGS: Record<string, string> = {
  AL:'alabama',AK:'alaska',AZ:'arizona',AR:'arkansas',CA:'california',
  CO:'colorado',CT:'connecticut',DE:'delaware',FL:'florida',GA:'georgia',
  HI:'hawaii',ID:'idaho',IL:'illinois',IN:'indiana',IA:'iowa',
  KS:'kansas',KY:'kentucky',LA:'louisiana',ME:'maine',MD:'maryland',
  MA:'massachusetts',MI:'michigan',MN:'minnesota',MS:'mississippi',MO:'missouri',
  MT:'montana',NE:'nebraska',NV:'nevada',NH:'new-hampshire',NJ:'new-jersey',
  NM:'new-mexico',NY:'new-york',NC:'north-carolina',ND:'north-dakota',OH:'ohio',
  OK:'oklahoma',OR:'oregon',PA:'pennsylvania',RI:'rhode-island',SC:'south-carolina',
  SD:'south-dakota',TN:'tennessee',TX:'texas',UT:'utah',VT:'vermont',
  VA:'virginia',WA:'washington',WV:'west-virginia',WI:'wisconsin',WY:'wyoming'
}

function redirectToContractor(event: any, siteUrl: string, contractor: any, suffix = '') {
  try {
    const stateCode = contractor?.city?.state_code
    const stateSlug = stateCode ? STATE_SLUGS[stateCode] : null
    const citySlug = contractor?.city?.slug
    const contractorSlug = contractor?.slug
    if (stateSlug && citySlug && contractorSlug) {
      return sendRedirect(event, `${siteUrl}/${stateSlug}/${citySlug}/landscapers/${contractorSlug}${suffix}`, 302)
    }
  } catch (_) {}
  return sendRedirect(event, `${siteUrl}/${suffix || '?review=confirmed'}`, 302)
}

async function runFraudCheck(client: any, contractorId: string, reviewerIp: string | null, reviewerEmail: string | null) {
  // Pull all published platform reviews for this contractor
  const { data: reviews, error } = await client
    .from('reviews')
    .select('id, reviewer_ip, reviewer_email, stars, published_at, fraud_score')
    .eq('contractor_id', contractorId)
    .eq('status', 'published')
    .is('google_review_id', null)

  if (error || !reviews || reviews.length === 0) return

  const flags: string[] = []
  let fraudScore = 0

  if (reviewerIp) {
    const sameIpCount = reviews.filter((r: any) => r.reviewer_ip === reviewerIp).length
    if (sameIpCount > 1) {
      flags.push(`same_ip:${reviewerIp}:count=${sameIpCount}`)
      fraudScore += sameIpCount * 10
    }
  }

  if (reviewerEmail) {
    const domain = reviewerEmail.split('@')[1]?.toLowerCase()
    const freeDomains = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'])
    if (domain && !freeDomains.has(domain)) {
      const sameDomainCount = reviews.filter((r: any) =>
        r.reviewer_email?.split('@')[1]?.toLowerCase() === domain
      ).length
      if (sameDomainCount > 2) {
        flags.push(`same_domain:${domain}:count=${sameDomainCount}`)
        fraudScore += sameDomainCount * 5
      }
    }
  }

  const now = Date.now()
  const recentReviews = reviews.filter((r: any) =>
    r.published_at && (now - new Date(r.published_at).getTime()) < 24 * 60 * 60 * 1000
  )
  const velocityFlag = recentReviews.length > 5
  if (velocityFlag) {
    flags.push(`velocity:${recentReviews.length}_in_24h`)
    fraudScore += 20
  }

  const allFiveStar = reviews.length >= 5 && reviews.every((r: any) => r.stars === 5)
  if (allFiveStar) {
    flags.push('all_five_star')
    fraudScore += 15
  }

  const fraudRisk = fraudScore >= 30 ? 'high' : fraudScore >= 15 ? 'medium' : 'low'

  // Update individual reviews — may fail if columns don't exist, that's OK
  await client.from('reviews')
    .update({ fraud_score: fraudScore, fraud_flags: flags })
    .eq('contractor_id', contractorId)
    .is('google_review_id', null)
    .eq('status', 'published')
    .then(() => {})
    .catch((err: any) => consola.warn('fraud_score update failed (schema not migrated?):', err))

  // Upsert fraud stats — may fail if table doesn't exist, that's OK
  await client.from('contractor_review_fraud_stats').upsert({
    contractor_id: contractorId,
    total_platform_reviews: reviews.length,
    flagged_reviews: reviews.filter((r: any) => r.fraud_score > 0).length,
    same_ip_count: reviews.filter((r: any) => r.reviewer_ip === reviewerIp).length,
    same_email_domain_count: 0,
    velocity_flag: velocityFlag,
    all_five_star_flag: allFiveStar,
    fraud_risk: fraudRisk,
    last_calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'contractor_id' })
    .then(() => {})
    .catch((err: any) => consola.warn('fraud stats upsert failed (schema not migrated?):', err))
}
