import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'

describe('Composable test setup', () => {
  it('can use Vue ref', () => {
    const count = ref(0)
    expect(count.value).toBe(0)
  })

  it('can use Vue computed', () => {
    const count = ref(5)
    const doubled = computed(() => count.value * 2)
    expect(doubled.value).toBe(10)
  })

  it('has $fetch mocked globally', () => {
    expect(globalThis.$fetch).toBeDefined()
  })
})
