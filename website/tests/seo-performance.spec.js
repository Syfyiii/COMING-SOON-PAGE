import { test, expect } from '@playwright/test'
import { pages, siteOrigin } from '../src/routes.js'
import { writeFile } from 'node:fs/promises'

test('canonical pages contain meaningful HTML and working metadata without JavaScript', async ({
  browser,
  baseURL,
  request,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  })
  const page = await context.newPage()
  try {
    for (const definition of pages) {
      const response = await page.goto(definition.path)
      expect(response.status()).toBe(200)
      await expect(page).toHaveTitle(definition.title)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        siteOrigin + definition.path,
      )
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        siteOrigin + '/brand/dna-social.png',
      )
      expect((await page.locator('body').innerText()).length).toBeGreaterThan(
        200,
      )
      await expect(page.locator('h1:visible')).toHaveCount(1)
      expect(
        JSON.parse(
          await page
            .locator('script[type="application/ld+json"]')
            .textContent(),
        )['@type'],
      ).toBe('Organization')
    }
    expect((await request.get('/brand/dna-social.png')).status()).toBe(200)
    const sitemap = await (await request.get('/sitemap.xml')).text()
    for (const definition of pages)
      expect(sitemap).toContain(siteOrigin + definition.path)
    expect(await (await request.get('/robots.txt')).text()).toContain(
      'Sitemap:',
    )
  } finally {
    await context.close()
  }
})

for (const mobile of [false, true]) {
  test(`${mobile ? 'mobile' : 'desktop'} startup remains stable across three cold-cache samples`, async ({
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(90000)
    const samples = []
    for (let run = 0; run < 3; run++) {
      const context = await browser.newContext({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1440, height: 900 },
        isMobile: mobile,
        hasTouch: mobile,
        deviceScaleFactor: mobile ? 3 : 1,
      })
      try {
        const page = await context.newPage()
        const errors = []
        const menuPhotoRequests = []
        page.on('request', request => {
          if (new URL(request.url()).pathname === '/media/culture-crowd.webp')
            menuPhotoRequests.push(request.url())
        })
        page.on('pageerror', (error) => errors.push(error.message))
        const client = await context.newCDPSession(page)
        await client.send('Network.enable')
        await client.send('Network.setCacheDisabled', { cacheDisabled: true })
        if (mobile) {
          await client.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: 150,
            downloadThroughput: 200000,
            uploadThroughput: 93750,
          })
          await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
        }
        await page.addInitScript(() => {
          window.vitals = { lcp: 0, shifts: [], heroReadyMs: 0 }
          const heroReady = new MutationObserver(() => {
            if (document.querySelector('.hero-cutout[data-ready]')) {
              window.vitals.heroReadyMs = performance.now()
              heroReady.disconnect()
            }
          })
          heroReady.observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
          })
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              window.vitals.lcp = entry.startTime
          }).observe({ type: 'largest-contentful-paint', buffered: true })
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              if (!entry.hadRecentInput)
                window.vitals.shifts.push({
                  time: entry.startTime,
                  value: entry.value,
                })
          }).observe({ type: 'layout-shift', buffered: true })
        })
        await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(mobile ? 12000 : 4500)
        const metrics = await page.evaluate(() => {
          let cls = 0,
            sum = 0,
            first = 0,
            previous = 0
          for (const shift of window.vitals.shifts) {
            if (shift.time - previous >= 1000 || shift.time - first >= 5000) {
              first = shift.time
              sum = 0
            }
            sum += shift.value
            previous = shift.time
            cls = Math.max(cls, sum)
          }
          return {
            lcp: window.vitals.lcp,
            heroReadyMs: window.vitals.heroReadyMs,
            domContentLoadedMs: performance.getEntriesByType('navigation')[0]
              .domContentLoadedEventEnd,
            cls,
            shifts: window.vitals.shifts,
            video: document.querySelector('video')?.currentSrc,
          }
        })
        metrics.menuPhotoRequests = menuPhotoRequests.length
        samples.push(metrics)
        expect(errors).toEqual([])
        expect(metrics.cls).toBeLessThanOrEqual(0.1)
        expect(metrics.lcp).toBeGreaterThan(0)
        expect(metrics.lcp).toBeLessThanOrEqual(2500)
        expect(metrics.heroReadyMs).toBeGreaterThan(0)
        if (mobile) {
          expect(metrics.video).toContain('/media/hero-mobile.mp4')
          expect(metrics.menuPhotoRequests).toBe(0)
        }
      } finally {
        await context.close()
      }
    }
    await writeFile(
      testInfo.outputPath('performance.json'),
      JSON.stringify(samples, null, 2),
    )
    console.log(
      `${mobile ? 'Mobile' : 'Desktop'} lab samples: ${JSON.stringify(samples)}`,
    )
    if (mobile) {
      const medianStartup = samples
        .map(sample => sample.domContentLoadedMs)
        .sort((a, b) => a - b)[1]
      expect(medianStartup).toBeLessThanOrEqual(3200)
    }
  })
}
