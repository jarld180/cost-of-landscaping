import { describe, it, expect } from 'vitest'
import { sanitizeSecondaryKeywords } from '../../utils/sanitize'

describe('sanitizeSecondaryKeywords', () => {
  it('sanitizes secondaryKeywords: trims, dedupes, and filters empty', () => {
    const input = ['  foo  ', 'bar', '', 'foo', '  ', 'baz']
    const result = sanitizeSecondaryKeywords(input)
    expect(result).toEqual(['foo', 'bar', 'baz'])
  })

  it('returns undefined when input is undefined', () => {
    const result = sanitizeSecondaryKeywords(undefined)
    expect(result).toBeUndefined()
  })

  it('returns empty array when all keywords are empty or whitespace', () => {
    const input = ['', '  ', '\t', '\n']
    const result = sanitizeSecondaryKeywords(input)
    expect(result).toEqual([])
  })

  it('limits keywords to maximum 10 items', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']
    const result = sanitizeSecondaryKeywords(input)
    expect(result).toHaveLength(10)
    expect(result).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])
  })

  it('preserves case-sensitive duplicates (only exact matches are deduped)', () => {
    const input = ['Foo', 'foo', 'FOO', 'bar']
    const result = sanitizeSecondaryKeywords(input)
    expect(result).toEqual(['Foo', 'foo', 'FOO', 'bar'])
  })

  it('handles single keyword', () => {
    const input = ['  single  ']
    const result = sanitizeSecondaryKeywords(input)
    expect(result).toEqual(['single'])
  })

  it('handles empty array', () => {
    const input: string[] = []
    const result = sanitizeSecondaryKeywords(input)
    expect(result).toEqual([])
  })
})
