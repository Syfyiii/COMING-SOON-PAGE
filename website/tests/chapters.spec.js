import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('site and policy contact links use the current support details', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const route of [
    '/',
    '/#/about',
    '/#/people',
    '/#/work',
    '/#/services',
    '/#/privacy',
    '/#/terms',
    '/#/sms',
    '/privacy.html',
    '/terms.html',
    '/opt-in-evidence.html',
  ]) {
    await page.goto(route)
    if (route.includes('#/')) await expect(page.locator('.chapter-dialog')).toBeVisible()
    const emails = page.locator('a[href^="mailto:"]')
    await expect(emails.first()).toHaveAttribute(
      'href',
      'mailto:support@digitalnativesagcy.com',
    )
    for (const email of await emails.all()) {
      await expect(email).toHaveAttribute(
        'href',
        'mailto:support@digitalnativesagcy.com',
      )
      await expect(email).toContainText('support@digitalnativesagcy.com')
    }
    const phones = page.locator('a[href^="tel:"]')
    for (const phone of await phones.all()) {
      await expect(phone).toHaveAttribute('href', 'tel:+16468205059')
      await expect(phone).toHaveText('(646) 820-5059')
    }
    if (
      route.includes('#/') ||
      route === '/privacy.html' ||
      route === '/terms.html'
    )
      await expect(phones.first()).toBeAttached()
  }
})

test('the four menu destinations have distinct panels and preserve home scroll', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#approach')
  await expect(page.locator('#approach-title')).toBeInViewport()
  const before = await page.evaluate(() => scrollY)
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  for (const [label, heading] of [
    ['About Us', 'Culture is our starting point.'],
    ['Staff & Influencers', 'Different perspectives. Shared ambition.'],
    ['Past Work', 'See the connection.'],
    ['Services', 'The right next move.'],
  ]) {
    const trigger = nav.getByRole('link', { name: label, exact: true })
    await trigger.click()
    await expect(page.locator('#chapter-title')).toHaveText(heading)
    await expect(page.locator('.chapter-dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.chapter-dialog')).toHaveCount(0)
    await expect(trigger).toBeFocused()
    expect(await page.evaluate(() => scrollY)).toBe(before)
  }
  await expect(page.locator('main #packages')).toHaveCount(0)
})

test('AI tab shows call center and leads to its services and sourced SMS flow', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#services')
  await page.getByRole('button', { name: 'All services & pricing' }).click()
  await page.getByRole('tab', { name: 'AI integrations', exact: true }).click()
  await expect(page.locator('.chapter-dialog')).toContainText(
    'DNA AI Call Center',
  )
  await expect(page.locator('.chapter-dialog')).toContainText(
    'Appointment confirmations, reminders and rescheduling texts',
  )
  await page.getByRole('button', { name: 'Discuss the call center' }).click()
  await expect(page.locator('.project-dialog')).toContainText(
    'DNA AI Call Center demo',
  )
  await expect(page.locator('.project-dialog')).toContainText(
    'It does not enroll you in text messages',
  )
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'SMS consent & policies' }).click()
  await expect(page.locator('#chapter-title')).toHaveText(
    'SMS Opt-In Consent Documentation',
  )
  await expect(page.locator('.chapter-dialog')).toContainText(
    'explicit verbal permission',
  )
  await expect(page.locator('.chapter-dialog')).toContainText('STOP')
  await page.goBack()
  await expect(page.locator('.chapter-dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/#services$/)
  await page.goForward()
  await expect(page.locator('#chapter-title')).toContainText('SMS')
})

test('past work uses the requested four categories with keyboard and gallery navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/work')
  const list = page.getByRole('tablist', { name: 'Work categories' })
  await expect(list.getByRole('tab')).toHaveText([
    'Production',
    'Media & Marketing',
    'Consulting',
    'Influencers',
  ])
  await list
    .getByRole('tab', { name: 'Production', exact: true })
    .press('ArrowRight')
  await expect(
    list.getByRole('tab', { name: 'Media & Marketing' }),
  ).toBeFocused()
  await expect(page.locator('.portfolio-caption').first()).toContainText(
    'Community in focus.',
  )
  const trigger = page.getByRole('button', {
    name: 'View media & marketing: Culture, at street level.',
  })
  await trigger.click()
  await expect(page.locator('.media-dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await list.getByRole('tab', { name: 'Consulting', exact: true }).click()
  await expect(page.locator('.portfolio-note')).toContainText(
    'No published case studies',
  )
  await list.getByRole('tab', { name: 'Influencers', exact: true }).click()
  await expect(page.locator('.portfolio-note')).toContainText('creator brief')
})

