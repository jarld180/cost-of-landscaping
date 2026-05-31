/**
 * Domain Utility Unit Tests
 *
 * Tests for extractRootDomain() and doDomainsMatch() functions.
 * Validates PSL-backed domain extraction for badge verification.
 */

import { describe, it, expect } from 'vitest'
import { extractRootDomain, doDomainsMatch } from '../../utils/domain'

describe('extractRootDomain', () => {
  describe('full URLs with protocol', () => {
    it('extracts root domain from https URL', () => {
      expect(extractRootDomain('https://www.example.com/page?q=1')).toBe('example.com')
    })

    it('extracts root domain from http URL', () => {
      expect(extractRootDomain('http://example.com/path')).toBe('example.com')
    })

    it('extracts root domain from URL with port', () => {
      expect(extractRootDomain('https://example.com:8080/api')).toBe('example.com')
    })
  })

  describe('subdomains', () => {
    it('extracts root domain from URL with subdomain', () => {
      expect(extractRootDomain('https://blog.example.com')).toBe('example.com')
    })

    it('extracts root domain from URL with multiple subdomains', () => {
      expect(extractRootDomain('https://a.b.c.example.com')).toBe('example.com')
    })

    it('handles www prefix correctly', () => {
      expect(extractRootDomain('https://www.example.com')).toBe('example.com')
    })

    it('handles subdomain without protocol', () => {
      expect(extractRootDomain('blog.example.com')).toBe('example.com')
    })
  })

  describe('bare domains', () => {
    it('returns bare domain as-is', () => {
      expect(extractRootDomain('example.com')).toBe('example.com')
    })

    it('handles domain with trailing slash', () => {
      expect(extractRootDomain('example.com/')).toBe('example.com')
    })
  })

  describe('localhost handling', () => {
    it('returns localhost for bare localhost', () => {
      expect(extractRootDomain('localhost')).toBe('localhost')
    })

    it('returns localhost for localhost with port', () => {
      expect(extractRootDomain('localhost:3000')).toBe('localhost')
    })

    it('returns localhost for http://localhost', () => {
      expect(extractRootDomain('http://localhost')).toBe('localhost')
    })

    it('returns localhost for https://localhost', () => {
      expect(extractRootDomain('https://localhost')).toBe('localhost')
    })

    it('returns localhost for localhost URL with path', () => {
      expect(extractRootDomain('http://localhost:3000/api/test')).toBe('localhost')
    })
  })

  describe('IP addresses', () => {
    it('returns IP address as-is', () => {
      expect(extractRootDomain('192.168.1.1')).toBe('192.168.1.1')
    })

    it('handles IP with protocol', () => {
      expect(extractRootDomain('http://192.168.1.1')).toBe('192.168.1.1')
    })

    it('handles IP with port', () => {
      expect(extractRootDomain('http://192.168.1.1:8080')).toBe('192.168.1.1')
    })

    it('handles loopback IP', () => {
      expect(extractRootDomain('http://127.0.0.1:3000')).toBe('127.0.0.1')
    })
  })

  describe('multi-part TLDs (PSL)', () => {
    it('handles .co.uk correctly', () => {
      expect(extractRootDomain('https://www.example.co.uk')).toBe('example.co.uk')
    })

    it('handles .com.au correctly', () => {
      expect(extractRootDomain('https://blog.example.com.au')).toBe('example.com.au')
    })

    it('handles .org.uk correctly', () => {
      expect(extractRootDomain('https://subdomain.example.org.uk')).toBe('example.org.uk')
    })

    it('handles .co.nz correctly', () => {
      expect(extractRootDomain('example.co.nz')).toBe('example.co.nz')
    })
  })

  describe('private/hosted domains (PSL)', () => {
    it('keeps github.io subdomain as registrable domain', () => {
      // mybiz.github.io is a private domain - the whole thing is the registrable part
      expect(extractRootDomain('mybiz.github.io')).toBe('mybiz.github.io')
    })

    it('handles github.io with subdomain', () => {
      expect(extractRootDomain('https://www.mybiz.github.io')).toBe('mybiz.github.io')
    })

    it('keeps vercel.app subdomain as registrable domain', () => {
      expect(extractRootDomain('myapp.vercel.app')).toBe('myapp.vercel.app')
    })

    it('keeps netlify.app subdomain as registrable domain', () => {
      expect(extractRootDomain('https://mysite.netlify.app')).toBe('mysite.netlify.app')
    })

    it('keeps herokuapp.com subdomain as registrable domain', () => {
      expect(extractRootDomain('myapp.herokuapp.com')).toBe('myapp.herokuapp.com')
    })

    it('keeps pages.dev subdomain as registrable domain', () => {
      expect(extractRootDomain('mysite.pages.dev')).toBe('mysite.pages.dev')
    })
  })

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      expect(extractRootDomain('')).toBeNull()
    })

    it('returns null for whitespace only', () => {
      expect(extractRootDomain('   ')).toBeNull()
    })

    it('returns null for null input', () => {
      expect(extractRootDomain(null as unknown as string)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(extractRootDomain(undefined as unknown as string)).toBeNull()
    })

    it('returns null for non-string input', () => {
      expect(extractRootDomain(123 as unknown as string)).toBeNull()
    })

    it('handles whitespace around valid domain', () => {
      expect(extractRootDomain('  example.com  ')).toBe('example.com')
    })
  })

  describe('case normalization', () => {
    it('normalizes uppercase domains', () => {
      expect(extractRootDomain('EXAMPLE.COM')).toBe('example.com')
    })

    it('normalizes mixed case domains', () => {
      expect(extractRootDomain('Example.Com')).toBe('example.com')
    })

    it('normalizes URLs with uppercase', () => {
      expect(extractRootDomain('https://WWW.EXAMPLE.COM/PATH')).toBe('example.com')
    })
  })
})

