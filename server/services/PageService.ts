/**
 * Page Service
 *
 * Business logic layer for page management.
 * Handles slug generation, path management, template validation, and SEO operations.
 */

import { consola } from 'consola'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/supabase'
import { PageRepository } from '../repositories/PageRepository'
import { PageTemplateService } from './PageTemplateService'
import type { TemplateSlug } from '../../app/types/templates'
import type {
  SEOMetadata,
  OpenGraphMetadata,
  TwitterCardMetadata,
  SchemaOrgData,
  SchemaOrgArticle,
  SchemaOrgBreadcrumbList
} from '../config/seo-schemas'

type Page = Database['public']['Tables']['pages']['Row']
type PageInsert = Database['public']['Tables']['pages']['Insert']
type PageUpdate = Database['public']['Tables']['pages']['Update']

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface CreatePageData {
  parentId?: string | null
  slug?: string
  title: string
  description?: string
  content: string
  template: TemplateSlug  // Now required
  status?: 'draft' | 'published' | 'archived'

  // Basic SEO fields
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string[]
  focusKeyword?: string

  // Open Graph fields
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: string

  // Twitter Card fields
  twitterCard?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string

  // Schema.org fields
  schemaType?: string

  // Advanced SEO fields
  metaRobots?: string[]
  sitemapPriority?: number
  sitemapChangefreq?: string
  canonicalUrl?: string
  redirectUrl?: string
  redirectType?: number

  metadata?: any
}

export interface UpdatePageData {
  slug?: string
  title?: string
  description?: string | null
  content?: string
  template?: TemplateSlug
  status?: 'draft' | 'published' | 'archived'
  metaTitle?: string | null
  metaKeywords?: string[] | null
  ogImage?: string | null
  focusKeyword?: string | null
  metaRobots?: string[] | null
  sitemapPriority?: number | null
  sitemapChangefreq?: string | null
  canonicalUrl?: string | null
  redirectUrl?: string | null
  redirectType?: number | null
  metadata?: any | null
  publishedAt?: string | null

  // SEO metadata fields (stored in metadata.seo)
  metaDescription?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogType?: string | null
  twitterCard?: string | null
  twitterTitle?: string | null
  twitterDescription?: string | null
  twitterImage?: string | null
  schemaType?: string | null
}

export class PageService {
  public repository: PageRepository
  private templateService: PageTemplateService

  constructor(client: SupabaseClient<Database>) {
    this.repository = new PageRepository(client)
    this.templateService = new PageTemplateService(client)
  }

  // =====================================================
  // SLUG MANAGEMENT
  // =====================================================

