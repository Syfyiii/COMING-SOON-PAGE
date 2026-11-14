import { test, expect } from '@playwright/test'
import { inquiryEndpoint } from '../src/inquiry-config.js'

async function fillInquiry(page) {
  await page.addInitScript(() => {
    window.conversions = []
    window.addEventListener('dna:conversion', (event) =>
      window.conversions.push(event.detail),
    )
  })
  await page.goto('/services/ai-call-center/')
  await page.getByRole('button', { name: 'Discuss the call center' }).click()
  await page.getByLabel('Your name', { exact: true }).fill('Website test')
  await page.getByLabel('Work email', { exact: true }).fill('test@example.com')
  await page.getByLabel('Brand / business', { exact: true }).fill('Test brand')
  await page
    .getByLabel('What do you want to move forward?')
    .fill('Please discuss an AI call center.')
}

test('submits an inquiry to the fixed support endpoint and shows its receipt', async ({
  page,
}) => {
  let calls = 0
  await page.route(inquiryEndpoint, async (route) => {
    calls++
    const payload = route.request().postDataJSON()
    expect(payload.interest).toBe('DNA AI Call Center demo')
    expect(payload.email).toBe('test@example.com')
    expect(payload).not.toHaveProperty('to')
    expect(payload.requestId).toMatch(/^[0-9a-f-]{36}$/)
    await route.fulfill({
      json: { status: 'submitted', requestId: payload.requestId },
    })
  })
  await fillInquiry(page)
  await page.getByRole('button', { name: 'Send inquiry' }).click()
  await expect(page.getByRole('status')).toContainText(
    'Your inquiry has been submitted',
  )
  await expect(page.locator('.inquiry-reference')).toContainText('Reference:')
  await expect(page.getByRole('button', { name: 'Send inquiry' })).toHaveCount(
    0,
  )
  expect(calls).toBe(1)
  const events = await page.evaluate(() => window.conversions)
  expect(events.map((item) => item.event)).toEqual([
    'inquiry_opened',
    'inquiry_accepted',
  ])
  expect(JSON.stringify(events)).not.toContain('test@example.com')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download brief' }).click()
  expect((await download).suggestedFilename()).toBe('DNA-project-brief.txt')
})

test('a failed request preserves the draft and an uncertain response reuses its ID', async ({
  page,
}) => {
  const payloads = []
  await page.route(inquiryEndpoint, async (route) => {
    payloads.push(route.request().postDataJSON())
    if (payloads.length === 1) await route.abort('failed')
    else
      await route.fulfill({
        json: { status: 'submitted', requestId: payloads[0].requestId },
      })
  })
  await fillInquiry(page)
  await page.getByRole('button', { name: 'Send inquiry' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'connection was interrupted',
  )
  await expect(page.getByLabel('Brand / business')).toHaveValue('Test brand')
  await expect(
    page.getByRole('link', { name: 'Open email draft' }),
  ).toHaveAttribute('href', /^mailto:support@digitalnativesagcy\.com\?/)
  await page.getByRole('button', { name: 'Check submission status' }).click()
  await expect(page.getByRole('status')).toContainText('submitted')
  expect(payloads[1]).toEqual(payloads[0])
})

test('rate limits and provider rejection never show success', async ({
  page,
}) => {
  await page.route(inquiryEndpoint, (route) =>
    route.fulfill({
      status: 429,
      json: { status: 'rate_limited', error: 'Wait' },
    }),
  )
  await fillInquiry(page)
  await page.getByRole('button', { name: 'Send inquiry' }).click()
  await expect(page.getByRole('alert')).toContainText('Please wait')
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue(
    'Website test',
  )
})

test('an unavailable status check cannot unlock an unresolved submission', async ({
  page,
}) => {
  const payloads = []
  await page.route(inquiryEndpoint, async (route) => {
    payloads.push(route.request().postDataJSON())
    if (payloads.length === 1) await route.abort('failed')
    else if (payloads.length === 2)
      await route.fulfill({
        status: 503,
        json: { status: 'unavailable', error: 'Offline' },
      })
    else
      await route.fulfill({
        json: { status: 'submitted', requestId: payloads[0].requestId },
      })
  })
  await fillInquiry(page)
  await page.getByRole('button', { name: 'Send inquiry' }).click()
  await page.getByRole('button', { name: 'Check submission status' }).click()
  await expect(page.getByLabel('Your name', { exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Check submission status' }).click()
  await expect(page.getByRole('status')).toContainText('submitted')
  expect(payloads[1]).toEqual(payloads[0])
  expect(payloads[2]).toEqual(payloads[0])
})

test('validation explains what to correct and confirmed failure permits a deliberate new attempt', async ({
  page,
}) => {
  const ids = []
  await page.route(inquiryEndpoint, async (route) => {
    ids.push(route.request().postDataJSON().requestId)
    if (ids.length === 1)
      await route.fulfill({
        status: 400,
        json: {
          status: 'rejected',
          error:
            'name must be nonempty and contain no invalid control characters.',
        },
      })
    else if (ids.length === 2)
      await route.fulfill({
        status: 502,
        json: { status: 'failed', error: 'Provider rejected the message.' },
      })
    else
      await route.fulfill({ json: { status: 'submitted', requestId: ids[2] } })
  })
  await fillInquiry(page)
  await page.getByLabel('Your name', { exact: true }).fill('   ')
  await page.getByRole('button', { name: 'Send inquiry' }).click()
  await expect(page.getByRole('alert')).toContainText('name must be nonempty')
  await page.getByLabel('Your name', { exact: true }).fill('Corrected name')
  await page.getByRole('button', { name: 'Send inquiry' }).click()
  await expect(page.getByRole('alert')).toContainText('could not be submitted')
  await page.getByRole('button', { name: 'Send inquiry' }).click()
  await expect(page.getByRole('status')).toContainText('submitted')
  expect(ids[2]).not.toBe(ids[1])
})