test('wheel scrolling works inside chapters and nested project windows without moving the page', async ({
  page,
}) => {
  await page.goto('/#services')
  await page.getByRole('button', { name: 'All services & pricing' }).click()
  await page.evaluate(() => document.fonts.ready)
  const homeY = await page.evaluate(() => scrollY)
  const scroller = page.locator('.chapter-scroll')
  await scroller.hover()
  await page.mouse.wheel(0, 850)
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(100)
  expect(await page.evaluate(() => scrollY)).toBe(homeY)
  await page.getByRole('button', { name: 'Talk about websites & apps' }).click()
  await page.setViewportSize({ width: 900, height: 450 })
  const dialog = page.locator('.project-dialog')
  await dialog.hover()
  await page.mouse.wheel(0, 900)
  await expect
    .poll(() => dialog.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(100)
  await expect(
    dialog.getByRole('button', { name: 'Send inquiry' }),
  ).toBeInViewport()
  await page.getByRole('button', { name: 'Close project brief' }).click()
  await expect(page.locator('.chapter-dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.chapter-dialog')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveClass(/lenis-stopped/)
  const restored = await page.evaluate(() => scrollY)
  await page.mouse.move(400, 220)
  await page.mouse.wheel(0, 400)
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(restored + 100)
})

test('all chapters and policy panels fit small and large screens and pass accessibility checks', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 })
    for (const route of [
      'about',
      'people',
      'work',
      'services/ai',
      'services/plans',
      'privacy',
      'terms',
      'sms',
    ]) {
      await page.goto(`/#/${route}`)
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('.chapter-dialog')).toBeVisible()
      const clipped = await page
        .locator(
          '.chapter-dialog h2, .chapter-dialog h3, .chapter-dialog h4, .chapter-dialog button, .chapter-dialog p, .chapter-dialog td',
        )
        .evaluateAll((elements) =>
          elements
            .filter((element) => {
              if (!element.checkVisibility()) return false
              const box = element.getBoundingClientRect()
              return (
                box.left < -1 ||
                box.right > innerWidth + 1 ||
                element.scrollWidth > element.clientWidth + 1
              )
            })
            .map((element) => element.textContent),
        )
      expect(clipped, `${route} at ${width}`).toEqual([])
      if (width === 390 || width === 1440) {
        expect(
          (await new AxeBuilder({ page }).analyze()).violations,
          route,
        ).toEqual([])
        await page.screenshot({
          path: testInfo.outputPath(`${width}-${route.replace('/', '-')}.png`),
        })
      }
      const scroll = page.locator('.chapter-scroll')
      await scroll.evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
      await expect(page.locator('.chapter-footer')).toBeInViewport()
      await expect(
        page.getByRole('button', { name: 'Close chapter' }),
      ).toBeInViewport()
    }
  }
  expect(errors).toEqual([])
})

test('touch gestures scroll a mobile chapter and leave the homepage locked', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  try {
    await page.goto('/#/services/plans')
    await expect(page.locator('.chapter-dialog')).toBeVisible()
    await expect(page.locator('.chapter-dialog')).toHaveCSS('transform', 'none')
    await page.evaluate(() => document.fonts.ready)
    const before = await page.evaluate(() => scrollY)
    const client = await context.newCDPSession(page)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 190, y: 740 }],
    })
    for (let y = 700; y >= 280; y -= 35) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 190, y }],
      })
      // Give the swipe human-scale velocity instead of an instantaneous fling.
      await page.waitForTimeout(20)
    }
    // Stop the finger before release so the next tap is not consumed to cancel momentum.
    await page.waitForTimeout(150)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 190, y: 280 }],
    })
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await expect
      .poll(() =>
        page
          .locator('.chapter-scroll')
          .evaluate((element) => element.scrollTop),
      )
      .toBeGreaterThan(100)
    expect(await page.evaluate(() => scrollY)).toBe(before)
    await page.getByRole('button', { name: 'Close chapter' }).tap()
    await expect(page.locator('.chapter-dialog')).toHaveCount(0)
  } finally {
    await context.close()
  }
})

test('published policy URLs retain source dates, legal entity, contact and SMS disclosures', async ({
  page,
}) => {
  for (const [file, title, date] of [
    ['privacy.html', 'Privacy Policy', 'August 7, 2026'],
    ['terms.html', 'Terms & Conditions', 'August 7, 2026'],
    [
      'opt-in-evidence.html',
      'SMS Opt-In Consent Documentation',
      'August 10, 2026',
    ],
  ]) {
    const response = await page.goto(`/${file}`)
    expect(response.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    await expect(page.locator('main')).toContainText(date)
    await expect(page.locator('main')).toContainText('DNAgency LLC')
    await expect(page.locator('main')).toContainText(
      'support@digitalnativesagcy.com',
    )
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }
  await expect(page.locator('main')).toContainText('timestamped transcript')
  await expect(page.locator('main')).toContainText(
    'Message and data rates may apply',
  )
  await expect(page.locator('main')).toContainText('STOP')
  await expect(page.locator('main')).toContainText('HELP')
})