  /**
   * Generate a URL-friendly slug from a title
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  }

  /**
   * Validate slug format
   */
  validateSlug(slug: string): ValidationResult {
    const errors: string[] = []

    if (!slug || slug.length === 0) {
      errors.push('Slug cannot be empty')
    }

    if (slug.length > 100) {
      errors.push('Slug cannot exceed 100 characters')
    }

    // Check format: lowercase letters, numbers, and hyphens only
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      errors.push('Slug must contain only lowercase letters, numbers, and hyphens')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if slug is available under a parent
   */
  async isSlugAvailable(slug: string, parentId: string | null, excludeId?: string): Promise<boolean> {
    return !(await this.repository.slugExists(slug, parentId, excludeId))
  }

  /**
   * Generate a unique slug by appending -2, -3, etc. if the base slug exists
   */
  async generateUniqueSlug(baseSlug: string, parentId: string | null): Promise<string> {
    if (await this.isSlugAvailable(baseSlug, parentId)) {
      return baseSlug
    }

    let counter = 2
    let uniqueSlug = `${baseSlug}-${counter}`
    
    while (!(await this.isSlugAvailable(uniqueSlug, parentId))) {
      counter++
      uniqueSlug = `${baseSlug}-${counter}`
      if (counter > 100) {
        throw new Error(`Unable to generate unique slug for '${baseSlug}' after 100 attempts`)
      }
    }
    
    return uniqueSlug
  }

  // =====================================================
  // PATH MANAGEMENT
  // =====================================================

  /**
   * Generate full path for a page
   */
  async generateFullPath(slug: string, parentId?: string | null): Promise<string> {
    if (!parentId) {
      return `/${slug}`
    }

    const parent = await this.repository.findById(parentId)
    if (!parent) {
      throw new Error(`Parent page not found: ${parentId}`)
    }

    return `${parent.full_path}/${slug}`
  }

  /**
   * Calculate depth based on parent
   */
  async calculateDepth(parentId?: string | null): Promise<number> {
    if (!parentId) {
      return 0
    }

    const parent = await this.repository.findById(parentId)
    if (!parent) {
      throw new Error(`Parent page not found: ${parentId}`)
    }

    return parent.depth + 1
  }

  // =====================================================
  // TEMPLATE MANAGEMENT
  // =====================================================

  /**
   * Validate template slug against database
   */
  async validateTemplate(template: string): Promise<ValidationResult> {
    if (import.meta.dev) {
      consola.info('[PageService] validateTemplate() - Validating template', { template })
    }

    try {
      const isValid = await this.templateService.validateTemplateSlug(template)

      if (!isValid) {
        if (import.meta.dev) {
          consola.warn(`[PageService] validateTemplate() - Invalid template: ${template}`)
        }
        return {
          valid: false,
          errors: [`Template '${template}' does not exist or is not enabled`]
        }
      }

      if (import.meta.dev) {
        consola.success(`[PageService] validateTemplate() - Template valid: ${template}`)
      }

      return { valid: true, errors: [] }
    } catch (error) {
      if (import.meta.dev) {
        consola.error('[PageService] validateTemplate() - Error:', error)
      }
      return {
        valid: false,
        errors: ['Failed to validate template']
      }
    }
  }

  /**
   * Validate template metadata against schema
   * TODO: Implement JSON Schema validation with ajv
   */
  validateTemplateMetadata(template: TemplateSlug, metadata: any): ValidationResult {
    // For now, just check if metadata is an object
    if (metadata && typeof metadata !== 'object') {
      return {
        valid: false,
        errors: ['Template metadata must be an object']
      }
    }

    // TODO: Add ajv validation against template schema
    return { valid: true, errors: [] }
  }

  // =====================================================
  // SEO OPERATIONS
  // =====================================================

  /**
   * Validate meta robots directives
   */
  validateMetaRobots(robots: string[]): ValidationResult {
    const validDirectives = [
      'index', 'noindex', 'follow', 'nofollow',
      'noarchive', 'nosnippet', 'noimageindex',
      'notranslate', 'none', 'all'
    ]

    const errors: string[] = []

    for (const directive of robots) {
      if (!validDirectives.includes(directive)) {
        errors.push(`Invalid meta robots directive: ${directive}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate sitemap priority based on depth
   */
  generateSitemapPriority(depth: number): number {
    if (depth === 0) return 1.0
    if (depth === 1) return 0.8
    if (depth === 2) return 0.6
    return 0.5
  }

  /**
   * Validate SEO metadata structure
   */
  validateSEOMetadata(seoData: SEOMetadata): ValidationResult {
    const errors: string[] = []

    // Validate Open Graph if present
    if (seoData.og) {
      if (seoData.og.type && !['website', 'article', 'book', 'profile', 'video', 'music'].includes(seoData.og.type)) {
        errors.push(`Invalid Open Graph type: ${seoData.og.type}`)
      }
    }

    // Validate Twitter Card if present
    if (seoData.twitter) {
      if (seoData.twitter.card && !['summary', 'summary_large_image', 'app', 'player'].includes(seoData.twitter.card)) {
        errors.push(`Invalid Twitter card type: ${seoData.twitter.card}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate Schema.org Article structured data
   */
  generateSchemaOrgArticle(page: Page): SchemaOrgArticle {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.meta_title || page.title,
      description: page.description || undefined,
      image: page.og_image || undefined,
      datePublished: page.published_at || page.created_at || undefined,
      dateModified: page.updated_at || undefined,
      author: {
        '@type': 'Organization',
        name: 'Cost of Landscaping'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Cost of Landscaping',
        logo: {
          '@type': 'ImageObject',
          url: 'https://example.com/logo.png' // TODO: Make configurable
        }
      }
    }
  }

  /**
   * Generate breadcrumb structured data
   */
  async generateBreadcrumbSchema(pageId: string): Promise<SchemaOrgBreadcrumbList> {
    const breadcrumbs = await this.repository.getBreadcrumbs(pageId)

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((page, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: page.title,
        item: `https://example.com${page.full_path}` // TODO: Make base URL configurable
      }))
    }
  }

  /**
   * Generate Open Graph tags from page data
   */
  generateOpenGraphTags(page: Page): OpenGraphMetadata {
    return {
      title: page.meta_title || page.title,
      description: page.description || undefined,
      type: page.depth === 0 ? 'website' : 'article',
      url: `https://example.com${page.full_path}`, // TODO: Make base URL configurable
      site_name: 'Cost of Landscaping', // TODO: Make configurable
      locale: 'en_US',
      image: page.og_image || undefined
    }
  }

  /**
   * Generate Twitter Card tags from page data
   */
  generateTwitterCardTags(page: Page): TwitterCardMetadata {
    return {
      card: 'summary_large_image',
      title: page.meta_title || page.title,
      description: page.description || undefined,
      image: page.og_image || undefined
    }
  }

  // =====================================================
  // CRUD OPERATIONS
  // =====================================================

  /**
   * Create a new page
   */
  async createPage(data: CreatePageData): Promise<Page> {
    // Generate slug if not provided
    const slug = data.slug || this.generateSlug(data.title)

    // Validate slug
    const slugValidation = this.validateSlug(slug)
    if (!slugValidation.valid) {
      throw new Error(`Invalid slug: ${slugValidation.errors.join(', ')}`)
    }

    // Check if slug is available
    const isAvailable = await this.isSlugAvailable(slug, data.parentId || null)
    if (!isAvailable) {
      throw new Error(`Slug '${slug}' already exists under this parent`)
    }

    // Calculate depth and full path
    const depth = await this.calculateDepth(data.parentId)
    const fullPath = await this.generateFullPath(slug, data.parentId)

    // Template is now required
    if (!data.template) {
      throw new Error('Template is required')
    }
    const template = data.template

    // Validate template against database
    const templateValidation = await this.validateTemplate(template)
    if (!templateValidation.valid) {
      throw new Error(`Invalid template: ${templateValidation.errors.join(', ')}`)
    }

    // Get default metadata from database
    const defaultMetadata = await this.templateService.getTemplateDefaultMetadata(template)

    // Build SEO metadata structure
    const seoMetadata: any = {
      ...(data.metadata?.seo || {})
    }

    // Add metaDescription to SEO metadata if provided
    if (data.metaDescription) {
      seoMetadata.metaDescription = data.metaDescription
    }

    // Add Open Graph data if provided
    if (data.ogTitle || data.ogDescription || data.ogImage || data.ogType) {
      seoMetadata.og = {
        ...(seoMetadata.og || {}),
        ...(data.ogTitle && { title: data.ogTitle }),
        ...(data.ogDescription && { description: data.ogDescription }),
        ...(data.ogImage && { image: data.ogImage }),
        ...(data.ogType && { type: data.ogType })
      }
    }

    // Add Twitter Card data if provided
    if (data.twitterCard || data.twitterTitle || data.twitterDescription || data.twitterImage) {
      seoMetadata.twitter = {
        ...(seoMetadata.twitter || {}),
        ...(data.twitterCard && { card: data.twitterCard }),
        ...(data.twitterTitle && { title: data.twitterTitle }),
        ...(data.twitterDescription && { description: data.twitterDescription }),
        ...(data.twitterImage && { image: data.twitterImage })
      }
    }

    // Add Schema.org data if provided
    if (data.schemaType) {
      seoMetadata.schema = {
        ...(seoMetadata.schema || {}),
        '@context': 'https://schema.org',
        '@type': data.schemaType
      }
    }

    // Build template metadata structure
    // Support both direct metadata (from form) and nested metadata.template (from API)
    const templateMetadata = data.metadata?.template
      ? { ...defaultMetadata, ...data.metadata.template }
      : { ...defaultMetadata, ...(data.metadata || {}) }

    const metadata = {
      template: templateMetadata,
      seo: seoMetadata
    }

    // Generate SEO defaults
    const sitemapPriority = data.sitemapPriority ?? this.generateSitemapPriority(depth)
    // Note: canonicalUrl is intentionally left null if not explicitly provided
    // The frontend SEO composable (usePageSeo) handles self-referencing canonicals via full_path fallback

    // Validate meta robots if provided
    if (data.metaRobots) {
      const robotsValidation = this.validateMetaRobots(data.metaRobots)
      if (!robotsValidation.valid) {
        throw new Error(`Invalid meta robots: ${robotsValidation.errors.join(', ')}`)
      }
    }

    // Create page data
    const pageData: PageInsert = {
      parent_id: data.parentId || null,
      slug,
      full_path: fullPath,
      depth,
      template,
      title: data.title,
      description: data.description || null, // Store actual description, not metaDescription
      content: data.content,
      status: data.status || 'draft',
      meta_title: data.metaTitle || null,
      meta_keywords: data.metaKeywords || null,
      og_image: data.ogImage || null,
      focus_keyword: data.focusKeyword || null,
      meta_robots: data.metaRobots || ['index', 'follow'],
      sitemap_priority: sitemapPriority,
      sitemap_changefreq: data.sitemapChangefreq || 'weekly',
      canonical_url: data.canonicalUrl || null,
      redirect_url: data.redirectUrl || null,
      redirect_type: data.redirectType || null,
      metadata,
      published_at: data.status === 'published' ? new Date().toISOString() : null
    }

    return await this.repository.create(pageData)
  }

  /**
   * Update an existing page
   */
  async updatePage(id: string, data: UpdatePageData): Promise<Page> {
    // Get existing page
    const existingPage = await this.repository.findById(id)
    if (!existingPage) {
      throw new Error(`Page not found: ${id}`)
    }

    const updateData: PageUpdate = {}

    // Handle slug change
    if (data.slug && data.slug !== existingPage.slug) {
      const slugValidation = this.validateSlug(data.slug)
      if (!slugValidation.valid) {
        throw new Error(`Invalid slug: ${slugValidation.errors.join(', ')}`)
      }

      const isAvailable = await this.isSlugAvailable(data.slug, existingPage.parent_id, id)
      if (!isAvailable) {
        throw new Error(`Slug '${data.slug}' already exists under this parent`)
      }

      updateData.slug = data.slug
      updateData.full_path = await this.generateFullPath(data.slug, existingPage.parent_id)
      // Note: Don't auto-set canonical_url on slug change - let it remain as user set it
      // If user wants canonical to match new URL, they can update it explicitly
    }

    // Handle template change
    if (data.template && data.template !== existingPage.template) {
      const templateValidation = await this.validateTemplate(data.template)
      if (!templateValidation.valid) {
        throw new Error(`Invalid template: ${templateValidation.errors.join(', ')}`)
      }

      updateData.template = data.template
    }

    // Handle other fields
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.content !== undefined) updateData.content = data.content
    if (data.status !== undefined) {
      updateData.status = data.status
      // Set published_at when publishing
      if (data.status === 'published' && !existingPage.published_at) {
        updateData.published_at = new Date().toISOString()
      }
    }
    if (data.metaTitle !== undefined) updateData.meta_title = data.metaTitle
    if (data.metaKeywords !== undefined) updateData.meta_keywords = data.metaKeywords
    if (data.ogImage !== undefined) updateData.og_image = data.ogImage
    if (data.focusKeyword !== undefined) updateData.focus_keyword = data.focusKeyword
    if (data.sitemapPriority !== undefined) updateData.sitemap_priority = data.sitemapPriority
    if (data.sitemapChangefreq !== undefined) updateData.sitemap_changefreq = data.sitemapChangefreq
    if (data.canonicalUrl !== undefined) updateData.canonical_url = data.canonicalUrl
    if (data.redirectUrl !== undefined) updateData.redirect_url = data.redirectUrl
    if (data.redirectType !== undefined) updateData.redirect_type = data.redirectType
    if (data.publishedAt !== undefined) updateData.published_at = data.publishedAt

    // Validate and update meta robots
    if (data.metaRobots) {
      const robotsValidation = this.validateMetaRobots(data.metaRobots)
      if (!robotsValidation.valid) {
        throw new Error(`Invalid meta robots: ${robotsValidation.errors.join(', ')}`)
      }
      updateData.meta_robots = data.metaRobots
    }

    // Handle metadata update - merge with existing structure
    // Metadata structure: { template: {...}, seo: {...} }
    const existingMetadata = (existingPage.metadata as any) || {}
    const existingSeo = existingMetadata.seo || {}
    const existingTemplate = existingMetadata.template || {}

    // Build updated SEO metadata
    const seoMetadata: any = { ...existingSeo }

    // Update metaDescription if provided
    if (data.metaDescription !== undefined) {
      seoMetadata.metaDescription = data.metaDescription || undefined
    }

    // Update Open Graph data if any OG fields provided
    if (data.ogTitle !== undefined || data.ogDescription !== undefined || data.ogImage !== undefined || data.ogType !== undefined) {
      seoMetadata.og = {
        ...(seoMetadata.og || {}),
        ...(data.ogTitle !== undefined && { title: data.ogTitle || undefined }),
        ...(data.ogDescription !== undefined && { description: data.ogDescription || undefined }),
        ...(data.ogImage !== undefined && { image: data.ogImage || undefined }),
        ...(data.ogType !== undefined && { type: data.ogType || undefined })
      }
    }

    // Update Twitter Card data if any Twitter fields provided
    if (data.twitterCard !== undefined || data.twitterTitle !== undefined || data.twitterDescription !== undefined || data.twitterImage !== undefined) {
      seoMetadata.twitter = {
        ...(seoMetadata.twitter || {}),
        ...(data.twitterCard !== undefined && { card: data.twitterCard || undefined }),
        ...(data.twitterTitle !== undefined && { title: data.twitterTitle || undefined }),
        ...(data.twitterDescription !== undefined && { description: data.twitterDescription || undefined }),
        ...(data.twitterImage !== undefined && { image: data.twitterImage || undefined })
      }
    }

    // Update Schema.org data if schemaType provided
    if (data.schemaType !== undefined) {
      if (data.schemaType) {
        seoMetadata.schema = {
          ...(seoMetadata.schema || {}),
          '@context': 'https://schema.org',
          '@type': data.schemaType
        }
      } else {
        // Clear schema if empty
        delete seoMetadata.schema
      }
    }

    // Build updated template metadata
    const templateMetadata = data.metadata !== undefined
      ? { ...existingTemplate, ...data.metadata }
      : existingTemplate

    // Set the complete merged metadata
    updateData.metadata = {
      template: templateMetadata,
      seo: seoMetadata
    }

    return await this.repository.update(id, updateData)
  }

  /**
   * Get page by ID
   */
  async getPageById(id: string): Promise<Page | null> {
    return await this.repository.findById(id)
  }

  /**
   * Get page by path
   */
  async getPageByPath(path: string): Promise<Page | null> {
    return await this.repository.findByPath(path)
  }

  /**
   * Delete page (soft delete)
   */
  async deletePage(id: string): Promise<void> {
    await this.repository.softDelete(id)
  }

  /**
   * Get breadcrumbs for a page
   */
  async getBreadcrumbs(pageId: string): Promise<Page[]> {
    return await this.repository.getBreadcrumbs(pageId)
  }

  /**
   * Get children of a page
   */
  async getChildren(pageId: string, includeDescendants = false): Promise<Page[]> {
    if (includeDescendants) {
      return await this.repository.getDescendants(pageId)
    }
    return await this.repository.getChildren(pageId)
  }
}

