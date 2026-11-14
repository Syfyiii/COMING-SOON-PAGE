import { test, expect } from '@playwright/test'
import { inquiryEndpoint } from '../src/inquiry-config.js'

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