describe('doDomainsMatch', () => {
  describe('matching domains', () => {
    it('matches same root domains', () => {
      expect(doDomainsMatch('example.com', 'example.com')).toBe(true)
    })

    it('matches subdomain to root domain', () => {
      expect(doDomainsMatch('blog.example.com', 'example.com')).toBe(true)
    })

    it('matches different subdomains of same root', () => {
      expect(doDomainsMatch('blog.example.com', 'www.example.com')).toBe(true)
    })

    it('matches subdomain to full URL', () => {
      expect(doDomainsMatch('blog.example.com', 'https://www.example.com/page')).toBe(true)
    })

    it('matches URLs with different paths', () => {
      expect(doDomainsMatch('https://example.com/path1', 'https://example.com/path2')).toBe(true)
    })

    it('matches regardless of case', () => {
      expect(doDomainsMatch('EXAMPLE.COM', 'example.com')).toBe(true)
    })
  })

  describe('non-matching domains', () => {
    it('does not match different domains', () => {
      expect(doDomainsMatch('example.com', 'other.com')).toBe(false)
    })

    it('does not match similar but different domains', () => {
      expect(doDomainsMatch('example.com', 'example.org')).toBe(false)
    })

    it('does not match prefix/suffix collisions', () => {
      expect(doDomainsMatch('notexample.com', 'example.com')).toBe(false)
    })
  })

  describe('private domain handling', () => {
    it('does not match different private domains on same suffix', () => {
      // mybiz.github.io and otherbiz.github.io are different registrable domains
      expect(doDomainsMatch('mybiz.github.io', 'otherbiz.github.io')).toBe(false)
    })

    it('matches same private domain', () => {
      expect(doDomainsMatch('mybiz.github.io', 'mybiz.github.io')).toBe(true)
    })

    it('matches private domain with subdomain', () => {
      expect(doDomainsMatch('www.mybiz.github.io', 'mybiz.github.io')).toBe(true)
    })

    it('does not match different vercel.app domains', () => {
      expect(doDomainsMatch('app1.vercel.app', 'app2.vercel.app')).toBe(false)
    })

    it('matches same vercel.app domain', () => {
      expect(doDomainsMatch('myapp.vercel.app', 'https://myapp.vercel.app/page')).toBe(true)
    })
  })

  describe('multi-part TLD handling', () => {
    it('matches co.uk domains correctly', () => {
      expect(doDomainsMatch('www.example.co.uk', 'blog.example.co.uk')).toBe(true)
    })

    it('does not match different co.uk domains', () => {
      expect(doDomainsMatch('foo.co.uk', 'bar.co.uk')).toBe(false)
    })

    it('does not confuse .com with .co.uk', () => {
      expect(doDomainsMatch('example.com', 'example.co.uk')).toBe(false)
    })
  })

  describe('invalid inputs', () => {
    it('returns false for empty first domain', () => {
      expect(doDomainsMatch('', 'example.com')).toBe(false)
    })

    it('returns false for empty second domain', () => {
      expect(doDomainsMatch('example.com', '')).toBe(false)
    })

    it('returns false for both empty', () => {
      expect(doDomainsMatch('', '')).toBe(false)
    })

    it('returns false for null input', () => {
      expect(doDomainsMatch(null as unknown as string, 'example.com')).toBe(false)
    })

    it('returns false for undefined input', () => {
      expect(doDomainsMatch('example.com', undefined as unknown as string)).toBe(false)
    })
  })

  describe('localhost and IP matching', () => {
    it('matches localhost to localhost', () => {
      expect(doDomainsMatch('localhost', 'localhost:3000')).toBe(true)
    })

    it('matches localhost URLs', () => {
      expect(doDomainsMatch('http://localhost:3000', 'http://localhost:4000')).toBe(true)
    })

    it('matches same IP addresses', () => {
      expect(doDomainsMatch('192.168.1.1', 'http://192.168.1.1:8080')).toBe(true)
    })

    it('does not match different IPs', () => {
      expect(doDomainsMatch('192.168.1.1', '192.168.1.2')).toBe(false)
    })
  })
})
