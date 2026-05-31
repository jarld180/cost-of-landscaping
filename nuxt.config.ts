// https://nuxt.com/docs/api/configuration/nuxt-config

import { US_STATES } from './app/utils/usStates'

// US State slugs for route matching - must match app/utils/usStates.ts
const US_STATE_SLUGS = [
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
  'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
  'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
  'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new-hampshire',
  'new-jersey', 'new-mexico', 'new-york', 'north-carolina', 'north-dakota', 'ohio',
  'oklahoma', 'oregon', 'pennsylvania', 'rhode-island', 'south-carolina', 'south-dakota',
  'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west-virginia',
  'wisconsin', 'wyoming',
]

// Generate regex pattern for matching state slugs in routes
const STATE_REGEX = `(${US_STATE_SLUGS.join('|')})`

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Custom route ordering to prevent [state] routes from intercepting CMS pages
  // See: https://nuxt.com/docs/guide/recipes/custom-routing
  hooks: {
    'pages:extend'(pages) {
      // Recursively find and modify all routes that have :state param
      // Nuxt generates paths like ":state()" with empty parentheses
      function modifyStateRoutes(routes: typeof pages) {
        for (const route of routes) {
          if (route.path.includes(':state')) {
            route.path = route.path.replace(':state()', `:state${STATE_REGEX}`)
          }
          if (route.children) {
            modifyStateRoutes(route.children)
          }
        }
      }

      modifyStateRoutes(pages)

      // Reorder routes: move catch-all to the END so state routes match first
      const catchAllIndex = pages.findIndex(p => p.path === '/:slug(.*)*')
      if (catchAllIndex > -1) {
        const catchAll = pages.splice(catchAllIndex, 1)[0]
        if (catchAll) {
          pages.push(catchAll)
        }
      }

      console.log('[Nuxt] Custom route ordering applied: state routes prioritized over catch-all')
    },
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
    '@nuxt/eslint',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxtjs/seo',
    '@vueuse/nuxt',
    '@formkit/auto-animate',
    'reka-ui/nuxt',
    '@nuxtjs/color-mode',
    '@nuxtjs/supabase',
    // '@nuxt/hints', // Disabled: causes false positive hydration warnings with ssr:false routes
    'shadcn-nuxt',
  ],

  shadcn: {
    prefix: 'Ui',
    componentDir: './app/components/admin-ui',
  },

  supabase: {
    // Redirect configuration (set to false if you want to handle auth redirects manually)
    redirect: false,

    // Database types configuration
    types: '~/types/supabase.ts',

    // Optional: Uncomment and configure if you want automatic auth redirects
    // redirectOptions: {
    //   login: '/login',
    //   callback: '/confirm',
    //   exclude: ['/'],
    // },
  },

  colorMode: {
    classSuffix: '',
    preference: 'light',
    fallback: 'light',
  },

  $development: {
    scripts: {
      registry: {
        googleTagManager: 'mock',
      },
    },
  },

  css: [
    '~/assets/css/fonts.css',
  ],

  googleFonts: {
    families: {
      'Inter': {
        wght: [300, 400, 500, 600, 700, 800],
        ital: [300, 400, 500, 600, 700, 800],
      },
      'Inter+Tight': {
        wght: [300, 400, 500, 600, 700, 800],
        ital: [300, 400, 500, 600, 700, 800],
      },
    },
    display: 'swap',
  },

  components: [
    {
      path: '~/components/ui',
      pathPrefix: false,
    },
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  imports: {
    dirs: ['./app/lib'],
  },

  site: {
    url: 'https://costoflandscaping.com',
    name: 'Cost of Landscaping',
    description: 'Independent research desk for U.S. landscaping costs — lawn care, design, hardscaping, irrigation, tree service. 36,000+ verified pros in 50 states.',
    defaultLocale: 'en',
  },

  ogImage: {
    defaults: {
      cacheMaxAgeSeconds: 60 * 60 * 24 * 30,
    },
    componentDirs: ['OgImage', 'OgImageTemplate'],
  },

  runtimeConfig: {
    // Server-only keys (never exposed to client)
    bulkOperationLimit: '',
    dataforseoApiKey: '',
    supabaseSecretKey: '',
    supabaseProjectId: '',
    jobRunnerSecret: '',
    openaiApiKey: '',
    anthropicApiKey: '',
    googleGeocodingApiKey: '',
    imageAllowlist: '',
    resendApiKey: '',
    exaApiKey: '',
    heliconeApiKey: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioVerifyServiceSid: '',
    // Badge system: domains considered "ours" (not external) for verification
    badgeOurDomains: ['costoflandscaping.com', 'www.costoflandscaping.com', 'localhost'],

    public: {
      siteUrl: '',
      siteName: '',
      supabaseUrl: '',
      supabaseKey: '',
    },
  },

  nitro: {
    experimental: {
      openAPI: true,
    },
  },

  // Allow Docker to access dev server for pg_cron job runner
  vite: {
    server: {
      allowedHosts: ['host.docker.internal'],
    },
    // Fix ESM/CJS compatibility issue with @supabase/supabase-js
    // See: https://github.com/supabase/supabase-js/issues/1400
    optimizeDeps: {
      include: ['@supabase/supabase-js'],
    },
  },

  // Route rules - disable SSR for admin routes (no SEO needed, prevents hydration issues)
  routeRules: {
    '/admin/**': { ssr: false },
  },

  robots: {
    groups: [
      { userAgent: ['Googlebot'], allow: ['/'], disallow: ['/admin', '/api', '/owner', '/claim', '/login', '/signup'] },
      { userAgent: ['Bingbot'], allow: ['/'], disallow: ['/admin', '/api', '/owner', '/claim', '/login', '/signup'] },
      { userAgent: ['GPTBot', 'ClaudeBot', 'CCBot', 'anthropic-ai', 'Google-Extended', 'cohere-ai', 'PerplexityBot', 'YouBot'], disallow: ['/'] },
      { userAgent: ['*'], allow: ['/'], disallow: ['/admin', '/api', '/owner', '/claim', '/login', '/signup'] },
    ],
  },

  sitemap: {
    sources: [
      {
        urls: [
          { loc: '/', changefreq: 'daily' as const, priority: 1.0 as const },
          { loc: '/find', changefreq: 'weekly' as const, priority: 1.0 as const },
          ...US_STATES.map(state => ({
            loc: `/${state.slug}`,
            changefreq: 'weekly' as const,
            priority: 0.8 as const,
          })),
        ] as any,
        context: {
          name: 'state-pages',
          description: 'All US state pages and find page',
        },
      },
      '/api/__sitemap__/urls',
    ],
    exclude: [
      '/admin/**',
      '/api/**',
      '/login',
      '/signup',
      '/owner/**',
      '/claim/**',
    ],
  },
})
