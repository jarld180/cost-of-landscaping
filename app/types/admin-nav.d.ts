/**
 * Admin Navigation Type Definitions
 * Based on shadcn-nuxt-template nav types
 */

export interface AdminNavLink {
  title: string
  link: string
  icon?: string
  new?: boolean
  external?: boolean
}

export interface AdminNavSectionTitle {
  heading: string
}

export interface AdminNavGroup {
  title: string
  icon?: string
  new?: boolean
  children: AdminNavLink[]
}

export interface AdminNavMenu {
  heading?: string
  items: AdminNavMenuItems
}

export type AdminNavMenuItems = (AdminNavLink | AdminNavGroup | AdminNavSectionTitle)[]

