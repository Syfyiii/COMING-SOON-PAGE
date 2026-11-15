import { test, expect } from '@playwright/test'
import { inquiryEndpoint } from '../src/inquiry-config.js'

test('manual playback on mobile selects the 1080p film without preloading it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const video = page.locator('video')
  await expect(video).not.toHaveAttribute('src')
  // Let the 300 ms deferred autoplay check settle before the manual-play assertion.
  await page.waitForTimeout(350)
  await page.getByRole('button', { name: 'Play background film' }).click()
  await expect(video).toHaveAttribute('src', '/media/all-stages-hero.mp4')
  // Decoded dimensions are checked in Chromium performance tests; Windows WebKit reports poster dimensions.
  await expect
    .poll(() => video.evaluate(element => element.currentTime > 0 && !element.paused))
    .toBe(true)
  await page.getByRole('button', { name: 'Pause background film' }).click()
  await expect.poll(() => video.evaluate(element => element.paused)).toBe(true)
})

test('navigation photograph loads when the tablet menu becomes visible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  const photo = page.locator('.menu-photograph')
  await expect(photo).toBeVisible()
  await expect
    .poll(() => photo.evaluate(image => image.complete && image.naturalWidth > 0))
    .toBe(true)
  await page.getByRole('button', { name: 'Close navigation' }).click()
  await expect(page.getByRole('dialog', { name: 'Navigation' })).not.toBeVisible()
})

test('chapters, keyboard tabs and close work across browser engines', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/services/')
  await expect(page.locator('#chapter-title')).toBeVisible()
  await expect(page.locator('#chapter-title')).toHaveCSS('font-family', /DNA Display/)
  const ai = page.getByRole('tab', { name: 'AI integrations' })
  await ai.click()
  await expect(page).toHaveURL(/\/services\/ai-call-center\/$/)
  await expect(ai).toBeFocused()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Discuss the call center' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.site-panel[open]')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('a failed inquiry preserves visitor details across browser engines', async ({
  page,
}) => {
  await page.route(inquiryEndpoint, (route) =>
    route.fulfill({
      status: 503,
      json: { status: 'unavailable', error: 'Offline' },
    }),
  )
  await page.goto('/services/ai-call-center/')
  await page.getByRole('button', { name: 'Discuss the call center' }).click()
  await page.getByLabel('Your name', { exact: true }).fill('Browser test')
  await page.getByLabel('Work email', { exact: true }).fill('test@example.com')
  await page.getByLabel('Brand / business', { exact: true }).fill('Test brand')
  await page
    .getByLabel('What do you want to move forward?')
    .fill('Test inquiry')
  await page.getByRole('button', { name: 'Send inquiry' }).click()
  await expect(page.getByRole('alert')).toContainText('could not be submitted')
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue(
    'Browser test',
  )
  await expect(
    page.getByRole('link', { name: 'Open email draft' }),
  ).toHaveAttribute('href', /^mailto:support@digitalnativesagcy\.com\?/)
})
