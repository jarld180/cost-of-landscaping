import { describe, expect, it } from 'vitest'
import {
  addBadgeUtm,
  getOwnerBadgeHtml,
  getOwnerBadgeUrl,
  getOwnerProfilePath,
  getOwnerProfileUrl,
} from '../../utils/ownerBadge'

const contractor = {
  slug: 'abc-concrete',
  city: {
    slug: 'louisville',
    stateCode: 'KY',
  },
}

describe('owner badge helpers', () => {
  it('builds the public contractor profile path', () => {
    expect(getOwnerProfilePath(contractor)).toBe('/kentucky/louisville/concrete-contractors/abc-concrete')
  })

  it('builds profile URLs with badge UTM parameters', () => {
    expect(getOwnerProfileUrl(contractor, 'https://costofconcrete.com', true)).toBe(
      'https://costofconcrete.com/kentucky/louisville/concrete-contractors/abc-concrete?utm_source=verified_badge&utm_medium=embed&utm_campaign=badge'
    )
  })

  it('uses ampersand when adding UTM parameters to a URL with existing query params', () => {
    expect(addBadgeUtm('https://costofconcrete.com/profile?existing=1')).toBe(
      'https://costofconcrete.com/profile?existing=1&utm_source=verified_badge&utm_medium=embed&utm_campaign=badge'
    )
  })

  it('builds badge image URLs for SVG and PNG formats', () => {
    const token = '11111111-1111-4111-8111-111111111111'

    expect(getOwnerBadgeUrl(token, 'https://costofconcrete.com', 'svg')).toBe(
      'https://costofconcrete.com/api/public/badges/11111111-1111-4111-8111-111111111111.svg'
    )
    expect(getOwnerBadgeUrl(token, 'https://costofconcrete.com', 'png')).toBe(
      'https://costofconcrete.com/api/public/badges/11111111-1111-4111-8111-111111111111.png'
    )
  })

  it('preserves the canonical badge HTML required for auto-verification', () => {
    const token = '11111111-1111-4111-8111-111111111111'
    const html = getOwnerBadgeHtml(
      token,
      'https://costofconcrete.com/kentucky/louisville/concrete-contractors/abc-concrete',
      'https://costofconcrete.com',
      'svg'
    )

    expect(html).toContain('/api/public/badges/11111111-1111-4111-8111-111111111111.svg')
    expect(html).toContain('utm_source=verified_badge&utm_medium=embed&utm_campaign=badge')
    expect(html).toContain('alt="Verified on Cost of Concrete"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
    expect(html).toContain('referrerpolicy="origin"')
  })
})
