import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

await mkdir('test-results/visual', { recursive: true })
const browser = await chromium.launch({ headless: true })
const previewUrl = process.env.DNA_PREVIEW_URL || 'http://127.0.0.1:5180'
for (const [name, width, height] of [
  ['desktop', 1440, 1000],
  ['mobile', 390, 844],
  ['wide', 1920, 1080],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    reducedMotion: 'reduce',
  })
  await page.goto(previewUrl)
  await page.evaluate(() => document.fonts.ready)
  for (const section of ['top', 'work', 'approach', 'services', 'contact']) {
    await page
      .locator(`#${section}`)
      .evaluate((element) =>
        element.scrollIntoView({ block: 'start', behavior: 'instant' }),
      )
    await page.screenshot({
      path: `test-results/visual/${name}-${section}.png`,
    })
  }
  for (const route of [
    'about',
    'people',
    'work',
    'services/ai',
    'services/plans',
    'privacy',
    'sms',
  ]) {
    await page.goto(`${previewUrl}/#/${route}`)
    await page.locator('.chapter-dialog').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: `test-results/visual/${name}-chapter-${route.replace('/', '-')}.png`,
    })
  }
  await page.close()
}
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto(previewUrl)
await page.waitForTimeout(1500)
await page.screenshot({ path: 'test-results/visual/desktop-motion-hero.png' })
await page.locator('#work').scrollIntoViewIfNeeded()
await page.waitForTimeout(1500)
await page.screenshot({ path: 'test-results/visual/desktop-motion-work.png' })
const storyPositions = await page
  .locator('.work-marker')
  .evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().top + scrollY),
  )
for (const [label, position] of [
  ['hero-rotation', 450],
  ['project-overlap', storyPositions[1] - 600],
  ['final-project', storyPositions[1] + 80],
  ['project-release', storyPositions[1] + 650],
]) {
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: 'instant' }),
    position,
  )
  await page.waitForTimeout(750)
  await page.screenshot({ path: `test-results/visual/desktop-${label}.png` })
}
await page
  .locator('#contact')
  .evaluate((element) =>
    element.scrollIntoView({ block: 'start', behavior: 'instant' }),
  )
await page.waitForTimeout(300)
await page.screenshot({ path: 'test-results/visual/desktop-footer.png' })
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(previewUrl)
await page.getByRole('button', { name: 'Open navigation' }).click()
await page.waitForTimeout(100)
await page.screenshot({ path: 'test-results/visual/mobile-menu-opening.png' })
await page.waitForTimeout(900)
await page.screenshot({ path: 'test-results/visual/mobile-menu-open.png' })
await browser.close()
console.log(
  'Captured responsive layouts, rotating panels, menu stages, and the contact footer.',
)
