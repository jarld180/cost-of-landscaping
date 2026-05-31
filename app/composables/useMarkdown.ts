import { marked, type Tokens } from 'marked'
import { computed, type Ref } from 'vue'

/**
 * Generate a URL-safe slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Collapse multiple hyphens
}

/**
 * Custom renderer that adds IDs to headings for TOC linking
 */
const headingRenderer = {
  heading({ tokens, depth }: Tokens.Heading): string {
    const text = tokens.map(t => ('text' in t ? t.text : '')).join('')
    const id = slugify(text)
    return `<h${depth} id="${id}">${marked.parser(tokens)}</h${depth}>\n`
  }
}

// Configure marked with custom renderer
marked.use({ renderer: headingRenderer })

/**
 * Composable for rendering markdown content
 *
 * Features:
 * - Converts markdown to HTML using 'marked' library
 * - Adds IDs to headings for TOC navigation
 * - Configures marked for optimal rendering
 * - Returns reactive HTML content
 *
 * @param markdown - Markdown string (can be reactive)
 * @returns Object with html property containing rendered HTML
 *
 * @example
 * ```ts
 * const { html } = useMarkdown(page.content)
 * ```
 *
 * @example
 * ```vue
 * <template>
 *   <div v-html="html" class="prose" />
 * </template>
 * ```
 */
export function useMarkdown(markdown: string | Ref<string>) {
  // Configure marked options
  marked.setOptions({
    // Enable GitHub Flavored Markdown
    gfm: true,

    // Don't break on single line breaks (use two line breaks)
    breaks: false,

    // Use smarter list behavior
    pedantic: false

    // Sanitize HTML in markdown (security)
    // Note: marked v5+ removed built-in sanitization
    // We'll handle this with DOMPurify if needed in the future
  })

  // Create computed property for reactive markdown
  const html = computed(() => {
    const markdownText = typeof markdown === 'string' ? markdown : markdown.value

    if (!markdownText) {
      return ''
    }

    try {
      // Parse markdown to HTML
      const rendered = marked.parse(markdownText, { async: false }) as string

      // Return rendered HTML
      // Note: In production, consider adding DOMPurify for additional sanitization
      return rendered
    } catch (error) {
      if (import.meta.dev) {
        console.error('Error rendering markdown:', error)
      }
      return '<p>Error rendering content</p>'
    }
  })

  return {
    html
  }
}

