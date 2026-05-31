import type { AdminNavMenu, AdminNavMenuItems } from '~/types/admin-nav'

export const adminNavMenu: AdminNavMenu[] = [
  {
    items: [
      {
        title: 'Homepage',
        icon: 'i-lucide-external-link',
        link: '/',
        external: true,
      }
    ],
  },
  {
    heading: 'Main',
    items: [
      {
        title: 'Overview',
        icon: 'i-lucide-home',
        link: '/admin',
      }
    ],
  },
  {
    heading: 'Content',
    items: [
      {
        title: 'Menus',
        icon: 'i-lucide-menu',
        link: '/admin/menus',
      },
      {
        title: 'Pages & Articles',
        icon: 'i-lucide-file-text',
        link: '/admin/pages',
      }
    ],
  },
  {
    heading: 'AI',
    items: [
      {
        title: 'AI Overview',
        icon: 'i-lucide-bot',
        link: '/admin/ai',
      },
      {
        title: 'Article Writing',
        icon: 'i-lucide-pen-tool',
        link: '/admin/ai/article-writing',
      },
      {
        title: 'City Listicles',
        icon: 'i-lucide-map-pin',
        link: '/admin/ai/city-listicles',
      },
      {
        title: 'Article Keywords',
        icon: 'i-lucide-key-round',
        link: '/admin/ai/article-keywords',
      },
      {
        title: 'Personas',
        icon: 'i-lucide-users-round',
        link: '/admin/ai/personas',
      },
    ],
  },
  {
    heading: 'Directory',
    items: [
      {
        title: 'Profile Claims',
        icon: 'i-lucide-shield-check',
        link: '/admin/claims',
      },
      {
        title: 'COI Verifications',
        icon: 'i-lucide-file-badge',
        link: '/admin/verifications',
      },
      {
        title: 'Contractor Profiles',
        icon: 'i-lucide-building-2',
        link: '/admin/contractors',
      }
    ],
  },
  {
    heading: 'Accounts',
    items: [
      {
        title: 'Contractor Accounts',
        icon: 'i-lucide-building',
        link: '/admin/accounts/contractors',
      },
      {
        title: 'System Accounts',
        icon: 'i-lucide-users',
        link: '/admin/accounts/system',
      },
    ],
  },
  {
    heading: 'Maintenance',
    items: [
      {
        title: 'Contractor Import',
        icon: 'i-lucide-upload',
        link: '/admin/maintenance/import',
      },
      {
        title: 'Contractor Enrichment',
        icon: 'i-lucide-sparkles',
        link: '/admin/maintenance/contractor-enrichment',
      },
      {
        title: 'Image Enrichment',
        icon: 'i-lucide-image',
        link: '/admin/maintenance/image-enrichment',
      },
      {
        title: 'Review Enrichment',
        icon: 'i-lucide-message-square',
        link: '/admin/maintenance/review-enrichment',
      },
    ],
  },
  {
    heading: 'System',
    items: [
      {
        title: 'Background Jobs',
        icon: 'i-lucide-clock',
        link: '/admin/maintenance/jobs',
      },
    ],
  },
]

export const adminNavMenuBottom: AdminNavMenuItems = []

