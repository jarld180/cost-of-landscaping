/**
 * Page Repository
 *
 * Data access layer for pages table.
 * Handles all database operations using Supabase client.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'

// Type aliases for cleaner code
type Page = Database['public']['Tables']['pages']['Row']
type PageInsert = Database['public']['Tables']['pages']['Insert']
type PageUpdate = Database['public']['Tables']['pages']['Update']

export interface PageFilters {
  status?: 'draft' | 'published' | 'archived'
  template?: string
  parentId?: string | null
  depth?: number
  includeDeleted?: boolean
}

export interface PageListOptions extends PageFilters {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export class PageRepository {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * Create a new page
   */
  async create(data: PageInsert): Promise<Page> {
    const { data: page, error } = await this.client
      .from('pages')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return page
  }

  /**
   * Get page by ID
   */
  async findById(id: string, includeDeleted = false): Promise<Page | null> {
    let query = this.client
      .from('pages')
      .select('*')
      .eq('id', id)

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data
  }

  /**
   * Get page by full path
   */
  async findByPath(path: string, includeDeleted = false): Promise<Page | null> {
    let query = this.client
      .from('pages')
      .select('*')
      .eq('full_path', path)

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data
  }

  /**
   * Get page by slug and parent ID
   */
  async findBySlugAndParent(slug: string, parentId: string | null, includeDeleted = false): Promise<Page | null> {
    let query = this.client
      .from('pages')
      .select('*')
      .eq('slug', slug)

    if (parentId === null) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', parentId)
    }

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query.maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * List pages with filters and pagination
   */
  async list(options: PageListOptions = {}): Promise<{ pages: Page[], total: number }> {
    const {
      status,
      template,
      parentId,
      depth,
      includeDeleted = false,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc'
    } = options

    // Build query
    let query = this.client
      .from('pages')
      .select('*', { count: 'exact' })

    // Apply filters
    if (status) query = query.eq('status', status)
    if (template) query = query.eq('template', template)
    if (parentId !== undefined) {
      if (parentId === null) {
        query = query.is('parent_id', null)
      } else {
        query = query.eq('parent_id', parentId)
      }
    }
    if (depth !== undefined) query = query.eq('depth', depth)
    if (!includeDeleted) query = query.is('deleted_at', null)

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .order('full_path', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      pages: data || [],
      total: count || 0
    }
  }

  /**
   * Get children of a page
   */
  async getChildren(parentId: string, includeDeleted = false): Promise<Page[]> {
    let query = this.client
      .from('pages')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false })
      .order('full_path', { ascending: true })

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Get all descendants of a page (recursive)
   */
  async getDescendants(parentId: string, includeDeleted = false): Promise<Page[]> {
    // Get all pages that start with the parent's full_path
    const parent = await this.findById(parentId, includeDeleted)
    if (!parent) return []

    let query = this.client
      .from('pages')
      .select('*')
      .like('full_path', `${parent.full_path}/%`)
      .order('depth', { ascending: true })
      .order('created_at', { ascending: false })
      .order('full_path', { ascending: true })

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Get breadcrumb trail for a page
   */
  async getBreadcrumbs(pageId: string): Promise<Page[]> {
    const page = await this.findById(pageId)
    if (!page) return []

    // Split the full_path and get all parent paths
    const pathParts = page.full_path.split('/').filter(Boolean)
    const breadcrumbPaths: string[] = []

    for (let i = 0; i < pathParts.length; i++) {
      breadcrumbPaths.push('/' + pathParts.slice(0, i + 1).join('/'))
    }

    // Get all pages matching these paths
    const { data, error } = await this.client
      .from('pages')
      .select('*')
      .in('full_path', breadcrumbPaths)
      .is('deleted_at', null)
      .order('depth', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Update a page
   */
  async update(id: string, data: PageUpdate): Promise<Page> {
    const { data: page, error } = await this.client
      .from('pages')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return page
  }

  /**
   * Soft delete a page
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from('pages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Hard delete a page (permanent)
   */
  async hardDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from('pages')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Restore a soft-deleted page
   */
  async restore(id: string): Promise<Page> {
    const { data: page, error } = await this.client
      .from('pages')
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return page
  }

  /**
   * Count pages matching filters
   */
  async count(filters: PageFilters = {}): Promise<number> {
    const { status, template, parentId, depth, includeDeleted = false } = filters

    let query = this.client
      .from('pages')
      .select('*', { count: 'exact', head: true })

    if (status) query = query.eq('status', status)
    if (template) query = query.eq('template', template)
    if (parentId !== undefined) {
      if (parentId === null) {
        query = query.is('parent_id', null)
      } else {
        query = query.eq('parent_id', parentId)
      }
    }
    if (depth !== undefined) query = query.eq('depth', depth)
    if (!includeDeleted) query = query.is('deleted_at', null)

    const { count, error } = await query

    if (error) throw error
    return count || 0
  }

  /**
   * Check if a slug exists under a parent
   */
  async slugExists(slug: string, parentId: string | null, excludeId?: string): Promise<boolean> {
    let query = this.client
      .from('pages')
      .select('id')
      .eq('slug', slug)
      .is('deleted_at', null)

    if (parentId === null) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', parentId)
    }

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) throw error
    return data !== null
  }
}

