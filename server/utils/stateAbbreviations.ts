/**
 * US State Abbreviations Utility
 *
 * Converts full state names to two-letter abbreviations.
 * Used during Apify import to normalize state data.
 */

const STATE_ABBREVIATIONS: Record<string, string> = {
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY',
  'district of columbia': 'DC',
  'puerto rico': 'PR',
  'guam': 'GU',
  'virgin islands': 'VI',
  'american samoa': 'AS',
  'northern mariana islands': 'MP',
}

/**
 * Convert state name to abbreviation
 *
 * @param stateName - Full state name (e.g., "North Carolina")
 * @returns Two-letter abbreviation (e.g., "NC") or null if not found
 */
export function stateToAbbreviation(stateName: string | null | undefined): string | null {
  if (!stateName) return null

  const normalized = stateName.trim().toLowerCase()

  // Already an abbreviation (2 uppercase letters)
  if (/^[A-Z]{2}$/.test(stateName.trim())) {
    return stateName.trim().toUpperCase()
  }

  return STATE_ABBREVIATIONS[normalized] || null
}

/**
 * Check if a string is a valid US state abbreviation
 */
export function isValidStateAbbreviation(abbr: string | null | undefined): boolean {
  if (!abbr) return false
  const normalized = abbr.trim().toUpperCase()
  return Object.values(STATE_ABBREVIATIONS).includes(normalized)
}

