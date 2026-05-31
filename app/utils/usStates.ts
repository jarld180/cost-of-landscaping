/**
 * US States Data - Single source of truth
 * Used by BrowseByState, state search pages, and city drilling
 */

export interface City {
  name: string
  slug: string
}

export interface USState {
  name: string
  slug: string
  abbreviation: string
  cities: City[]
}

/**
 * All 50 US states with major cities
 * Cities are mock data for now - will be replaced with dynamic data later
 */
export const US_STATES: USState[] = [
  { name: 'Alabama', slug: 'alabama', abbreviation: 'AL', cities: [{ name: 'Birmingham', slug: 'birmingham' }, { name: 'Montgomery', slug: 'montgomery' }, { name: 'Huntsville', slug: 'huntsville' }] },
  { name: 'Alaska', slug: 'alaska', abbreviation: 'AK', cities: [{ name: 'Anchorage', slug: 'anchorage' }, { name: 'Fairbanks', slug: 'fairbanks' }, { name: 'Juneau', slug: 'juneau' }] },
  { name: 'Arizona', slug: 'arizona', abbreviation: 'AZ', cities: [{ name: 'Phoenix', slug: 'phoenix' }, { name: 'Tucson', slug: 'tucson' }, { name: 'Mesa', slug: 'mesa' }] },
  { name: 'Arkansas', slug: 'arkansas', abbreviation: 'AR', cities: [{ name: 'Little Rock', slug: 'little-rock' }, { name: 'Fort Smith', slug: 'fort-smith' }, { name: 'Fayetteville', slug: 'fayetteville' }] },
  { name: 'California', slug: 'california', abbreviation: 'CA', cities: [{ name: 'Los Angeles', slug: 'los-angeles' }, { name: 'San Francisco', slug: 'san-francisco' }, { name: 'San Diego', slug: 'san-diego' }] },
  { name: 'Colorado', slug: 'colorado', abbreviation: 'CO', cities: [{ name: 'Denver', slug: 'denver' }, { name: 'Colorado Springs', slug: 'colorado-springs' }, { name: 'Aurora', slug: 'aurora' }] },
  { name: 'Connecticut', slug: 'connecticut', abbreviation: 'CT', cities: [{ name: 'Hartford', slug: 'hartford' }, { name: 'New Haven', slug: 'new-haven' }, { name: 'Stamford', slug: 'stamford' }] },
  { name: 'Delaware', slug: 'delaware', abbreviation: 'DE', cities: [{ name: 'Wilmington', slug: 'wilmington' }, { name: 'Dover', slug: 'dover' }, { name: 'Newark', slug: 'newark' }] },
  { name: 'Florida', slug: 'florida', abbreviation: 'FL', cities: [{ name: 'Miami', slug: 'miami' }, { name: 'Orlando', slug: 'orlando' }, { name: 'Tampa', slug: 'tampa' }] },
  { name: 'Georgia', slug: 'georgia', abbreviation: 'GA', cities: [{ name: 'Atlanta', slug: 'atlanta' }, { name: 'Savannah', slug: 'savannah' }, { name: 'Augusta', slug: 'augusta' }] },
  { name: 'Hawaii', slug: 'hawaii', abbreviation: 'HI', cities: [{ name: 'Honolulu', slug: 'honolulu' }, { name: 'Hilo', slug: 'hilo' }, { name: 'Kailua', slug: 'kailua' }] },
  { name: 'Idaho', slug: 'idaho', abbreviation: 'ID', cities: [{ name: 'Boise', slug: 'boise' }, { name: 'Meridian', slug: 'meridian' }, { name: 'Nampa', slug: 'nampa' }] },
  { name: 'Illinois', slug: 'illinois', abbreviation: 'IL', cities: [{ name: 'Chicago', slug: 'chicago' }, { name: 'Aurora', slug: 'aurora' }, { name: 'Naperville', slug: 'naperville' }] },
  { name: 'Indiana', slug: 'indiana', abbreviation: 'IN', cities: [{ name: 'Indianapolis', slug: 'indianapolis' }, { name: 'Fort Wayne', slug: 'fort-wayne' }, { name: 'Evansville', slug: 'evansville' }] },
  { name: 'Iowa', slug: 'iowa', abbreviation: 'IA', cities: [{ name: 'Des Moines', slug: 'des-moines' }, { name: 'Cedar Rapids', slug: 'cedar-rapids' }, { name: 'Davenport', slug: 'davenport' }] },
  { name: 'Kansas', slug: 'kansas', abbreviation: 'KS', cities: [{ name: 'Wichita', slug: 'wichita' }, { name: 'Overland Park', slug: 'overland-park' }, { name: 'Kansas City', slug: 'kansas-city' }] },
  { name: 'Kentucky', slug: 'kentucky', abbreviation: 'KY', cities: [{ name: 'Louisville', slug: 'louisville' }, { name: 'Lexington', slug: 'lexington' }, { name: 'Bowling Green', slug: 'bowling-green' }] },
  { name: 'Louisiana', slug: 'louisiana', abbreviation: 'LA', cities: [{ name: 'New Orleans', slug: 'new-orleans' }, { name: 'Baton Rouge', slug: 'baton-rouge' }, { name: 'Shreveport', slug: 'shreveport' }] },
  { name: 'Maine', slug: 'maine', abbreviation: 'ME', cities: [{ name: 'Portland', slug: 'portland' }, { name: 'Lewiston', slug: 'lewiston' }, { name: 'Bangor', slug: 'bangor' }] },
  { name: 'Maryland', slug: 'maryland', abbreviation: 'MD', cities: [{ name: 'Baltimore', slug: 'baltimore' }, { name: 'Frederick', slug: 'frederick' }, { name: 'Rockville', slug: 'rockville' }] },
  { name: 'Massachusetts', slug: 'massachusetts', abbreviation: 'MA', cities: [{ name: 'Boston', slug: 'boston' }, { name: 'Worcester', slug: 'worcester' }, { name: 'Springfield', slug: 'springfield' }] },
  { name: 'Michigan', slug: 'michigan', abbreviation: 'MI', cities: [{ name: 'Detroit', slug: 'detroit' }, { name: 'Grand Rapids', slug: 'grand-rapids' }, { name: 'Ann Arbor', slug: 'ann-arbor' }] },
  { name: 'Minnesota', slug: 'minnesota', abbreviation: 'MN', cities: [{ name: 'Minneapolis', slug: 'minneapolis' }, { name: 'Saint Paul', slug: 'saint-paul' }, { name: 'Rochester', slug: 'rochester' }] },
  { name: 'Mississippi', slug: 'mississippi', abbreviation: 'MS', cities: [{ name: 'Jackson', slug: 'jackson' }, { name: 'Gulfport', slug: 'gulfport' }, { name: 'Hattiesburg', slug: 'hattiesburg' }] },
  { name: 'Missouri', slug: 'missouri', abbreviation: 'MO', cities: [{ name: 'Kansas City', slug: 'kansas-city' }, { name: 'Saint Louis', slug: 'saint-louis' }, { name: 'Springfield', slug: 'springfield' }] },
  { name: 'Montana', slug: 'montana', abbreviation: 'MT', cities: [{ name: 'Billings', slug: 'billings' }, { name: 'Missoula', slug: 'missoula' }, { name: 'Great Falls', slug: 'great-falls' }] },
  { name: 'Nebraska', slug: 'nebraska', abbreviation: 'NE', cities: [{ name: 'Omaha', slug: 'omaha' }, { name: 'Lincoln', slug: 'lincoln' }, { name: 'Bellevue', slug: 'bellevue' }] },
  { name: 'Nevada', slug: 'nevada', abbreviation: 'NV', cities: [{ name: 'Las Vegas', slug: 'las-vegas' }, { name: 'Henderson', slug: 'henderson' }, { name: 'Reno', slug: 'reno' }] },
  { name: 'New Hampshire', slug: 'new-hampshire', abbreviation: 'NH', cities: [{ name: 'Manchester', slug: 'manchester' }, { name: 'Nashua', slug: 'nashua' }, { name: 'Concord', slug: 'concord' }] },
  { name: 'New Jersey', slug: 'new-jersey', abbreviation: 'NJ', cities: [{ name: 'Newark', slug: 'newark' }, { name: 'Jersey City', slug: 'jersey-city' }, { name: 'Trenton', slug: 'trenton' }] },
  { name: 'New Mexico', slug: 'new-mexico', abbreviation: 'NM', cities: [{ name: 'Albuquerque', slug: 'albuquerque' }, { name: 'Santa Fe', slug: 'santa-fe' }, { name: 'Las Cruces', slug: 'las-cruces' }] },
  { name: 'New York', slug: 'new-york', abbreviation: 'NY', cities: [{ name: 'New York City', slug: 'new-york-city' }, { name: 'Buffalo', slug: 'buffalo' }, { name: 'Rochester', slug: 'rochester' }] },
  { name: 'North Carolina', slug: 'north-carolina', abbreviation: 'NC', cities: [{ name: 'Charlotte', slug: 'charlotte' }, { name: 'Raleigh', slug: 'raleigh' }, { name: 'Greensboro', slug: 'greensboro' }] },
  { name: 'North Dakota', slug: 'north-dakota', abbreviation: 'ND', cities: [{ name: 'Fargo', slug: 'fargo' }, { name: 'Bismarck', slug: 'bismarck' }, { name: 'Grand Forks', slug: 'grand-forks' }] },
  { name: 'Ohio', slug: 'ohio', abbreviation: 'OH', cities: [{ name: 'Columbus', slug: 'columbus' }, { name: 'Cleveland', slug: 'cleveland' }, { name: 'Cincinnati', slug: 'cincinnati' }] },
  { name: 'Oklahoma', slug: 'oklahoma', abbreviation: 'OK', cities: [{ name: 'Oklahoma City', slug: 'oklahoma-city' }, { name: 'Tulsa', slug: 'tulsa' }, { name: 'Norman', slug: 'norman' }] },
  { name: 'Oregon', slug: 'oregon', abbreviation: 'OR', cities: [{ name: 'Portland', slug: 'portland' }, { name: 'Salem', slug: 'salem' }, { name: 'Eugene', slug: 'eugene' }] },
  { name: 'Pennsylvania', slug: 'pennsylvania', abbreviation: 'PA', cities: [{ name: 'Philadelphia', slug: 'philadelphia' }, { name: 'Pittsburgh', slug: 'pittsburgh' }, { name: 'Allentown', slug: 'allentown' }] },
  { name: 'Rhode Island', slug: 'rhode-island', abbreviation: 'RI', cities: [{ name: 'Providence', slug: 'providence' }, { name: 'Warwick', slug: 'warwick' }, { name: 'Cranston', slug: 'cranston' }] },
  { name: 'South Carolina', slug: 'south-carolina', abbreviation: 'SC', cities: [{ name: 'Charleston', slug: 'charleston' }, { name: 'Columbia', slug: 'columbia' }, { name: 'Greenville', slug: 'greenville' }] },
  { name: 'South Dakota', slug: 'south-dakota', abbreviation: 'SD', cities: [{ name: 'Sioux Falls', slug: 'sioux-falls' }, { name: 'Rapid City', slug: 'rapid-city' }, { name: 'Aberdeen', slug: 'aberdeen' }] },
  { name: 'Tennessee', slug: 'tennessee', abbreviation: 'TN', cities: [{ name: 'Nashville', slug: 'nashville' }, { name: 'Memphis', slug: 'memphis' }, { name: 'Knoxville', slug: 'knoxville' }] },
  { name: 'Texas', slug: 'texas', abbreviation: 'TX', cities: [{ name: 'Houston', slug: 'houston' }, { name: 'Dallas', slug: 'dallas' }, { name: 'Austin', slug: 'austin' }, { name: 'San Antonio', slug: 'san-antonio' }] },
  { name: 'Utah', slug: 'utah', abbreviation: 'UT', cities: [{ name: 'Salt Lake City', slug: 'salt-lake-city' }, { name: 'Provo', slug: 'provo' }, { name: 'Ogden', slug: 'ogden' }] },
  { name: 'Vermont', slug: 'vermont', abbreviation: 'VT', cities: [{ name: 'Burlington', slug: 'burlington' }, { name: 'Essex', slug: 'essex' }, { name: 'Rutland', slug: 'rutland' }] },
  { name: 'Virginia', slug: 'virginia', abbreviation: 'VA', cities: [{ name: 'Virginia Beach', slug: 'virginia-beach' }, { name: 'Norfolk', slug: 'norfolk' }, { name: 'Richmond', slug: 'richmond' }] },
  { name: 'Washington', slug: 'washington', abbreviation: 'WA', cities: [{ name: 'Seattle', slug: 'seattle' }, { name: 'Spokane', slug: 'spokane' }, { name: 'Tacoma', slug: 'tacoma' }] },
  { name: 'West Virginia', slug: 'west-virginia', abbreviation: 'WV', cities: [{ name: 'Charleston', slug: 'charleston' }, { name: 'Huntington', slug: 'huntington' }, { name: 'Morgantown', slug: 'morgantown' }] },
  { name: 'Wisconsin', slug: 'wisconsin', abbreviation: 'WI', cities: [{ name: 'Milwaukee', slug: 'milwaukee' }, { name: 'Madison', slug: 'madison' }, { name: 'Green Bay', slug: 'green-bay' }] },
  { name: 'Wyoming', slug: 'wyoming', abbreviation: 'WY', cities: [{ name: 'Cheyenne', slug: 'cheyenne' }, { name: 'Casper', slug: 'casper' }, { name: 'Laramie', slug: 'laramie' }] }
]

/**
 * Get a state by its slug
 */
export function getStateBySlug(slug: string): USState | undefined {
  return US_STATES.find(state => state.slug === slug)
}

/**
 * Get a state by its abbreviation/code (e.g., 'NC', 'CA')
 */
export function getStateByCode(code: string): USState | undefined {
  return US_STATES.find(state => state.abbreviation.toUpperCase() === code.toUpperCase())
}

/**
 * Check if a slug is a valid US state
 */
export function isValidStateSlug(slug: string): boolean {
  return US_STATES.some(state => state.slug === slug)
}

/**
 * Get all state slugs (useful for validation)
 */
export function getAllStateSlugs(): string[] {
  return US_STATES.map(state => state.slug)
}

/**
 * Get state name from abbreviation/code (e.g., 'NC' -> 'North Carolina')
 */
export function getStateName(code: string): string {
  const state = getStateByCode(code)
  return state?.name || code
}

/**
 * Get state slug from abbreviation/code (e.g., 'NC' -> 'north-carolina')
 */
export function getStateSlugFromCode(code: string): string {
  const state = getStateByCode(code)
  return state?.slug || code.toLowerCase()
}

