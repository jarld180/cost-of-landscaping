/**
 * POST /api/admin/city-listicles/:cityId/generate
 *
 * Queue an AI article job for a city's best-contractors page.
 * Creates a job in ai_article_jobs using the existing pipeline with city context.
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../../../utils/auth'
import { AIJobQueueService } from '../../../../services/AIJobQueueService'

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'
}

export default defineEventHandler(async (event) => {
  const userId = await requireAdmin(event)
  const cityId = getRouterParam(event, 'cityId')

  if (!cityId) {
    throw createError({ statusCode: 400, message: 'City ID required' })
  }

  const serviceClient = serverSupabaseServiceRole(event)

  // Fetch city info
  const { data: city, error: cityError } = await serviceClient
    .from('cities')
    .select('id, name, slug, state_code, population')
    .eq('id', cityId)
    .is('deleted_at', null)
    .single()

  if (cityError || !city) {
    throw createError({ statusCode: 404, message: 'City not found' })
  }

  // Fetch top contractors in this city (for context)
  const { data: contractors } = await serviceClient
    .from('contractors')
    .select('company_name, verification_tier, rating, review_count')
    .eq('city_id', cityId)
    .is('deleted_at', null)
    .order('verification_rank', { ascending: true })
    .order('rating', { ascending: false })
    .limit(5)

  const contractorSummary = contractors && contractors.length > 0
    ? contractors.map((c, i) => `${i + 1}. ${c.company_name} (${c.verification_tier}, ${c.rating ? `${c.rating}/5 stars` : 'no rating'})`).join('\n')
    : 'No contractors listed yet in this city.'

  const stateName = STATE_NAMES[city.state_code] || city.state_code
  const totalContractors = contractors?.length || 0
  const keyword = `best landscape pros in ${city.name}, ${city.state_code}`

  const articleContext = [
    `City listicle for ${city.name}, ${stateName} (pop ${city.population?.toLocaleString() || '?'}).`,
    `${totalContractors} contractors listed. Write 2-3 intro paragraphs: local climate effects on landscape,`,
    `common project types, hiring tips, cost ranges for ${city.state_code}.`,
    `Add a closing paragraph on vetting contractors.`,
    `Include 5 FAQs specific to ${city.name}.`,
    `Do NOT name specific contractors — the live list is shown separately.`
  ].join(' ').slice(0, 498)

  // Create AI article job using existing pipeline
  const authClient = await serverSupabaseClient(event)
  const queueService = new AIJobQueueService(authClient)

  const job = await queueService.createJob({
    keyword,
    settings: {
      autoPost: false,
      targetWordCount: 800,
      maxIterations: 2,
      template: 'city-listicle',
      articleContext,
      secondaryKeywords: [
        `landscape pros ${city.name}`,
        `landscape driveway ${city.name}`,
        `landscape patio ${city.name}`,
        `landscape cost ${city.state_code}`,
        `licensed landscape pros ${city.state_code}`
      ],
      generateImages: false,
      maxImages: 0,
      imageStyle: 'natural',
      imageModel: 'dall-e-3'
    },
    priority: 30,
    createdBy: userId
  })

  // Fire execution asynchronously
  const baseUrl = getRequestURL(event).origin
  $fetch(`${baseUrl}/api/ai/articles/${job.id}/execute`, {
    method: 'POST',
    headers: { cookie: getHeader(event, 'cookie') || '' }
  }).catch(() => {})

  return {
    success: true,
    jobId: job.id,
    message: `Content generation queued for ${city.name}, ${city.state_code}`
  }
})
