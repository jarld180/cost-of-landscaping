import { getStateByCode } from './usStates'

export type BadgeImageFormat = 'svg' | 'png'

export interface OwnerBadgeCity {
  slug: string
  stateCode: string
}

export interface OwnerBadgeContractor {
  slug: string
  city: OwnerBadgeCity | null
}

export interface OwnerOnboardingContractor extends OwnerBadgeContractor {
  id: string
  companyName: string
  embedToken: string | null
  embedVerified: boolean
  website: string | null
  profileUrl: string
}

export interface OwnerOnboardingStatusResponse {
  completed: boolean
  onboardingCompletedAt: string | null
  contractor: OwnerOnboardingContractor | null
  hasUnverifiedContractors: boolean
}

export interface OwnerOnboardingCompleteResponse {
  success: boolean
  redirectUrl: string
}

export type BadgeCheckReason = 'no_website' | 'missing_embed_token' | 'fetch_failed'

export interface OwnerOnboardingCheckBadgeResponse {
  detected: boolean
  domain?: string | null
  reason?: BadgeCheckReason
}

export function getOwnerProfilePath(contractor: OwnerBadgeContractor): string {
  if (!contractor.city?.stateCode || !contractor.city?.slug) {
    return '#'
  }

  const state = getStateByCode(contractor.city.stateCode)
  if (!state) return '#'

  return `/${state.slug}/${contractor.city.slug}/landscapers/${contractor.slug}`
}

export function addBadgeUtm(profileUrl: string): string {
  const separator = profileUrl.includes('?') ? '&' : '?'
  return `${profileUrl}${separator}utm_source=verified_badge&utm_medium=embed&utm_campaign=badge`
}

export function getOwnerProfileUrl(contractor: OwnerBadgeContractor, siteUrl: string, withUtm = false): string {
  const path = getOwnerProfilePath(contractor)
  const url = path === '#' ? '#' : `${siteUrl}${path}`

  return withUtm ? addBadgeUtm(url) : url
}

export function getOwnerBadgeUrl(embedToken: string, siteUrl: string, format: BadgeImageFormat = 'svg'): string {
  return `${siteUrl}/api/public/badges/${embedToken}.${format}`
}

export function getOwnerBadgeHtml(
  embedToken: string,
  profileUrl: string,
  siteUrl: string,
  format: BadgeImageFormat = 'svg'
): string {
  const badgeUrl = getOwnerBadgeUrl(embedToken, siteUrl, format)
  const trackedProfileUrl = addBadgeUtm(profileUrl)

  return `<a href="${trackedProfileUrl}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;">
  <img
    src="${badgeUrl}"
    alt="Verified on Cost of landscape"
    width="200"
    height="75"
    loading="lazy"
    decoding="async"
    referrerpolicy="origin"
    style="max-width:100%;height:auto;display:block;border:0;"
  />
</a>`
}
