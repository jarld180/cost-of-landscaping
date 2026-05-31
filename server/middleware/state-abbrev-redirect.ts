// Redirect /xx/city/... URLs to /full-state-name/city/... (301 permanent)
// Handles users who type state abbreviations instead of slugs

const ABBREV_TO_SLUG: Record<string, string> = {
  al: 'alabama', ak: 'alaska', az: 'arizona', ar: 'arkansas', ca: 'california',
  co: 'colorado', ct: 'connecticut', de: 'delaware', fl: 'florida', ga: 'georgia',
  hi: 'hawaii', id: 'idaho', il: 'illinois', in: 'indiana', ia: 'iowa',
  ks: 'kansas', ky: 'kentucky', la: 'louisiana', me: 'maine', md: 'maryland',
  ma: 'massachusetts', mi: 'michigan', mn: 'minnesota', ms: 'mississippi', mo: 'missouri',
  mt: 'montana', ne: 'nebraska', nv: 'nevada', nh: 'new-hampshire', nj: 'new-jersey',
  nm: 'new-mexico', ny: 'new-york', nc: 'north-carolina', nd: 'north-dakota', oh: 'ohio',
  ok: 'oklahoma', or: 'oregon', pa: 'pennsylvania', ri: 'rhode-island', sc: 'south-carolina',
  sd: 'south-dakota', tn: 'tennessee', tx: 'texas', ut: 'utah', vt: 'vermont',
  va: 'virginia', wa: 'washington', wv: 'west-virginia', wi: 'wisconsin', wy: 'wyoming',
}

export default defineEventHandler((event) => {
  const path = event.path || ''
  const parts = path.split('/')
  const firstSegment = parts[1]?.toLowerCase()

  if (firstSegment && firstSegment.length === 2 && ABBREV_TO_SLUG[firstSegment]) {
    const slug = ABBREV_TO_SLUG[firstSegment]
    const rest = parts.slice(2).join('/')
    const newPath = rest ? `/${slug}/${rest}` : `/${slug}`
    return sendRedirect(event, newPath, 301)
  }
})
