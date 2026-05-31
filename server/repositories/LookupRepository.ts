/**
 * Lookup Repository
 *
 * Consolidated data access layer for lookup tables:
 * - cities: Geographic locations for contractors
 * - service_types: landscape service categories
 *
 * Uses namespaced methods (cities.*, serviceTypes.*) for clarity.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'

// Type aliases
type City = Database['public']['Tables']['cities']['Row']
type CityInsert = Database['public']['Tables']['cities']['Insert']
type CityUpdate = Database['public']['Tables']['cities']['Update']
type ServiceType = Database['public']['Tables']['service_types']['Row']

export interface CityListOptions {
  stateCode?: string
  includeDeleted?: boolean
  limit?: number
  offset?: number
}

export class LookupRepository {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  // =====================================================
  // CITIES NAMESPACE
  // =====================================================

  cities = {
    /**
     * Find city by ID
     */
    findById: async (id: string, includeDeleted = false): Promise<City | null> => {
      let query = this.client.from('cities').select('*').eq('id', id)
      if (!includeDeleted) query = query.is('deleted_at', null)

      const { data, error } = await query.single()
      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data
    },

    /**
     * Find city by slug and state code
     */
    findBySlug: async (slug: string, stateCode: string, includeDeleted = false): Promise<City | null> => {
      let query = this.client
        .from('cities')
        .select('*')
        .eq('slug', slug)
        .eq('state_code', stateCode)

      if (!includeDeleted) query = query.is('deleted_at', null)

      const { data, error } = await query.maybeSingle()
      if (error) throw error
      return data
    },

    /**
     * Find city by slug only (returns first match if multiple states have same city name)
     * Useful for public pages where state might not be in URL
     */
    findBySlugOnly: async (slug: string, includeDeleted = false): Promise<City | null> => {
      let query = this.client
        .from('cities')
        .select('*')
        .eq('slug', slug)

      if (!includeDeleted) query = query.is('deleted_at', null)

      const { data, error } = await query.limit(1).maybeSingle()
      if (error) throw error
      return data
    },

    /**
     * Find or create a city (upsert with ON CONFLICT DO NOTHING behavior)
     */
    findOrCreate: async (data: CityInsert): Promise<City> => {
      // First try to find existing
      const existing = await this.cities.findBySlug(data.slug, data.state_code)
      if (existing) {
        consola.debug(`Found existing city: ${data.name}, ${data.state_code}`)
        return existing
      }

      // Create new city
      consola.debug(`Creating new city: ${data.name}, ${data.state_code}`)
      const { data: city, error } = await this.client
        .from('cities')
        .insert(data)
        .select()
        .single()

      if (error) {
        consola.error(`Failed to create city "${data.name}, ${data.state_code}":`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        throw new Error(`Database error: ${error.message}${error.hint ? ` (${error.hint})` : ''}`)
      }

      consola.debug(`Created city ${city.id}: ${city.name}, ${city.state_code}`)
      return city
    },

    /**
     * List cities with optional filters
     */
    list: async (options: CityListOptions = {}): Promise<{ cities: City[], total: number }> => {
      const { stateCode, includeDeleted = false, limit = 100, offset = 0 } = options

      let query = this.client.from('cities').select('*', { count: 'exact' })

      if (stateCode) query = query.eq('state_code', stateCode)
      if (!includeDeleted) query = query.is('deleted_at', null)

      query = query.order('name', { ascending: true }).range(offset, offset + limit - 1)

      const { data, error, count } = await query
      if (error) throw error

      return { cities: data || [], total: count || 0 }
    },

    /**
     * Update a city
     */
    update: async (id: string, data: CityUpdate): Promise<City> => {
      const { data: city, error } = await this.client
        .from('cities')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return city
    },

    /**
     * Soft delete a city (checks for active contractors first)
     */
    softDelete: async (id: string): Promise<void> => {
      // Check for active contractors in this city
      const { count, error: countError } = await this.client
        .from('contractors')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', id)
        .eq('status', 'active')
        .is('deleted_at', null)

      if (countError) throw countError
      if (count && count > 0) {
        throw new Error(`Cannot delete city: ${count} active contractor(s) exist`)
      }

      const { error } = await this.client
        .from('cities')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
  }

  // =====================================================
  // SERVICE TYPES NAMESPACE
  // =====================================================

  serviceTypes = {
    /**
     * Find service type by ID
     */
    findById: async (id: string): Promise<ServiceType | null> => {
      const { data, error } = await this.client
        .from('service_types')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data
    },

    /**
     * Find service type by slug
     */
    findBySlug: async (slug: string): Promise<ServiceType | null> => {
      const { data, error } = await this.client
        .from('service_types')
        .select('*')
        .eq('slug', slug)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) throw error
      return data
    },

    /**
     * List all enabled service types (ordered by display_order)
     */
    list: async (includeDisabled = false): Promise<ServiceType[]> => {
      let query = this.client
        .from('service_types')
        .select('*')
        .is('deleted_at', null)
        .order('display_order', { ascending: true })

      if (!includeDisabled) {
        query = query.eq('is_enabled', true)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  }
}

