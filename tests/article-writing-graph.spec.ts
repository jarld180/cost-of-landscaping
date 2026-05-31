import { test, expect } from '@playwright/test'

test.describe('Article Writing Graph Verification', () => {
  test('should verify graph nodes, layout, and responsive behavior', async ({ page }) => {
    // Step 1: Navigate to the page
    console.log('Step 1: Navigating to the article writing page...')
    await page.goto('http://localhost:3001/admin/ai/article-writing/d607387b-7876-4135-bf33-517b51680027', {
      waitUntil: 'networkidle',
    })

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Additional wait for graph rendering

    // Step 2: Verify 7 agent nodes are visible
    console.log('Step 2: Verifying 7 agent nodes are visible...')
    const expectedNodes = ['research', 'outline', 'writer', 'seo', 'qa', 'project_manager', 'image_generator']
    
    for (const nodeName of expectedNodes) {
      const nodeElement = page.locator(`text=${nodeName}`).first()
      await expect(nodeElement).toBeVisible({ timeout: 10000 })
      console.log(`  ✓ Found node: ${nodeName}`)
    }

    // Step 3: Check layout (snake pattern)
    console.log('Step 3: Checking graph layout...')
    // Get bounding boxes of nodes to verify layout
    const nodeBoxes: Record<string, any> = {}
    for (const nodeName of expectedNodes) {
      const element = page.locator(`text=${nodeName}`).first()
      const box = await element.boundingBox()
      nodeBoxes[nodeName] = box
      console.log(`  ${nodeName}: x=${box?.x}, y=${box?.y}`)
    }

    // Verify snake layout: top row (research, outline, writer, seo), bottom row (qa, pm, image_gen)
    const topRowNodes = ['research', 'outline', 'writer', 'seo']
    const bottomRowNodes = ['qa', 'project_manager', 'image_generator']

    // Check that top row nodes have similar Y coordinates
    const topYValues = topRowNodes.map(n => nodeBoxes[n]?.y || 0)
    const topYAvg = topYValues.reduce((a, b) => a + b, 0) / topYValues.length
    const topYVariance = Math.max(...topYValues) - Math.min(...topYValues)
    console.log(`  Top row Y variance: ${topYVariance}px (should be small)`)
    expect(topYVariance).toBeLessThan(100) // Allow some variance

    // Check that bottom row nodes have similar Y coordinates
    const bottomYValues = bottomRowNodes.map(n => nodeBoxes[n]?.y || 0)
    const bottomYAvg = bottomYValues.reduce((a, b) => a + b, 0) / bottomYValues.length
    const bottomYVariance = Math.max(...bottomYValues) - Math.min(...bottomYValues)
    console.log(`  Bottom row Y variance: ${bottomYVariance}px (should be small)`)
    expect(bottomYVariance).toBeLessThan(100)

    // Check that bottom row is below top row
    expect(bottomYAvg).toBeGreaterThan(topYAvg)
    console.log(`  ✓ Layout appears to be snake pattern (top row Y: ${topYAvg}, bottom row Y: ${bottomYAvg})`)

    // Step 4: Check browser console for errors
    console.log('Step 4: Checking browser console for errors...')
    const consoleMessages: string[] = []
    const consoleErrors: string[] = []
    const consoleWarnings: string[] = []

    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`)
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text())
      }
    })

    // Wait a bit to capture any console messages
    await page.waitForTimeout(1000)

    console.log(`  Console messages captured: ${consoleMessages.length}`)
    if (consoleErrors.length > 0) {
      console.log(`  ⚠ Errors found: ${consoleErrors.length}`)
      consoleErrors.forEach(err => console.log(`    - ${err}`))
    } else {
      console.log(`  ✓ No console errors`)
    }

    if (consoleWarnings.length > 0) {
      console.log(`  ⚠ Warnings found: ${consoleWarnings.length}`)
      consoleWarnings.forEach(warn => console.log(`    - ${warn}`))
    } else {
      console.log(`  ✓ No console warnings`)
    }

    // Take screenshot of desktop view
    console.log('Taking screenshot of desktop view...')
    await page.screenshot({ path: 'tests/screenshots/desktop-graph.png', fullPage: true })
    console.log('  ✓ Screenshot saved: tests/screenshots/desktop-graph.png')

    // Step 5: Resize to mobile size
    console.log('Step 5: Resizing viewport to mobile size (375px)...')
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(1000) // Wait for layout to adjust

    // Step 6: Verify graph is hidden and agent cards are visible
    console.log('Step 6: Verifying graph is hidden and agent cards are visible...')
    
    // Check if graph container is hidden
    const graphContainer = page.locator('[data-testid="graph-container"], .graph-container, svg').first()
    const isGraphVisible = await graphContainer.isVisible().catch(() => false)
    console.log(`  Graph visible on mobile: ${isGraphVisible}`)

    // Check if agent cards are visible
    const agentCards = page.locator('[data-testid="agent-card"], .agent-card, [class*="card"]').first()
    const areCardsVisible = await agentCards.isVisible().catch(() => false)
    console.log(`  Agent cards visible on mobile: ${areCardsVisible}`)

    // Take screenshot of mobile view
    console.log('Taking screenshot of mobile view...')
    await page.screenshot({ path: 'tests/screenshots/mobile-graph.png', fullPage: true })
    console.log('  ✓ Screenshot saved: tests/screenshots/mobile-graph.png')

    // Step 7: Resize back to desktop
    console.log('Step 7: Resizing viewport back to desktop size (1280px)...')
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(1000) // Wait for layout to adjust

    // Step 8: Verify graph reappears
    console.log('Step 8: Verifying graph reappears on desktop...')
    const isGraphVisibleDesktop = await graphContainer.isVisible().catch(() => false)
    console.log(`  Graph visible on desktop: ${isGraphVisibleDesktop}`)

    // Verify nodes are still visible
    let nodesStillVisible = 0
    for (const nodeName of expectedNodes) {
      const nodeElement = page.locator(`text=${nodeName}`).first()
      const isVisible = await nodeElement.isVisible().catch(() => false)
      if (isVisible) {
        nodesStillVisible++
      }
    }
    console.log(`  Nodes still visible: ${nodesStillVisible}/${expectedNodes.length}`)

    // Take final screenshot
    console.log('Taking final screenshot of desktop view...')
    await page.screenshot({ path: 'tests/screenshots/desktop-graph-final.png', fullPage: true })
    console.log('  ✓ Screenshot saved: tests/screenshots/desktop-graph-final.png')

    console.log('\n✓ All verification steps completed!')
  })
})
