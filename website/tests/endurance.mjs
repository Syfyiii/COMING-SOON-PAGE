// Local interaction stress only: never submits a lead or loads the email provider.
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const baseURL = process.env.DNA_PREVIEW_URL || 'http://127.0.0.1:5180'
assert(['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname))
const browser = await chromium.launch()
try {
  const context = await browser.newContext({ baseURL, reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  const client = await context.newCDPSession(page)
  async function memory() {
    await client.send('HeapProfiler.collectGarbage')
    return { ...await client.send('Memory.getDOMCounters'), ...await client.send('Runtime.getHeapUsage') }
  }
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  const labels = ['About Us', 'Staff & Influencers', 'Past Work', 'Services']
  async function chapterCycle(i) {
    await nav.getByRole('link', { name: labels[i % 4], exact: true }).click()
    await page.locator('.chapter-dialog').waitFor()
    await page.keyboard.press('Escape')
    await page.locator('.chapter-dialog').waitFor({ state: 'detached' })
    assert.equal(await page.locator('dialog[open]').count(), 0)
  }
  for (let i = 0; i < 12; i++) await chapterCycle(i)
  const before = await memory()
  for (let i = 0; i < 100; i++) await chapterCycle(i)
  const after = await memory()
  await page.goto('/services/ai-call-center/')
  for (let i = 0; i < 25; i++) {
    await page.getByRole('button', { name: 'Discuss the call center' }).click()
    await page.locator('.project-dialog').waitFor()
    await page.keyboard.press('Escape')
    await page.locator('.project-dialog').waitFor({ state: 'hidden' })
    assert(await page.locator('.chapter-dialog').isVisible())
  }
  for (let i = 0; i < 100; i++) {
    await page.getByRole('tab', { name: ['One-time services', 'AI integrations', 'Growth packages'][i % 3], exact: true }).click()
  }
  await page.keyboard.press('Escape')
  await page.locator('.chapter-dialog').waitFor({ state: 'detached' })
  assert(!(await page.locator('html').getAttribute('class') || '').includes('lenis-stopped'))
  assert.deepEqual(errors, [])
  await mkdir('test-results', { recursive: true })
  const result = { timestamp: new Date().toISOString(), baseURL, chapterCycles: 100, nestedDialogCycles: 25, tabSwitches: 100, errors, before, after, passed: true }
  await writeFile('test-results/endurance.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally {
  await browser.close()
}
